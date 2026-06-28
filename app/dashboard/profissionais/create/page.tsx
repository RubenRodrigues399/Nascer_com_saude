'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService } from '@/app/services/profissionais';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';
import { useAuth } from '@/context/AuthContext';

type Role = 'TECHNICAL' | 'ADMINISTRATIVE' | 'ADMINISTRATIVE_SUPER';
type DocType = 'BI' | 'PASSAPORT' | 'DNV';

export default function CreateProfessionalPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Campos do indivíduo
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState<Role>('TECHNICAL');
  const [docType, setDocType] = useState<DocType>('BI');
  const [docNumber, setDocNumber] = useState('');
  const [docExpiry, setDocExpiry] = useState('');

  // Cascata territorial
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);
  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedMuniId, setSelectedMuniId] = useState('');
  const [selectedBairroId, setSelectedBairroId] = useState('');

  const isSuper = role === 'ADMINISTRATIVE_SUPER';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await locationsService.getAllProvinces();
        if (res.success) {
          const data = res.data as any;
          setProvinces(Array.isArray(data) ? data : (data?.provinces || []));
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    setBairros([]);
    setSelectedMuniId('');
    setSelectedBairroId('');
    if (!selectedProvId) return;
    const load = async () => {
      try {
        const res = await locationsService.getMunicipalitiesByProvince(Number(selectedProvId));
        if (res.success) {
          const data = res.data as any;
          setMunicipalities(Array.isArray(data) ? data : (data?.municipalities || []));
        }
      } catch { /* silent */ }
    };
    load();
  }, [selectedProvId]);

  useEffect(() => {
    setBairros([]);
    setSelectedBairroId('');
    if (!selectedMuniId) return;
    const load = async () => {
      try {
        const res = await locationsService.getBairrosByMunicipality(Number(selectedMuniId));
        if (res.success) {
          const data = res.data as any;
          setBairros(Array.isArray(data) ? data : (data?.neighborhoods || data?.bairros || []));
        }
      } catch { /* silent */ }
    };
    load();
  }, [selectedMuniId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedMuniId || !selectedBairroId) {
      setError('Seleccione a localização completa: município e bairro.');
      return;
    }
    if (!docNumber.trim() || !docExpiry) {
      setError('Preencha o número e a validade do documento de identificação.');
      return;
    }

    setLoading(true);

    const bairroSelecionado = bairros.find(b => b.id === Number(selectedBairroId));

    const individualPayload = {
      fullName: fullName.trim(),
      gender,
      birthDate,
      role: 'PROFESSIONAL' as const,
      municipalityId: Number(selectedMuniId),
      neighborhoodName: bairroSelecionado?.name ?? '',
      identificationDocument: {
        type: docType,
        number: docNumber.trim().toUpperCase(),
        expirationDate: docExpiry,
      },
    };

    try {
      let response;

      if (isSuper) {
        // ProfessionalSuperCreateRequest — apenas individual + phoneNumber
        const superPayload = {
          phoneNumber: phoneNumber.trim(),
          individual: individualPayload,
        };
        response = await professionalsService.createSuperProfessional(superPayload as any);
      } else {
        // ProfessionalCreateRequest — payload completo com unityId da sessão
        const regularPayload = {
          roleProfessional: role,
          idUnity: user?.unityId ?? 1,
          phoneNumber: phoneNumber.trim(),
          municipalityId: Number(selectedMuniId),
          individual: individualPayload,
        };
        response = await professionalsService.createProfessional(regularPayload as any);
      }

      if (response.success) {
        router.push('/dashboard/profissionais');
      } else {
        setError(response.message || 'Falha ao registar o profissional.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setError(`Erro: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <button
        onClick={() => router.push('/dashboard/profissionais')}
        className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
      >
        ← Voltar para a Listagem
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
        <h1 className="text-lg font-black text-slate-800 mb-1">Registar Novo Profissional</h1>
        <p className="text-slate-400 text-xs mb-5">Preencha os dados de identidade e o vínculo territorial.</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-semibold border-l-4 border-rose-500 break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Função — primeiro para condicionar o formulário */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Função / Perfil</label>
            <select
              value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full p-2.5 border border-slate-300 bg-white rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            >
              <option value="TECHNICAL">Técnico de Registo (TECHNICAL)</option>
              <option value="ADMINISTRATIVE">Supervisor Local (ADMINISTRATIVE)</option>
              <option value="ADMINISTRATIVE_SUPER">Super Administrador (ADMINISTRATIVE_SUPER)</option>
            </select>
            {isSuper && (
              <p className="text-[10px] text-amber-600 font-semibold mt-1">
                Super Administrador: não requer unidade hospitalar nem município na raiz.
              </p>
            )}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Nome Completo *</label>
            <input
              type="text" required disabled={loading} value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Ex: João dos Santos"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Telefone + Género */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Telemóvel *</label>
              <input
                type="text" required disabled={loading} value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="9XXXXXXXX"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Género *</label>
              <select
                value={gender} onChange={e => setGender(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 bg-white rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </select>
            </div>
          </div>

          {/* Data de nascimento */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Data de Nascimento *</label>
            <input
              type="date" required disabled={loading} value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Documento */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Documento de Identificação</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo *</label>
                <select
                  value={docType} onChange={e => setDocType(e.target.value as DocType)}
                  className="w-full p-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BI">BI</option>
                  <option value="PASSAPORT">Passaporte</option>
                  <option value="DNV">DNV</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Número *</label>
                <input
                  type="text" required disabled={loading} value={docNumber}
                  onChange={e => setDocNumber(e.target.value.toUpperCase())}
                  placeholder="003456789LA001"
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Validade *</label>
                <input
                  type="date" required disabled={loading} value={docExpiry}
                  onChange={e => setDocExpiry(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Unidade (apenas para não-super) */}
          {!isSuper && user?.unityId && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Unidade atribuída automaticamente</p>
                <p className="text-xs text-blue-800 font-semibold">{user.unityName} <span className="font-mono text-blue-500">(ID: {user.unityId})</span></p>
              </div>
            </div>
          )}

          {/* Localização */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Atribuição Territorial</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Província</label>
                <select
                  value={selectedProvId} onChange={e => setSelectedProvId(e.target.value)}
                  className="w-full p-2 border border-slate-300 bg-white rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Escolha --</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Município *</label>
                <select
                  value={selectedMuniId} disabled={!selectedProvId}
                  onChange={e => setSelectedMuniId(e.target.value)}
                  className="w-full p-2 border border-slate-300 bg-white disabled:bg-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Escolha --</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro *</label>
              <select
                value={selectedBairroId} disabled={!selectedMuniId}
                onChange={e => setSelectedBairroId(e.target.value)}
                className="w-full p-2 border border-slate-300 bg-white disabled:bg-slate-100 rounded-xl text-xs font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Escolha o Bairro --</option>
                {bairros.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:bg-slate-300 shadow-sm"
          >
            {loading ? 'A Gravar...' : `Registar ${isSuper ? 'Super Administrador' : role === 'ADMINISTRATIVE' ? 'Supervisor' : 'Técnico'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
