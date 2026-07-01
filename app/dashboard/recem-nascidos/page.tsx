'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateAssentoPDF } from '@/utils/pdfGenerator';
import { logAction } from '@/utils/audit';
import { newbornService, UpdateChildDto } from '@/app/services/recem-nascidos';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';
import { unityService, UnityRecord } from '@/app/services/unidades';

// ─── Modal: Ver Detalhes ──────────────────────────────────────────────────────
function ChildDetailModal({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  const id: string = record.id || record.code || 'N/D';
  const nomeCrianca = record.nomeCrianca || record.individual?.fullName || '—';
  const sexo = record.individual?.gender === 'MALE' ? 'Masculino' : 'Feminino';
  const dataNasc = record.individual?.birthDate?.split('T')[0] || '—';
  const horaNasc = record.individual?.birthDate?.split('T')[1]?.substring(0, 5) || '00:00';
  const docTipo = record.individual?.identificationDocument?.typeDocument || '—';
  const docNum = record.individual?.identificationDocument?.identificationNumber || '—';
  const nomeMae = record.mother?.individual?.fullName || '—';
  const docMae = record.mother?.individual?.identificationDocument?.identificationNumber || '—';
  const nomePai = record.father?.individual?.fullName || null;
  const docPai = record.father?.individual?.identificationDocument?.identificationNumber || '—';
  const witnesses: any[] = record.witness || [];
  const local = record.placeOfBirth || '—';
  const localLabel: Record<string, string> = { HOSPITAL: 'Hospital', HOME: 'Domicílio', OTHER: 'Outro' };
  const vivo = record.vitalStatus === 'ALIVE' || !record.vitalStatus;
  const gestacao = record.gestacionalAge ? `${record.gestacionalAge.weeks}s ${record.gestacionalAge.days}d` : '—';
  const unidade = record.unity?.name || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assento de Nascimento</p>
            <h2 className="text-xl font-black text-slate-800">{nomeCrianca}</h2>
            <p className="text-[10px] font-mono text-slate-400 mt-1">{id}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${vivo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {vivo ? 'Vivo' : 'Falecido'}
            </span>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">×</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <ModalSection title="Dados da Criança">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Género" value={sexo} />
              <ModalField label="Data de Nascimento" value={`${dataNasc}  ${horaNasc}`} />
              <ModalField label="Tipo / Nº Doc." value={`${docTipo} · ${docNum}`} />
              <ModalField label="Local de Nascimento" value={localLabel[local] ?? local} />
              <ModalField label="Peso" value={record.weight ? `${record.weight} kg` : '—'} />
              <ModalField label="Altura" value={record.height ? `${record.height} cm` : '—'} />
              <ModalField label="Idade Gestacional" value={gestacao} />
              <ModalField label="Apoio Profissional" value={record.professionalSupport ? 'Sim' : 'Não'} />
              <ModalField label="Unidade Hospitalar" value={unidade} className="col-span-2" />
            </div>
          </ModalSection>
          <ModalSection title="Dados da Mãe">
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Nome Completo" value={nomeMae} className="col-span-2" />
              <ModalField label="Nº do Documento" value={docMae} />
            </div>
          </ModalSection>
          <ModalSection title="Dados do Pai">
            {nomePai ? (
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Nome Completo" value={nomePai} className="col-span-2" />
                <ModalField label="Nº do Documento" value={docPai} />
              </div>
            ) : <p className="text-xs text-slate-400 italic">Não declarado neste assento.</p>}
          </ModalSection>
          {witnesses.length > 0 && (
            <ModalSection title={`Testemunhas (${witnesses.length})`}>
              <div className="space-y-2">
                {witnesses.map((w: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs border-b border-slate-100 pb-2 last:border-0">
                    <span className="text-slate-400 font-medium">Testemunha {i + 1}</span>
                    <span className="text-slate-800 font-semibold">{w.individual?.fullName || '—'}</span>
                  </div>
                ))}
              </div>
            </ModalSection>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Fechar</button>
          <button onClick={onEdit}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Editar Registo</button>
          <button
            onClick={async () => {
              await logAction('Reimpressão de PDF', `Segunda via para ID: ${id}`);
              generateAssentoPDF({ id, nomeCrianca, dataNascimento: dataNasc, horaNascimento: horaNasc,
                sexo: record.individual?.gender === 'MALE' ? 'M' : 'F',
                nomeMae, nomePai: nomePai || 'Não Declarado', naturalDe: local, municipio: '', provincia: '' });
            }}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-sm">Imprimir</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Editar ────────────────────────────────────────────────────────────
interface EditForm {
  fullName: string; gender: 'MALE' | 'FEMALE'; identificationNumber: string; birthDate: string;
  height: string; weight: string; vitalStatus: 'ALIVE' | 'DECEASED'; deathDate: string;
  gestWeeks: string; gestDays: string; placeOfBirth: 'HOSPITAL' | 'HOME' | 'OTHER';
  professionalSupport: boolean; provinceId: string; municipalityId: string; neighborhoodName: string;
}

function EditChildModal({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    fullName: record.individual?.fullName || '',
    gender: record.individual?.gender || 'MALE',
    identificationNumber: record.individual?.identificationDocument?.identificationNumber || '',
    birthDate: record.individual?.birthDate?.split('T')[0] || '',
    height: String(record.height || ''),
    weight: String(record.weight || ''),
    vitalStatus: record.vitalStatus || 'ALIVE',
    deathDate: record.deathDate?.split('T')[0] || '',
    gestWeeks: String(record.gestacionalAge?.weeks || ''),
    gestDays: String(record.gestacionalAge?.days ?? 0),
    placeOfBirth: record.placeOfBirth || 'HOSPITAL',
    professionalSupport: record.professionalSupport ?? true,
    provinceId: String(record.individual?.neighborhood?.municipality?.province?.id || ''),
    municipalityId: String(record.individual?.neighborhood?.municipality?.id || ''),
    neighborhoodName: record.individual?.neighborhood?.name || '',
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    locationsService.getAllProvinces().then(res => {
      if (res.success) { const d = res.data as any; setProvinces(Array.isArray(d) ? d : (d?.provinces || [])); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    if (!form.provinceId) return;
    setLoadingMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(form.provinceId))
      .then(res => { if (res.success) { const d = res.data as any; setMunicipalities(Array.isArray(d) ? d : (d?.municipalities || [])); } })
      .catch(() => {}).finally(() => setLoadingMunis(false));
  }, [form.provinceId]);

  useEffect(() => {
    setNeighborhoods([]);
    if (!form.municipalityId) return;
    setLoadingNeighborhoods(true);
    locationsService.getBairrosByMunicipality(Number(form.municipalityId))
      .then(res => { if (res.success) { const d = res.data as any; setNeighborhoods(Array.isArray(d) ? d : (d?.neighborhoods || [])); } })
      .catch(() => {}).finally(() => setLoadingNeighborhoods(false));
  }, [form.municipalityId]);

  const patch = (p: Partial<EditForm>) => setForm(f => ({ ...f, ...p }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof EditForm, string>> = {};
    if (form.fullName.trim().split(' ').length < 2) e.fullName = 'Nome completo obrigatório.';
    if (!form.birthDate) e.birthDate = 'Data de nascimento obrigatória.';
    if (!form.height || Number(form.height) <= 0) e.height = 'Altura inválida.';
    if (!form.weight || Number(form.weight) <= 0) e.weight = 'Peso inválido.';
    if (!form.gestWeeks) e.gestWeeks = 'Semanas gestacionais obrigatórias.';
    if (!form.municipalityId) e.municipalityId = 'Município obrigatório.';
    if (!form.neighborhoodName.trim()) e.neighborhoodName = 'Bairro obrigatório.';
    if (form.vitalStatus === 'DECEASED' && !form.deathDate) e.deathDate = 'Data de óbito obrigatória.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    try {
      const payload: UpdateChildDto = {
        id: record.id,
        individual: { fullName: form.fullName.trim(), gender: form.gender, birthDate: form.birthDate },
        height: Number(form.height), weight: Number(form.weight),
        vitalStatus: form.vitalStatus,
        deathDate: form.vitalStatus === 'DECEASED' ? form.deathDate : undefined,
        gestacionalAge: { weeks: Number(form.gestWeeks), days: Number(form.gestDays || 0) },
        placeOfBirth: form.placeOfBirth,
        professionalSupport: form.professionalSupport,
        municipalityId: Number(form.municipalityId),
        neighborhoodName: form.neighborhoodName.trim(),
      };
      const res = await newbornService.updateChild(payload);
      if (res.success) { onSaved(); onClose(); }
      else setServerError(res.message || 'Erro ao actualizar o registo.');
    } catch (err: any) {
      const data = err.response?.data;
      const detail = (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) || data?.error || err.message || 'Erro desconhecido';
      setServerError(`Erro ${err.response?.status ?? ''}: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Editar Registo</h2>
          <button onClick={onClose} disabled={saving}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">×</button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
          {serverError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{serverError}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo *</label>
              <input type="text" value={form.fullName} onChange={e => patch({ fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Género *</label>
              <select value={form.gender} onChange={e => patch({ gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nº DNV</label>
              <input type="text" value={form.identificationNumber} readOnly
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-mono text-slate-400 cursor-not-allowed" />
              <p className="text-[10px] text-slate-400">O nº do DNV não pode ser alterado após o registo.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Nascimento *</label>
              <input type="date" value={form.birthDate} onChange={e => patch({ birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.birthDate && <p className="text-xs text-rose-600">{errors.birthDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Vital *</label>
              <select value={form.vitalStatus} onChange={e => patch({ vitalStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="ALIVE">Vivo</option>
                <option value="DECEASED">Falecido</option>
              </select>
            </div>

            {form.vitalStatus === 'DECEASED' && (
              <div className="space-y-1 col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Óbito *</label>
                <input type="date" value={form.deathDate} onChange={e => patch({ deathDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                {errors.deathDate && <p className="text-xs text-rose-600">{errors.deathDate}</p>}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Altura (cm) *</label>
              <input type="number" min="1" step="0.1" value={form.height} onChange={e => patch({ height: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.height && <p className="text-xs text-rose-600">{errors.height}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peso (kg) *</label>
              <input type="number" min="0.1" step="0.01" value={form.weight} onChange={e => patch({ weight: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.weight && <p className="text-xs text-rose-600">{errors.weight}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semanas Gestacionais *</label>
              <input type="number" min="20" max="45" value={form.gestWeeks} onChange={e => patch({ gestWeeks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.gestWeeks && <p className="text-xs text-rose-600">{errors.gestWeeks}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dias Adicionais</label>
              <input type="number" min="0" max="6" value={form.gestDays} onChange={e => patch({ gestDays: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Local de Nascimento *</label>
              <select value={form.placeOfBirth} onChange={e => patch({ placeOfBirth: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="HOSPITAL">Hospital</option>
                <option value="HOME">Domicílio</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div className="space-y-1 flex items-end">
              <div className="flex items-center gap-3 w-full">
                <button type="button" onClick={() => patch({ professionalSupport: !form.professionalSupport })}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.professionalSupport ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.professionalSupport ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-slate-600">Apoio Profissional</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Província</label>
              <select value={form.provinceId}
                onChange={e => patch({ provinceId: e.target.value, municipalityId: '', neighborhoodName: '' })}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">-- Escolha --</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Município *</label>
              <select value={form.municipalityId} disabled={!form.provinceId || loadingMunis}
                onChange={e => patch({ municipalityId: e.target.value, neighborhoodName: '' })}
                className="w-full px-3 py-2 border border-slate-300 bg-white disabled:bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">{loadingMunis ? 'A carregar...' : '-- Escolha --'}</option>
                {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {errors.municipalityId && <p className="text-xs text-rose-600">{errors.municipalityId}</p>}
            </div>

            <div className="space-y-1 col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bairro *</label>
              {form.municipalityId && !loadingNeighborhoods && neighborhoods.length > 0 ? (
                <select value={form.neighborhoodName} onChange={e => patch({ neighborhoodName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">-- Escolha --</option>
                  {neighborhoods.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                </select>
              ) : (
                <input type="text" value={form.neighborhoodName} onChange={e => patch({ neighborhoodName: e.target.value })}
                  disabled={loadingNeighborhoods}
                  placeholder={loadingNeighborhoods ? 'A carregar...' : 'Ex: Palanca'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50" />
              )}
              {errors.neighborhoodName && <p className="text-xs text-rose-600">{errors.neighborhoodName}</p>}
            </div>
          </div>
        </form>
        <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors">
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers de modal ─────────────────────────────────────────────────────────
function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{title}</p>
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">{children}</div>
    </div>
  );
}

function ModalField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RecemNascidosPage() {
  const router = useRouter();

  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pesquisa por DNV
  const [dnvSearch, setDnvSearch] = useState('');
  const [dnvSearching, setDnvSearching] = useState(false);
  const [dnvResult, setDnvResult] = useState<any | null>(null);
  const [dnvError, setDnvError] = useState('');

  // Filtro por unidade
  const [unities, setUnities] = useState<UnityRecord[]>([]);
  const [filterUnityId, setFilterUnityId] = useState('');
  const [loadingFilter, setLoadingFilter] = useState(false);

  // Modais
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const localRecords = useLiveQuery(() => db.records.orderBy('createdAt').reverse().toArray()) || [];

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await newbornService.getAllNewborns();
      if (res.success) setAllRecords(res.data);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    unityService.getAllUnities().then(res => {
      if (res.success && Array.isArray(res.data)) setUnities(res.data);
    }).catch(() => {});
  }, []);

  // Filtra por unidade
  useEffect(() => {
    if (!filterUnityId) { loadAll(); return; }
    setLoadingFilter(true);
    newbornService.getChildrenByUnity(Number(filterUnityId))
      .then(res => { if (res.success) setAllRecords(res.data); })
      .catch(() => {})
      .finally(() => setLoadingFilter(false));
  }, [filterUnityId, loadAll]);

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const handleDnvSearch = async () => {
    const dnv = dnvSearch.trim().toUpperCase();
    if (!dnv) return;
    setDnvSearching(true);
    setDnvError('');
    setDnvResult(null);
    try {
      const res = await newbornService.getChildByDNV(dnv);
      if (res.success && res.data) {
        setDnvResult(res.data);
      } else {
        setDnvError('Nenhuma criança encontrada com esse DNV.');
      }
    } catch {
      setDnvError('Erro ao pesquisar. Verifique o DNV inserido.');
    } finally {
      setDnvSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await newbornService.deleteChild(deleteId);
      if (res.success) { setDeleteId(null); loadAll(); flash('Registo eliminado com sucesso.'); }
      else flash('Erro ao eliminar o registo.');
    } catch { flash('Erro de comunicação com o servidor.'); }
    finally { setDeleting(false); }
  };

  const recordsToDisplay = allRecords.length > 0 ? allRecords : localRecords;
  const isLoading = loading || loadingFilter;

  const filteredRecords = recordsToDisplay.filter(record => {
    const nomeBaby = record.nomeCrianca || record.individual?.fullName || '';
    const nomeMother = record.nomeMae || record.mother?.individual?.fullName || '';
    return nomeBaby.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomeMother.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">

      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Registo de Recém-nascidos</h1>
          <p className="text-sm text-slate-500">Consulte o histórico central ou emita novos assentos de nascimento.</p>
        </div>
        <button onClick={() => router.push('/dashboard/recem-nascidos/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap">
          + Registar Nascimento
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMsg}</div>
      )}

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Pesquisar por nome da criança ou da mãe..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-800" />
          <select value={filterUnityId} onChange={e => setFilterUnityId(e.target.value)}
            className="px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-48">
            <option value="">Todas as Unidades</option>
            {unities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <input
            type="text"
            value={dnvSearch}
            onChange={e => { setDnvSearch(e.target.value.toUpperCase()); setDnvError(''); setDnvResult(null); }}
            onKeyDown={e => e.key === 'Enter' && !dnvSearching && dnvSearch.trim() && handleDnvSearch()}
            placeholder="Pesquisar por Nº DNV..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono text-slate-800 uppercase"
          />
          <button
            onClick={handleDnvSearch}
            disabled={!dnvSearch.trim() || dnvSearching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm transition-colors"
          >
            {dnvSearching ? '...' : 'Pesquisar DNV'}
          </button>
          {dnvResult && (
            <button
              onClick={() => { setDnvSearch(''); setDnvResult(null); setDnvError(''); }}
              className="px-3 py-2 border border-slate-300 text-slate-500 font-bold rounded-lg text-sm hover:bg-slate-50"
            >
              Limpar
            </button>
          )}
        </div>
        {dnvError && <p className="text-xs text-rose-600 font-semibold">{dnvError}</p>}
        {dnvResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-emerald-800">{dnvResult.individual?.fullName || '—'}</p>
              <p className="text-[10px] text-emerald-600">DNV · {dnvResult.individual?.identificationDocument?.identificationNumber || 'N/D'} · Nasc: {dnvResult.individual?.birthDate?.split('T')[0] || '—'}</p>
            </div>
            <button
              onClick={() => setDetailRecord(dnvResult)}
              className="text-xs font-bold text-emerald-700 border border-emerald-300 bg-white px-3 py-1.5 rounded-lg hover:bg-emerald-50"
            >
              Ver Detalhes
            </button>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Cód. Registo</th>
                <th className="px-5 py-3">Criança / Género</th>
                <th className="px-5 py-3">Progenitores & Origem</th>
                <th className="px-5 py-3">Data / Hora</th>
                <th className="px-5 py-3">Sinc.</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse">A carregar registos...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/50">Nenhum assento de nascimento localizado.</td></tr>
              ) : (
                filteredRecords.map(record => {
                  const id = record.id || record.code || 'N/D';
                  const nomeCrianca = record.nomeCrianca || record.individual?.fullName || '—';
                  const sexo = record.individual?.gender === 'MALE' ? 'M' : 'F';
                  const nomeMae = record.nomeMae || record.mother?.individual?.fullName || '—';
                  const nomePai = record.nomePai || record.father?.individual?.fullName || 'Não Declarado';
                  const local = record.naturalDe || record.placeOfBirth || '—';
                  const dataNasc = record.dataNascimento || record.individual?.birthDate?.split('T')[0] || '—';
                  const horaNasc = record.horaNascimento || record.individual?.birthDate?.split('T')[1]?.substring(0, 5) || '00:00';

                  return (
                    <tr key={id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-500 text-xs">{id.substring(0, 14)}…</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{nomeCrianca}</div>
                        <div className="text-xs text-slate-400">{sexo === 'M' ? 'Masculino' : 'Feminino'}</div>
                      </td>
                      <td className="px-5 py-4 text-xs space-y-0.5">
                        <div><span className="font-semibold text-slate-400">Mãe:</span> {nomeMae}</div>
                        <div><span className="font-semibold text-slate-400">Pai:</span> {nomePai}</div>
                        <div className="text-[11px] text-blue-600 italic">{local}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <div>{dataNasc}</div>
                        <div className="text-slate-400 font-mono">{horaNasc}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${record.status === 'pendente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {record.status === 'pendente' ? 'Pendente' : 'Sinc'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setDetailRecord(record)}
                            className="text-slate-600 hover:text-slate-800 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">Ver</button>
                          <button onClick={() => setEditRecord(record)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg">Editar</button>
                          <button onClick={() => setDeleteId(id)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg">Apagar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-slate-100 text-[11px] text-slate-400">
          {filteredRecords.length} registo(s) {filterUnityId ? `· Unidade: ${unities.find(u => String(u.id) === filterUnityId)?.name}` : ''}
        </div>
      </div>

      {/* MODAL: VER DETALHES */}
      {detailRecord && (
        <ChildDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onEdit={() => { setEditRecord(detailRecord); setDetailRecord(null); }}
        />
      )}

      {/* MODAL: EDITAR */}
      {editRecord && (
        <EditChildModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => { loadAll(); flash('Registo actualizado com sucesso.'); }}
        />
      )}

      {/* CONFIRMAÇÃO: APAGAR */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-500 mb-1">O assento de nascimento será removido permanentemente.</p>
            <p className="text-[10px] font-mono text-slate-400 mb-5">{deleteId}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold">
                {deleting ? 'A eliminar...' : 'Sim, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
