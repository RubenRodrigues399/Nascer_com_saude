'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService, CreateProfessionalDto, CreateSuperProfessionalDto } from '@/app/services/profissionais';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';
import { unityService, UnityRecord } from '@/app/services/unidades';
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

  // Unidades
  const [unities, setUnities] = useState<UnityRecord[]>([]);
  const [selectedUnityId, setSelectedUnityId] = useState<string>('');

  // Cascata territorial
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);
  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedMuniId, setSelectedMuniId] = useState('');
  const [selectedBairroId, setSelectedBairroId] = useState('');

  const isSuper = role === 'ADMINISTRATIVE_SUPER';
  const canCreateSuper = user?.roleProfessional === 'ADMINISTRATIVE_SUPER';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await unityService.getAllUnities();
        if (res.success && Array.isArray(res.data)) {
          setUnities(res.data);
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  // Pré-selecionar a unidade do utilizador logado assim que as unidades carregarem
  useEffect(() => {
    if (user?.unityId && unities.length > 0 && !selectedUnityId) {
      setSelectedUnityId(String(user.unityId));
    }
  }, [user?.unityId, unities]);

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

    if (!isSuper && !selectedUnityId) {
      setError('Seleccione a unidade hospitalar.');
      return;
    }
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

    const municipalityId = Number(selectedMuniId);

    const individualPayload: CreateProfessionalDto['individual'] = {
      fullName: fullName.trim(),
      gender,
      birthDate,
      municipalityId,
      neighborhoodName: bairroSelecionado?.name ?? '',
      role: 'PROFESSIONAL',
      identificationDocument: {
        type: docType,
        number: docNumber.trim().toUpperCase(),
        expirationDate: docExpiry,
      },
    };

    try {
      let response;

      if (isSuper) {
        const superPayload: CreateSuperProfessionalDto = {
          phoneNumber: phoneNumber.trim(),
          individual: individualPayload,
        };
        response = await professionalsService.createSuperProfessional(superPayload);
      } else {
        const regularPayload: CreateProfessionalDto = {
          individual: individualPayload,
          phoneNumber: phoneNumber.trim(),
          roleProfessional: role,
          municipalityId,
          idUnity: Number(selectedUnityId),
        };
        response = await professionalsService.createProfessional(regularPayload);
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
              <option value="TECHNICAL">Técnico de Registo</option>
              <option value="ADMINISTRATIVE">Supervisor Local</option>
              {canCreateSuper && (
                <option value="ADMINISTRATIVE_SUPER">Super Administrador</option>
              )}
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
          {!isSuper && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Unidade Hospitalar *</label>
              <select
                required
                value={selectedUnityId}
                onChange={e => setSelectedUnityId(e.target.value)}
                disabled={loading || unities.length === 0}
                className="w-full p-2.5 border border-slate-300 bg-white disabled:bg-slate-100 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="">{unities.length === 0 ? 'A carregar...' : '-- Escolha a Unidade --'}</option>
                {unities.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
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
