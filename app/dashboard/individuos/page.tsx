'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { individualsService, IndividualRecord, IndividualUpdateDTO } from '@/app/services/individuos';
import { locationsService, Province, Municipality, Neighborhood, safeNeighborhoodName } from '@/app/services/locations';
import { validateBI, validateFullName, isFutureDate, getTodayStr } from '@/utils/validators';

type SearchMode = 'all' | 'phone' | 'bi';

const genderLabel = (g?: string) => g === 'MALE' ? 'Masculino' : g === 'FEMALE' ? 'Feminino' : 'N/D';

const docTypeLabel: Record<string, string> = { BI: 'BI', PASSAPORT: 'Passaporte', DNV: 'DNV' };

// ─── Modal: Ver Detalhes ──────────────────────────────────────────────────────
function IndividualDetailModal({ ind, onClose, onEdit }: { ind: IndividualRecord; onClose: () => void; onEdit: () => void }) {
  const docTipo = ind.identificationDocument?.typeDocument || '—';
  const docNum = ind.identificationDocument?.identificationNumber || '—';
  const docValidade = ind.identificationDocument?.expirationDateDocument?.split('T')[0] || '—';
  const bairro = safeNeighborhoodName(ind.neighborhood?.name) || '—';
  const municipio = ind.neighborhood?.municipality?.name || '—';
  const provincia = ind.neighborhood?.municipality?.province?.name || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]">

        <div className="flex items-start justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cidadão / Indivíduo</p>
            <h2 className="text-xl font-black text-slate-800">{ind.fullName}</h2>
            <p className="text-[10px] font-mono text-slate-400 mt-1">{ind.id}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg flex-shrink-0">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          <DetailSection title="Identificação">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Género" value={genderLabel(ind.gender)} />
              <DetailField label="Data de Nascimento" value={ind.birthDate?.split('T')[0] || '—'} />
              <DetailField label="Tipo de Documento" value={docTypeLabel[docTipo] ?? docTipo} />
              <DetailField label="Nº do Documento" value={docNum} mono />
              <DetailField label="Validade do Doc." value={docValidade} />
              <DetailField label="Telefone" value={ind.phoneNumber || '—'} mono />
            </div>
          </DetailSection>

          <DetailSection title="Localização">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Província" value={provincia} />
              <DetailField label="Município" value={municipio} />
              <DetailField label="Bairro" value={bairro} className="col-span-2" />
            </div>
          </DetailSection>

          {(ind.createdAt || ind.updatedAt) && (
            <DetailSection title="Metadados">
              <div className="grid grid-cols-2 gap-3">
                {ind.createdAt && <DetailField label="Criado em" value={ind.createdAt.split('T')[0]} />}
                {ind.updatedAt && <DetailField label="Actualizado em" value={ind.updatedAt.split('T')[0]} />}
              </div>
            </DetailSection>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Fechar</button>
          <button onClick={onEdit}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Editar Dados</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Editar ────────────────────────────────────────────────────────────
interface EditForm {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  docType: 'BI' | 'PASSAPORT' | 'DNV';
  docNumber: string;
  docExpiry: string;
  birthDate: string;
  phoneNumber: string;
  provinceId: string;
  municipalityId: string;
  neighborhoodName: string;
}

function EditIndividualModal({ ind, onClose, onSaved }: { ind: IndividualRecord; onClose: () => void; onSaved: (updated: IndividualRecord) => void }) {
  const [form, setForm] = useState<EditForm>({
    fullName: ind.fullName || '',
    gender: ind.gender || 'MALE',
    docType: ind.identificationDocument?.typeDocument || 'BI',
    docNumber: ind.identificationDocument?.identificationNumber || '',
    docExpiry: ind.identificationDocument?.expirationDateDocument?.split('T')[0] || '',
    birthDate: ind.birthDate?.split('T')[0] || '',
    phoneNumber: ind.phoneNumber || '',
    provinceId: String(ind.neighborhood?.municipality?.province?.id || ''),
    municipalityId: String(ind.neighborhood?.municipality?.id || ''),
    neighborhoodName: safeNeighborhoodName(ind.neighborhood?.name),
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [serverError, setServerError] = useState('');

  const patch = (p: Partial<EditForm>) => setForm(f => ({ ...f, ...p }));

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

  const validate = (): boolean => {
    const e: Partial<Record<keyof EditForm, string>> = {};
    if (!validateFullName(form.fullName)) e.fullName = 'Introduza o nome completo (mínimo 2 nomes, só letras).';
    if (!form.docNumber.trim()) e.docNumber = 'Número do documento obrigatório.';
    else if (form.docType === 'BI' && !validateBI(form.docNumber)) e.docNumber = 'Formato de BI inválido. Ex: 000123456LA041';
    if (!form.docExpiry) e.docExpiry = 'Validade do documento obrigatória.';
    if (!form.birthDate) e.birthDate = 'Data de nascimento obrigatória.';
    else if (isFutureDate(form.birthDate)) e.birthDate = 'Data de nascimento não pode ser no futuro.';
    if (!form.municipalityId) e.municipalityId = 'Município obrigatório.';
    if (!form.neighborhoodName.trim()) e.neighborhoodName = 'Bairro obrigatório.';
    if (form.phoneNumber) {
      const phone = form.phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
      if (!/^9\d{8}$/.test(phone)) e.phoneNumber = 'Formato inválido. 9 dígitos: Ex: 921025087';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');

    const phone = form.phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');

    const payload: IndividualUpdateDTO = {
      individualId: ind.id,
      fullName: form.fullName.trim(),
      gender: form.gender,
      identificationDocument: {
        type: form.docType,
        number: form.docNumber.toUpperCase().trim(),
        expirationDate: form.docExpiry,
      },
      birthDate: form.birthDate,
      municipalityId: Number(form.municipalityId),
      neighborhoodName: form.neighborhoodName.trim(),
      ...(phone ? { phoneNumber: phone } : {}),
    };

    try {
      const res = await individualsService.updateIndividual(payload);
      if (res.success && res.data) { onSaved(res.data); onClose(); }
      else setServerError(res.message || 'Erro ao actualizar o cidadão.');
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
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Editar Cidadão</h2>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Nascimento *</label>
              <input type="date" max={getTodayStr()} value={form.birthDate} onChange={e => patch({ birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.birthDate && <p className="text-xs text-rose-600">{errors.birthDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Documento *</label>
              <select value={form.docType} onChange={e => patch({ docType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="BI">BI</option>
                <option value="PASSAPORT">Passaporte</option>
                <option value="DNV">DNV</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nº do Documento *</label>
              <input type="text" value={form.docNumber}
                onChange={e => patch({ docNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.docNumber && <p className="text-xs text-rose-600">{errors.docNumber}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validade do Documento *</label>
              <input type="date" value={form.docExpiry} onChange={e => patch({ docExpiry: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.docExpiry && <p className="text-xs text-rose-600">{errors.docExpiry}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
              <input type="text" value={form.phoneNumber} onChange={e => patch({ phoneNumber: e.target.value })}
                placeholder="921025087" maxLength={13}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <p className="text-[10px] text-slate-400">9 dígitos · sem prefixo 244</p>
              {errors.phoneNumber && <p className="text-xs text-rose-600">{errors.phoneNumber}</p>}
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
                  {neighborhoods.map(n => <option key={n.id} value={safeNeighborhoodName(n.name)}>{safeNeighborhoodName(n.name)}</option>)}
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
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm">
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers das modais ───────────────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{title}</p>
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">{children}</div>
    </div>
  );
}

function DetailField({ label, value, mono = false, className = '' }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function IndividuosPage() {
  const [allIndividuals, setAllIndividuals] = useState<IndividualRecord[]>([]);
  const [results, setResults] = useState<IndividualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');

  const [detailInd, setDetailInd] = useState<IndividualRecord | null>(null);
  const [editInd, setEditInd] = useState<IndividualRecord | null>(null);

  useEffect(() => {
    individualsService.getAllIndividuals()
      .then(res => {
        if (res.success) {
          const data = Array.isArray(res.data) ? res.data : [];
          setAllIndividuals(data);
          setResults(data);
        } else setError(res.message || 'Erro ao carregar cidadãos.');
      })
      .catch(() => setError('Não foi possível conectar ao servidor.'))
      .finally(() => setLoading(false));
  }, []);

  // Filtro client-side no modo "all"
  useEffect(() => {
    if (searchMode !== 'all') return;
    if (!searchTerm.trim()) { setResults(allIndividuals); return; }
    const term = searchTerm.toLowerCase();
    setResults(allIndividuals.filter(ind =>
      ind.fullName?.toLowerCase().includes(term) ||
      ind.phoneNumber?.includes(term) ||
      ind.identificationDocument?.identificationNumber?.toLowerCase().includes(term)
    ));
  }, [searchTerm, searchMode, allIndividuals]);

  // Pesquisa API por telefone ou BI
  const handleApiSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setError('');
    try {
      const res = searchMode === 'phone'
        ? await individualsService.getIndividualByPhone(term)
        : await individualsService.getIndividualByIdNumber(term.toUpperCase());
      if (res.success && res.data) {
        setResults(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        setResults([]);
        setError('Nenhum cidadão encontrado com esse critério.');
      }
    } catch {
      setResults([]);
      setError('Erro ao pesquisar. Verifique o valor inserido.');
    } finally {
      setSearching(false);
    }
  }, [searchTerm, searchMode]);

  const handleSearchInput = (value: string) => {
    setSearchTerm(searchMode === 'bi' ? value.toUpperCase() : value);
  };

  const resetSearch = () => {
    setSearchTerm('');
    setSearchMode('all');
    setResults(allIndividuals);
    setError('');
  };

  const handleSaved = (updated: IndividualRecord) => {
    setAllIndividuals(prev => prev.map(i => i.id === updated.id ? updated : i));
    setResults(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const modeLabels: Record<SearchMode, string> = {
    all: 'Todos',
    phone: 'Por Telefone',
    bi: 'Por BI / Documento',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">

      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cidadãos / Indivíduos</h1>
          <p className="text-sm text-slate-500">Consulta e edição de cidadãos registados no sistema.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-800">{allIndividuals.length}</span>
          <p className="text-xs text-slate-400 font-medium">registos totais</p>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'phone', 'bi'] as SearchMode[]).map(mode => (
            <button key={mode}
              onClick={() => { setSearchMode(mode); setSearchTerm(''); setError(''); if (mode === 'all') setResults(allIndividuals); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${searchMode === mode
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}>
              {modeLabels[mode]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchMode !== 'all' && handleApiSearch()}
            placeholder={
              searchMode === 'all' ? 'Pesquisar por nome, telefone ou nº de documento...'
                : searchMode === 'phone' ? 'Ex: 923000000'
                  : 'Ex: 003456789LA001'
            }
            className={`flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 ${searchMode === 'bi' ? 'font-mono uppercase' : ''}`}
          />
          {searchMode !== 'all' && (
            <button onClick={handleApiSearch} disabled={searching || !searchTerm.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors">
              {searching ? 'A pesquisar...' : 'Pesquisar'}
            </button>
          )}
          {(searchTerm || searchMode !== 'all') && (
            <button onClick={resetSearch}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-sm">Limpar</button>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{results.length} resultado(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Nome Completo</th>
                <th className="px-5 py-3">Documento</th>
                <th className="px-5 py-3">Género</th>
                <th className="px-5 py-3">Telefone</th>
                <th className="px-5 py-3">Município / Bairro</th>
                <th className="px-5 py-3">Data Nasc.</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 animate-pulse">A carregar cidadãos...</td></tr>
              ) : searching ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 animate-pulse">A pesquisar...</td></tr>
              ) : results.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Nenhum cidadão encontrado.</td></tr>
              ) : (
                results.map(ind => (
                  <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">{ind.fullName}</td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-slate-700">
                        {ind.identificationDocument?.identificationNumber || 'N/D'}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">
                        {docTypeLabel[ind.identificationDocument?.typeDocument] ?? ind.identificationDocument?.typeDocument ?? ''}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{genderLabel(ind.gender)}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{ind.phoneNumber || 'N/D'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div>{ind.neighborhood?.municipality?.name || 'N/D'}</div>
                      <div className="text-slate-400">{safeNeighborhoodName(ind.neighborhood?.name)}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{ind.birthDate?.split('T')[0] || 'N/D'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setDetailInd(ind)}
                          className="text-slate-600 hover:text-slate-800 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors">
                          Ver
                        </button>
                        <button onClick={() => setEditInd(ind)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VER */}
      {detailInd && (
        <IndividualDetailModal
          ind={detailInd}
          onClose={() => setDetailInd(null)}
          onEdit={() => { setEditInd(detailInd); setDetailInd(null); }}
        />
      )}

      {/* MODAL: EDITAR */}
      {editInd && (
        <EditIndividualModal
          ind={editInd}
          onClose={() => setEditInd(null)}
          onSaved={updated => { handleSaved(updated); setEditInd(null); }}
        />
      )}
    </div>
  );
}
