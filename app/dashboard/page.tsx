'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSuper, isAdministrative, scopeUnityId, canWriteRecemNascidos } from '@/lib/permissions';
import { newbornService, ChildRecord } from '@/app/services/recem-nascidos';
import { professionalsService, ProfessionalRecord } from '@/app/services/profissionais';
import { unityService, UnityRecord } from '@/app/services/unidades';
import { individualsService } from '@/app/services/individuos';
import { locationsService } from '@/app/services/locations';

const roleLabel: Record<string, string> = {
  ADMINISTRATIVE: 'Supervisor Local',
  TECHNICAL: 'Técnico de Registo',
  ADMINISTRATIVE_SUPER: 'Super Admin',
};

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek() {
  const today = startOfToday();
  const diasDesdeSegunda = (today.getDay() + 6) % 7; // 0 = segunda-feira
  const d = new Date(today);
  d.setDate(today.getDate() - diasDesdeSegunda);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function countSince(children: ChildRecord[], since: Date) {
  return children.filter(c => {
    const created = c.individual?.createdAt;
    return created && new Date(created) >= since;
  }).length;
}

function groupCount<T>(items: T[], keyFn: (item: T) => string | undefined | null): [string, number][] {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item) || 'N/D';
    out[key] = (out[key] || 0) + 1;
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

interface DashboardStats {
  nascimentos: { hoje: number; semana: number; mes: number; total: number };
  pendentesDNV: number;
  // Administrador + Super
  profissionaisPorPapel?: [string, number][];
  nascimentosPorGenero?: [string, number][];
  nascimentosPorLocal?: [string, number][];
  rankingTecnicos?: [string, number][];
  minhaUnidade?: UnityRecord | null;
  // Super
  nacional?: {
    provincias: number;
    municipios: number;
    bairros: number;
    unidades: number;
    profissionais: number;
    cidadaos: number;
  };
  unidadesMaisActivas?: [string, number][];
  vivosVsFalecidos?: [string, number][];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const role = user?.roleProfessional;
  const scopedUnityId = scopeUnityId(role, user?.unityId);

  useEffect(() => {
    if (!user) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOffline(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const newbornsRes = scopedUnityId != null
          ? await newbornService.getChildrenByUnity(scopedUnityId)
          : await newbornService.getAllNewborns();
        const newborns: ChildRecord[] = newbornsRes.success ? newbornsRes.data : [];

        const nascimentos = {
          hoje: countSince(newborns, startOfToday()),
          semana: countSince(newborns, startOfWeek()),
          mes: countSince(newborns, startOfMonth()),
          total: newborns.length,
        };
        const pendentesDNV = newborns.filter(c => !c.individual?.identificationDocument?.identificationNumber).length;

        const computed: DashboardStats = { nascimentos, pendentesDNV };

        if (isAdministrative(role) || isSuper(role)) {
          const [profissionaisRes, unidadeRes] = await Promise.all([
            professionalsService.getAllProfessionals(),
            user?.unityId ? unityService.getUnityById(user.unityId) : Promise.resolve(null),
          ]);
          const profissionais: ProfessionalRecord[] = profissionaisRes.success
            ? (scopedUnityId != null ? profissionaisRes.data.filter(p => p.unity?.id === scopedUnityId) : profissionaisRes.data)
            : [];

          computed.profissionaisPorPapel = groupCount(profissionais, p => roleLabel[p.roleProfessional] ?? p.roleProfessional);
          computed.nascimentosPorGenero = groupCount(newborns, c => c.individual?.gender === 'MALE' ? 'Masculino' : 'Feminino');
          computed.nascimentosPorLocal = groupCount(newborns, c => ({ HOSPITAL: 'Hospital', HOME: 'Domicílio', OTHER: 'Outro' }[c.placeOfBirth] ?? c.placeOfBirth));
          computed.minhaUnidade = unidadeRes?.success ? unidadeRes.data : null;

          const trintaDias = new Date();
          trintaDias.setDate(trintaDias.getDate() - 30);
          const recentes = newborns.filter(c => c.individual?.createdAt && new Date(c.individual.createdAt) >= trintaDias);
          computed.rankingTecnicos = groupCount(recentes, c => c.individual?.creator?.name).slice(0, 5);
        }

        if (isSuper(role)) {
          const [provincesRes, bairrosRes, unidadesRes, individuaisRes] = await Promise.all([
            locationsService.getAllProvinces(),
            locationsService.getAllBairros(),
            unityService.getAllUnities(),
            individualsService.getAllIndividuals(),
          ]);
          const provincias = provincesRes.success ? provincesRes.data : [];
          const municipiosPorProvincia = await Promise.all(
            provincias.map(p => p.id ? locationsService.getMunicipalitiesByProvince(p.id).catch(() => null) : Promise.resolve(null))
          );
          const totalMunicipios = municipiosPorProvincia.reduce(
            (acc, res) => acc + (res?.success ? res.data.municipalities.length : 0), 0
          );

          computed.nacional = {
            provincias: provincias.length,
            municipios: totalMunicipios,
            bairros: bairrosRes.success ? bairrosRes.data.length : 0,
            unidades: unidadesRes.success ? unidadesRes.data.length : 0,
            profissionais: computed.profissionaisPorPapel?.reduce((a, [, n]) => a + n, 0) ?? 0,
            cidadaos: individuaisRes.success ? individuaisRes.data.length : 0,
          };

          computed.unidadesMaisActivas = groupCount(newborns, c => c.unity?.name).slice(0, 5);
          computed.vivosVsFalecidos = groupCount(newborns, c => c.vitalStatus === 'ALIVE' ? 'Vivos' : 'Falecidos');
        }

        if (!cancelled) setStats(computed);
      } catch (err) {
        console.error('Erro ao carregar estatísticas do painel:', err);
        if (!cancelled) setErrorMsg('Não foi possível carregar as estatísticas. Tente novamente.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, role, scopedUnityId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Boas-vindas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-800">
          Olá, {user?.fullName}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Bem-vindo ao sistema de Registo Civil.
        </p>
      </div>

      {offline ? (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm rounded-lg font-semibold">
          Sem ligação à internet. As estatísticas em tempo real ficam disponíveis assim que a ligação for restabelecida.
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm rounded-lg font-semibold">{errorMsg}</div>
      ) : loading ? (
        <div className="p-12 text-center text-slate-400 text-sm animate-pulse">A carregar estatísticas do sistema...</div>
      ) : stats && (
        <>
          {/* NASCIMENTOS REGISTADOS */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Registados Hoje" value={stats.nascimentos.hoje} />
            <StatCard label="Esta Semana" value={stats.nascimentos.semana} />
            <StatCard label="Este Mês" value={stats.nascimentos.mes} />
            <StatCard label="Total de Registos" value={stats.nascimentos.total} accent="blue" />
          </div>

          {/* ADMINISTRADOR / SUPER: profissionais e composição dos nascimentos */}
          {stats.profissionaisPorPapel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BreakdownCard title="Profissionais por Papel" data={stats.profissionaisPorPapel} />
              <BreakdownCard title="Nascimentos por Género" data={stats.nascimentosPorGenero ?? []} />
              <BreakdownCard title="Nascimentos por Local" data={stats.nascimentosPorLocal ?? []} />
            </div>
          )}

          {stats.rankingTecnicos && stats.rankingTecnicos.length > 0 && (
            <BreakdownCard title="Registos por Técnico (últimos 30 dias)" data={stats.rankingTecnicos} />
          )}

          {/* SUPER: visão nacional */}
          {stats.nacional && (
            <div className="space-y-4">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider">Visão Nacional</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Províncias" value={stats.nacional.provincias} compact />
                <StatCard label="Municípios" value={stats.nacional.municipios} compact />
                <StatCard label="Bairros" value={stats.nacional.bairros} compact />
                <StatCard label="Unidades" value={stats.nacional.unidades} compact />
                <StatCard label="Profissionais" value={stats.nacional.profissionais} compact />
                <StatCard label="Cidadãos" value={stats.nacional.cidadaos} compact />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BreakdownCard title="Unidades Mais Activas" data={stats.unidadesMaisActivas ?? []} />
                <BreakdownCard title="Vivos vs Falecidos" data={stats.vivosVsFalecidos ?? []} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Atalhos Rápidos de Operação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {canWriteRecemNascidos(role) && (
          <a
            href="/dashboard/recem-nascidos/create"
            className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex flex-col justify-between group"
          >
            <div>
              <h3 className="font-bold text-blue-900 group-hover:text-blue-700 text-lg">Efectuar Novo Registo</h3>
              <p className="text-blue-700/70 text-sm mt-1">Abra o formulário passo a passo para registar um recém-nascido na maternidade.</p>
            </div>
            <span className="text-blue-600 font-bold text-sm mt-4 inline-block">Iniciar Fluxo ➔</span>
          </a>
        )}

        <a
          href="/dashboard/recem-nascidos"
          className="p-6 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors flex flex-col justify-between group"
        >
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Consultar Histórico / Reimprimir</h3>
            <p className="text-slate-500 text-sm mt-1">Pesquise assentos de nascimento e emita segundas vias do PDF.</p>
          </div>
          <span className="text-slate-700 font-bold text-sm mt-4 inline-block">Abrir Listagem ➔</span>
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, compact }: { label: string; value: number; accent?: 'blue' | 'amber'; compact?: boolean }) {
  const accentClass = accent === 'blue' ? 'border-l-4 border-l-blue-500' : accent === 'amber' ? 'border-l-4 border-l-amber-500' : '';
  const valueClass = accent === 'blue' ? 'text-blue-600' : accent === 'amber' ? 'text-amber-600' : 'text-slate-800';
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${accentClass} ${compact ? 'p-4' : 'p-5'}`}>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`font-black mt-2 ${valueClass} ${compact ? 'text-2xl' : 'text-3xl'}`}>{value}</div>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: [string, number][] }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</div>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Sem dados.</p>
      ) : (
        <div className="space-y-2">
          {data.map(([label, count]) => (
            <div key={label} className="flex justify-between items-center text-sm">
              <span className="text-slate-600">{label}</span>
              <span className="font-bold text-slate-800">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
