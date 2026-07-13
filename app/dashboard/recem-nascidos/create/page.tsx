'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { newbornService, CreateChildDto, ParentInput, ChildRecord } from '@/app/services/recem-nascidos';
import { individualsService } from '@/app/services/individuos';
import { locationsService, Province, Municipality, Neighborhood, safeNeighborhoodName } from '@/app/services/locations';
import { unityService, UnityRecord } from '@/app/services/unidades';
import {
  validateBI, validateFullName, isFutureDate, isExpiredDate, getTodayStr,
  validateParentBirthDate, validateWitnessBirthDate, validatePassportNumber,
} from '@/utils/validators';

type DocType = 'BI' | 'PASSAPORT' | 'DNV';
type LookupState = 'idle' | 'searching' | 'found' | 'not_found';

interface ParentFormData {
  fullName: string;
  phoneNumber: string;
  docType: DocType;
  docNumber: string;
  docExpiry: string;
  birthDate: string;
  provinceId: string;
  municipalityId: string;
  neighborhoodName: string;
}

interface WitnessFormData extends ParentFormData {
  gender: 'MALE' | 'FEMALE';
  lookupDoc: string;
  lookupState: LookupState;
}

const emptyParent = (): ParentFormData => ({
  fullName: '', phoneNumber: '', docType: 'BI',
  docNumber: '', docExpiry: '', birthDate: '',
  provinceId: '', municipalityId: '', neighborhoodName: '',
});

const emptyWitness = (): WitnessFormData => ({ ...emptyParent(), gender: 'MALE', lookupDoc: '', lookupState: 'idle' });

const validateParent = (p: ParentFormData): Partial<Record<keyof ParentFormData, string>> => {
  const e: Partial<Record<keyof ParentFormData, string>> = {};
  if (!validateFullName(p.fullName)) e.fullName = 'Introduza o nome completo (mínimo 2 nomes, só letras).';
  const phone = p.phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
  if (!phone) e.phoneNumber = 'Telefone obrigatório.';
  else if (!/^9\d{8}$/.test(phone)) e.phoneNumber = 'Formato inválido. 9 dígitos: Ex: 921025087';
  if (!p.docNumber.trim()) e.docNumber = 'Número do documento obrigatório.';
  else if (p.docType === 'BI' && !validateBI(p.docNumber)) e.docNumber = 'Formato de BI inválido. Ex: 000123456LA041';
  else if (p.docType === 'PASSAPORT' && !validatePassportNumber(p.docNumber)) e.docNumber = 'Formato de passaporte inválido.';
  if (!p.docExpiry) e.docExpiry = 'Validade do documento obrigatória.';
  else if (isExpiredDate(p.docExpiry)) e.docExpiry = 'Documento expirado. Insira um documento válido.';
  if (!p.birthDate) e.birthDate = 'Data de nascimento obrigatória.';
  else if (isFutureDate(p.birthDate)) e.birthDate = 'Data de nascimento não pode ser no futuro.';
  if (!p.municipalityId) e.municipalityId = 'Município obrigatório.';
  if (!p.neighborhoodName.trim()) e.neighborhoodName = 'Bairro obrigatório.';
  return e;
};

const toParentInput = (p: ParentFormData): ParentInput => ({
  fullName: p.fullName.trim(),
  phoneNumber: p.phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, ''),
  identificationDocument: { type: p.docType, number: p.docNumber.toUpperCase().trim(), expirationDate: p.docExpiry },
  birthDate: p.birthDate,
  municipalityId: Number(p.municipalityId),
  neighborhoodName: p.neighborhoodName.trim(),
});

// ─── Campos partilhados entre ParentForm e WitnessFormSection ────────────────
function ParentFields({
  form,
  onChange,
  errors,
  provinces,
  municipalities,
  neighborhoods,
  loadingMunis,
  loadingNeighborhoods,
}: {
  form: ParentFormData;
  onChange: (patch: Partial<ParentFormData>) => void;
  errors: Partial<Record<keyof ParentFormData, string>>;
  provinces: Province[];
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  loadingMunis: boolean;
  loadingNeighborhoods: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1 md:col-span-2">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
        <input type="text" value={form.fullName}
          onChange={e => onChange({ fullName: e.target.value })}
          placeholder="Ex: Maria João da Silva"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors.fullName && <p className="text-xs text-rose-600 font-semibold">{errors.fullName}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefone *</label>
        <input type="text" value={form.phoneNumber}
          onChange={e => onChange({ phoneNumber: e.target.value })}
          placeholder="921025087" maxLength={13}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        <p className="text-[10px] text-slate-400">9 dígitos · Ex: 921025087</p>
        {errors.phoneNumber && <p className="text-xs text-rose-600 font-semibold">{errors.phoneNumber}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento *</label>
        <input type="date" max={getTodayStr()} value={form.birthDate}
          onChange={e => onChange({ birthDate: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors.birthDate && <p className="text-xs text-rose-600 font-semibold">{errors.birthDate}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Documento *</label>
        <select value={form.docType} onChange={e => onChange({ docType: e.target.value as DocType })}
          className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="BI">BI</option>
          <option value="PASSAPORT">Passaporte</option>
          <option value="DNV">DNV</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nº do Documento *</label>
        <input type="text" value={form.docNumber}
          onChange={e => onChange({ docNumber: e.target.value.toUpperCase() })}
          placeholder="003456789LA001"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors.docNumber && <p className="text-xs text-rose-600 font-semibold">{errors.docNumber}</p>}
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Validade do Documento *</label>
        <input type="date" value={form.docExpiry}
          onChange={e => onChange({ docExpiry: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors.docExpiry && <p className="text-xs text-rose-600 font-semibold">{errors.docExpiry}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Província</label>
        <select value={form.provinceId}
          onChange={e => onChange({ provinceId: e.target.value, municipalityId: '', neighborhoodName: '' })}
          className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">-- Escolha a Província --</option>
          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município *</label>
        <select value={form.municipalityId} disabled={!form.provinceId || loadingMunis}
          onChange={e => onChange({ municipalityId: e.target.value, neighborhoodName: '' })}
          className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">{loadingMunis ? 'A carregar...' : '-- Escolha o Município --'}</option>
          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {errors.municipalityId && <p className="text-xs text-rose-600 font-semibold">{errors.municipalityId}</p>}
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bairro *</label>
        {form.municipalityId && !loadingNeighborhoods && neighborhoods.length > 0 ? (
          <select value={form.neighborhoodName}
            onChange={e => onChange({ neighborhoodName: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">-- Escolha o Bairro --</option>
            {neighborhoods.map(n => <option key={n.id} value={safeNeighborhoodName(n.name)}>{safeNeighborhoodName(n.name)}</option>)}
          </select>
        ) : (
          <input type="text" value={form.neighborhoodName}
            onChange={e => onChange({ neighborhoodName: e.target.value })}
            disabled={loadingNeighborhoods}
            placeholder={loadingNeighborhoods ? 'A carregar bairros...' : 'Ex: Palanca'}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50" />
        )}
        {errors.neighborhoodName && <p className="text-xs text-rose-600 font-semibold">{errors.neighborhoodName}</p>}
      </div>
    </div>
  );
}

// ─── Caixa de pesquisa rápida por nº de documento (partilhada entre progenitores e testemunhas) ──
function LookupBox({
  label, lookupDoc, onLookupDocChange, lookupState, onLookup,
}: {
  label: string;
  lookupDoc: string;
  onLookupDocChange: (v: string) => void;
  lookupState: LookupState;
  onLookup: () => void;
}) {
  const isSearching = lookupState === 'searching';
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
      <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider">
        Pesquisa Rápida (opcional) — pré-preenche automaticamente
      </p>
      <div className="flex gap-2">
        <input type="text" value={lookupDoc}
          onChange={e => onLookupDocChange(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && !isSearching && lookupDoc.trim() && onLookup()}
          placeholder={`Nº do documento de ${label}`}
          disabled={isSearching}
          className="flex-1 px-3 py-2 border border-blue-300 bg-white rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase" />
        <button type="button" onClick={onLookup}
          disabled={!lookupDoc.trim() || isSearching}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors">
          {isSearching ? '...' : 'Pesquisar'}
        </button>
      </div>
      {lookupState === 'found' && <p className="text-xs font-bold text-emerald-700">✓ Cidadão encontrado — campos pré-preenchidos.</p>}
      {lookupState === 'not_found' && <p className="text-xs font-bold text-amber-700">⚠ Não encontrado — preencha os dados manualmente.</p>}
    </div>
  );
}

// ─── Formulário de progenitor (com pesquisa rápida opcional) ─────────────────
function ParentForm({
  label, lookupDoc, onLookupDocChange, lookupState, onLookup,
  form, onChange, errors, provinces, municipalities, neighborhoods,
  loadingMunis, loadingNeighborhoods,
}: {
  label: string;
  lookupDoc: string;
  onLookupDocChange: (v: string) => void;
  lookupState: LookupState;
  onLookup: () => void;
  form: ParentFormData;
  onChange: (patch: Partial<ParentFormData>) => void;
  errors: Partial<Record<keyof ParentFormData, string>>;
  provinces: Province[];
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  loadingMunis: boolean;
  loadingNeighborhoods: boolean;
}) {
  return (
    <div className="space-y-5">
      <LookupBox label={label} lookupDoc={lookupDoc} onLookupDocChange={onLookupDocChange}
        lookupState={lookupState} onLookup={onLookup} />
      <ParentFields form={form} onChange={onChange} errors={errors}
        provinces={provinces} municipalities={municipalities} neighborhoods={neighborhoods}
        loadingMunis={loadingMunis} loadingNeighborhoods={loadingNeighborhoods} />
    </div>
  );
}

// ─── Formulário de testemunha (com cascata de localização interna) ────────────
function WitnessFormSection({
  index, data, onChange, onRemove, onLookup, provinces, errors,
}: {
  index: number;
  data: WitnessFormData;
  onChange: (patch: Partial<WitnessFormData>) => void;
  onRemove: () => void;
  onLookup: () => void;
  provinces: Province[];
  errors: Partial<Record<keyof ParentFormData, string>>;
}) {
  const [munis, setMunis] = useState<Municipality[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadingMunis, setLoadingMunis] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  useEffect(() => {
    setMunis([]); setNeighborhoods([]);
    if (!data.provinceId) return;
    setLoadingMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(data.provinceId))
      .then(res => { if (res.success) { const d = res.data as any; setMunis(Array.isArray(d) ? d : (d?.municipalities || [])); } })
      .catch(() => {}).finally(() => setLoadingMunis(false));
  }, [data.provinceId]);

  useEffect(() => {
    setNeighborhoods([]);
    if (!data.municipalityId) return;
    setLoadingNeighborhoods(true);
    locationsService.getBairrosByMunicipality(Number(data.municipalityId))
      .then(res => { if (res.success) { const d = res.data as any; setNeighborhoods(Array.isArray(d) ? d : (d?.neighborhoods || [])); } })
      .catch(() => {}).finally(() => setLoadingNeighborhoods(false));
  }, [data.municipalityId]);

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-600 uppercase tracking-wide">Testemunha {index + 1}</p>
        <button type="button" onClick={onRemove}
          className="text-xs text-rose-600 hover:text-rose-800 font-bold border border-rose-200 bg-rose-50 px-2 py-1 rounded-lg">
          Remover
        </button>
      </div>

      <LookupBox label={`Testemunha ${index + 1}`} lookupDoc={data.lookupDoc}
        onLookupDocChange={v => onChange({ lookupDoc: v })}
        lookupState={data.lookupState} onLookup={onLookup} />

      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Género da Testemunha *</label>
        <select value={data.gender} onChange={e => onChange({ gender: e.target.value as 'MALE' | 'FEMALE' })}
          className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="MALE">Masculino</option>
          <option value="FEMALE">Feminino</option>
        </select>
      </div>

      <ParentFields form={data} onChange={onChange} errors={errors}
        provinces={provinces} municipalities={munis} neighborhoods={neighborhoods}
        loadingMunis={loadingMunis} loadingNeighborhoods={loadingNeighborhoods} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
// Guarda o(s) payload(s) localmente quando o envio falha por falta de ligação
// ao servidor, para não obrigar o operador a reescrever tudo se fechar a
// página — e para suportar mais de um registo por enviar em simultâneo
// (ex: duas tentativas falhadas em sessões diferentes antes de a rede voltar).
interface PendingDraft {
  id: string;
  savedAt: number;
  payload: CreateChildDto;
}

const DRAFTS_KEY = 'dnirn_pending_child_registrations';

function loadDrafts(): PendingDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: PendingDraft[]) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // localStorage indisponível (modo privado, quota esgotada, etc.) — sem rascunho, sem crash
  }
}

type CreateAttemptResult =
  | { ok: true; data: ChildRecord }
  | { ok: false; networkError: true }
  | { ok: false; networkError: false; message: string };

async function attemptCreate(payload: CreateChildDto): Promise<CreateAttemptResult> {
  try {
    const res = await newbornService.createChild(payload);
    if (res.success) return { ok: true, data: res.data };
    return { ok: false, networkError: false, message: res.message || 'Erro ao comunicar com a API.' };
  } catch (err: any) {
    if (!err.response) return { ok: false, networkError: true };
    const data = err.response?.data;
    const detail =
      (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ||
      (Array.isArray(data?.errors) ? data.errors.join(', ') : data?.errors) ||
      data?.error || err.message || 'Erro desconhecido';
    return { ok: false, networkError: false, message: `Erro ${err.response?.status ?? ''}: ${detail}` };
  }
}

export default function CreateChildPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState('');
  const [networkError, setNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdRecord, setCreatedRecord] = useState<ChildRecord | null>(null);

  // Registos por enviar guardados localmente (pode haver mais do que um)
  const [pendingDrafts, setPendingDrafts] = useState<PendingDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

  useEffect(() => { setPendingDrafts(loadDrafts()); }, []);

  const addDraft = (payload: CreateChildDto): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingDrafts(prev => {
      const next = [...prev, { id, savedAt: Date.now(), payload }];
      saveDrafts(next);
      return next;
    });
    return id;
  };

  const removeDraftById = (id: string) => {
    setPendingDrafts(prev => {
      const next = prev.filter(d => d.id !== id);
      saveDrafts(next);
      return next;
    });
  };

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [unities, setUnities] = useState<UnityRecord[]>([]);

  // ── Mãe
  const [motherLookupDoc, setMotherLookupDoc] = useState('');
  const [motherLookupState, setMotherLookupState] = useState<LookupState>('idle');
  const [mother, setMother] = useState<ParentFormData>(emptyParent());
  const [motherErrors, setMotherErrors] = useState<Partial<Record<keyof ParentFormData, string>>>({});
  const [motherMunis, setMotherMunis] = useState<Municipality[]>([]);
  const [loadingMotherMunis, setLoadingMotherMunis] = useState(false);
  const [motherNeighborhoods, setMotherNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadingMotherNeighborhoods, setLoadingMotherNeighborhoods] = useState(false);

  // ── Pai (opcional)
  const [includeFather, setIncludeFather] = useState(false);
  const [fatherLookupDoc, setFatherLookupDoc] = useState('');
  const [fatherLookupState, setFatherLookupState] = useState<LookupState>('idle');
  const [father, setFather] = useState<ParentFormData>(emptyParent());
  const [fatherErrors, setFatherErrors] = useState<Partial<Record<keyof ParentFormData, string>>>({});
  const [fatherMunis, setFatherMunis] = useState<Municipality[]>([]);
  const [loadingFatherMunis, setLoadingFatherMunis] = useState(false);
  const [fatherNeighborhoods, setFatherNeighborhoods] = useState<Neighborhood[]>([]);
  const [loadingFatherNeighborhoods, setLoadingFatherNeighborhoods] = useState(false);

  // ── Testemunhas (opcional)
  const [witnesses, setWitnesses] = useState<WitnessFormData[]>([]);
  const [witnessErrors, setWitnessErrors] = useState<Partial<Record<keyof ParentFormData, string>>[]>([]);

  // ── Criança
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [childBirthDate, setChildBirthDate] = useState('');
  const [childBirthTime, setChildBirthTime] = useState('00:00');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [vitalStatus, setVitalStatus] = useState<'ALIVE' | 'DECEASED'>('ALIVE');
  const [deathDate, setDeathDate] = useState('');
  const [gestWeeks, setGestWeeks] = useState('');
  const [gestDays, setGestDays] = useState('0');
  const [placeOfBirth, setPlaceOfBirth] = useState<'HOSPITAL' | 'HOME' | 'OTHER'>('HOSPITAL');
  const [professionalSupport, setProfessionalSupport] = useState(true);
  const [selectedUnityId, setSelectedUnityId] = useState('');
  const [childErrors, setChildErrors] = useState<{ [k: string]: string }>({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    locationsService.getAllProvinces().then(res => {
      if (res.success) { const d = res.data as any; setProvinces(Array.isArray(d) ? d : (d?.provinces || [])); }
    }).catch(() => {});
    unityService.getAllUnities().then(res => {
      if (res.success && Array.isArray(res.data)) setUnities(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setMotherMunis([]); setMotherNeighborhoods([]);
    if (!mother.provinceId) return;
    setLoadingMotherMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(mother.provinceId))
      .then(res => { if (res.success) { const d = res.data as any; setMotherMunis(Array.isArray(d) ? d : (d?.municipalities || [])); } })
      .catch(() => {}).finally(() => setLoadingMotherMunis(false));
  }, [mother.provinceId]);

  useEffect(() => {
    setMotherNeighborhoods([]);
    if (!mother.municipalityId) return;
    setLoadingMotherNeighborhoods(true);
    locationsService.getBairrosByMunicipality(Number(mother.municipalityId))
      .then(res => { if (res.success) { const d = res.data as any; setMotherNeighborhoods(Array.isArray(d) ? d : (d?.neighborhoods || [])); } })
      .catch(() => {}).finally(() => setLoadingMotherNeighborhoods(false));
  }, [mother.municipalityId]);

  useEffect(() => {
    setFatherMunis([]); setFatherNeighborhoods([]);
    if (!father.provinceId) return;
    setLoadingFatherMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(father.provinceId))
      .then(res => { if (res.success) { const d = res.data as any; setFatherMunis(Array.isArray(d) ? d : (d?.municipalities || [])); } })
      .catch(() => {}).finally(() => setLoadingFatherMunis(false));
  }, [father.provinceId]);

  useEffect(() => {
    setFatherNeighborhoods([]);
    if (!father.municipalityId) return;
    setLoadingFatherNeighborhoods(true);
    locationsService.getBairrosByMunicipality(Number(father.municipalityId))
      .then(res => { if (res.success) { const d = res.data as any; setFatherNeighborhoods(Array.isArray(d) ? d : (d?.neighborhoods || [])); } })
      .catch(() => {}).finally(() => setLoadingFatherNeighborhoods(false));
  }, [father.municipalityId]);

  // ── Lookup por nº de documento
  const doLookup = async (docNum: string, setForm: (f: ParentFormData) => void, setState: (s: LookupState) => void) => {
    const doc = docNum.trim().toUpperCase();
    if (!doc) return;
    setState('searching');
    try {
      const res = await individualsService.getIndividualByIdNumber(doc);
      if (res.success && res.data) {
        const ind = res.data as any;
        setForm({
          fullName: ind.fullName || '',
          phoneNumber: ind.phoneNumber || '',
          docType: ind.identificationDocument?.typeDocument || ind.identificationDocument?.type || 'BI',
          docNumber: ind.identificationDocument?.identificationNumber || ind.identificationDocument?.number || doc,
          docExpiry: (ind.identificationDocument?.expirationDateDocument || ind.identificationDocument?.expirationDate || '').split('T')[0],
          birthDate: (ind.birthDate || '').split('T')[0],
          provinceId: String(ind.neighborhood?.municipality?.province?.id || ''),
          municipalityId: String(ind.neighborhood?.municipality?.id || ''),
          neighborhoodName: safeNeighborhoodName(ind.neighborhood?.name) || '',
        });
        setState('found');
      } else {
        setState('not_found');
      }
    } catch {
      setState('not_found');
    }
  };

  // ── Navegação
  const goToStep2 = () => {
    const errs = validateParent(mother);
    setMotherErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  const goToStep3 = () => {
    if (includeFather) {
      const errs = validateParent(father);
      setFatherErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }
    setStep(3);
  };

  const goToStep4 = () => {
    const errs: { [k: string]: string } = {};
    if (!validateFullName(childName)) errs.childName = 'Introduza o nome completo da criança (mínimo 2 nomes, só letras).';
    if (!childBirthDate) errs.childBirthDate = 'Data de nascimento obrigatória.';
    else if (isFutureDate(childBirthDate)) errs.childBirthDate = 'Data de nascimento não pode ser no futuro.';
    if (!height || isNaN(Number(height)) || Number(height) <= 0) errs.height = 'Altura inválida.';
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) errs.weight = 'Peso inválido.';
    if (!gestWeeks || isNaN(Number(gestWeeks))) errs.gestWeeks = 'Semanas gestacionais obrigatórias.';
    if (!selectedUnityId) errs.selectedUnityId = 'Unidade hospitalar obrigatória.';
    if (vitalStatus === 'DECEASED') {
      if (!deathDate) errs.deathDate = 'Data de óbito obrigatória.';
      else if (isFutureDate(deathDate)) errs.deathDate = 'Data de óbito não pode ser no futuro.';
      else if (childBirthDate && deathDate < childBirthDate) errs.deathDate = 'A data de óbito não pode ser anterior à data de nascimento.';
    }
    if (!includeFather && witnesses.length < 2) errs.witnesses = 'Na ausência do pai, são necessárias pelo menos 2 testemunhas.';

    // Validação cruzada: pais têm de ter nascido antes do filho, com um intervalo mínimo plausível
    if (childBirthDate && !isFutureDate(childBirthDate)) {
      const motherAgeErr = validateParentBirthDate(mother.birthDate, childBirthDate);
      if (motherAgeErr) errs.motherAge = `Mãe: ${motherAgeErr} Volte ao Passo 1 para corrigir.`;
      if (includeFather) {
        const fatherAgeErr = validateParentBirthDate(father.birthDate, childBirthDate);
        if (fatherAgeErr) errs.fatherAge = `Pai: ${fatherAgeErr} Volte ao Passo 2 para corrigir.`;
      }
    }

    // Testemunhas: presença/formato + maioridade + nascimento anterior ao do filho
    const wErrsList = witnesses.map(w => {
      const we = validateParent(w);
      if (childBirthDate && !isFutureDate(childBirthDate)) {
        const witnessAgeErr = validateWitnessBirthDate(w.birthDate, childBirthDate);
        if (witnessAgeErr) we.birthDate = witnessAgeErr;
      }
      return we;
    });
    setWitnessErrors(wErrsList);
    if (wErrsList.some(we => Object.keys(we).length > 0)) errs.witnessesInvalid = 'Corrija os dados assinalados nas testemunhas acima.';

    setChildErrors(errs);
    if (Object.keys(errs).length === 0) setStep(4);
  };

  // ── Testemunhas
  const addWitness = () => { if (witnesses.length < 3) setWitnesses(w => [...w, emptyWitness()]); };
  const removeWitness = (i: number) => {
    setWitnesses(w => w.filter((_, idx) => idx !== i));
    setWitnessErrors(e => e.filter((_, idx) => idx !== i));
  };
  const updateWitness = (i: number, patch: Partial<WitnessFormData>) =>
    setWitnesses(w => w.map((item, idx) => idx === i ? { ...item, ...patch } : item));

  // ── Submissão (partilhada entre o envio inicial e o "Tentar Novamente" no formulário)
  const submitPayload = async (payload: CreateChildDto, draftId?: string) => {
    setLoading(true);
    setServerError('');
    setNetworkError(false);

    console.log('[CREATE CHILD] Payload enviado:', JSON.stringify(payload, null, 2));
    const result = await attemptCreate(payload);

    if (result.ok) {
      console.log('[CREATE CHILD] Resposta da API:', result.data);
      if (draftId) removeDraftById(draftId);
      setCurrentDraftId(null);
      setCreatedRecord(result.data);
    } else if (result.networkError) {
      // Sem resposta do servidor (rede em falha, servidor inacessível, etc.) — guarda o
      // rascunho localmente para que o operador não perca os dados já preenchidos.
      console.error('[CREATE CHILD] Falha de rede.');
      const id = draftId ?? addDraft(payload);
      setCurrentDraftId(id);
      setNetworkError(true);
      setServerError('Sem ligação ao servidor. Os dados foram guardados neste dispositivo — tente novamente quando a rede voltar.');
      setStep(4);
    } else {
      console.warn('[CREATE CHILD] Recusado:', result.message);
      setServerError(result.message);
      setStep(4);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();

    const payload: CreateChildDto = {
      individualChild: {
        fullName: childName.trim(),
        gender: childGender,
        birthDate: `${childBirthDate}T${childBirthTime}:00`,
      },
      height: Number(height),
      weight: Number(weight),
      vitalStatus,
      deathDate: vitalStatus === 'DECEASED' ? deathDate : undefined,
      gestacionalAge: { weeks: Number(gestWeeks), days: Number(gestDays || 0) },
      placeOfBirth,
      professionalSupport,
      unityId: Number(selectedUnityId),
      mother: toParentInput(mother),
      ...(includeFather ? { father: toParentInput(father) } : {}),
      witness: witnesses.map(w => ({ parent: toParentInput(w), gender: w.gender })),
    };

    setCurrentDraftId(null);
    await submitPayload(payload);
  };

  const handleRetry = () => {
    const draft = pendingDrafts.find(d => d.id === currentDraftId);
    if (draft) submitPayload(draft.payload, draft.id);
  };

  // ── Recuperação de registos por enviar (ecrã de lista, fora do formulário principal)
  const retryDraft = async (draft: PendingDraft) => {
    setRetryingId(draft.id);
    setDraftErrors(prev => {
      const { [draft.id]: _removed, ...rest } = prev;
      return rest;
    });
    const result = await attemptCreate(draft.payload);
    if (result.ok) {
      removeDraftById(draft.id);
      setCreatedRecord(result.data);
    } else if (result.networkError) {
      setDraftErrors(prev => ({ ...prev, [draft.id]: 'Ainda sem ligação ao servidor. O registo continua guardado — tenta novamente mais tarde.' }));
    } else {
      setDraftErrors(prev => ({ ...prev, [draft.id]: result.message }));
    }
    setRetryingId(null);
  };

  const discardDraft = (id: string) => {
    removeDraftById(id);
    setDraftErrors(prev => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const resetAll = () => {
    setStep(1);
    setServerError('');
    setNetworkError(false);
    setCurrentDraftId(null);
    setCreatedRecord(null);
    setMother(emptyParent()); setMotherErrors({}); setMotherLookupDoc(''); setMotherLookupState('idle');
    setIncludeFather(false); setFather(emptyParent()); setFatherErrors({}); setFatherLookupDoc(''); setFatherLookupState('idle');
    setWitnesses([]); setWitnessErrors([]);
    setChildName(''); setChildGender('MALE'); setChildBirthDate(''); setChildBirthTime('00:00');
    setHeight(''); setWeight(''); setVitalStatus('ALIVE'); setDeathDate('');
    setGestWeeks(''); setGestDays('0'); setPlaceOfBirth('HOSPITAL'); setProfessionalSupport(true);
    setSelectedUnityId(''); setChildErrors({});
  };

  if (createdRecord) {
    const dnv = createdRecord.individual?.identificationDocument?.identificationNumber || 'N/D';
    const childFullName = createdRecord.individual?.fullName || childName;
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-2">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-2xl font-black">✓</div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Assento Registado com Sucesso</h1>
            <p className="text-sm text-slate-500 mt-1">{childFullName}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl inline-block">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Nº DNV Gerado</p>
            <p className="text-2xl font-black text-blue-800 font-mono tracking-wide">{dnv}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetAll}
              className="w-1/2 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
              Registar Outro
            </button>
            <button type="button" onClick={() => router.push('/dashboard/recem-nascidos')}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
              Ver na Lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingDrafts.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-2">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => router.push('/dashboard/recem-nascidos')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">
            ← Voltar à lista
          </button>
          <h1 className="text-xl font-black text-slate-800">
            {pendingDrafts.length === 1 ? 'Registo Por Enviar Encontrado' : `${pendingDrafts.length} Registos Por Enviar Encontrados`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {pendingDrafts.length === 1
              ? 'Uma tentativa anterior falhou por falta de ligação e ficou guardada neste dispositivo.'
              : 'Estas tentativas anteriores falharam por falta de ligação e ficaram guardadas neste dispositivo.'}
          </p>
        </div>

        <div className="space-y-4">
          {pendingDrafts.map(draft => {
            const p = draft.payload;
            const isRetrying = retryingId === draft.id;
            const draftError = draftErrors[draft.id];
            return (
              <div key={draft.id} className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Guardado em {new Date(draft.savedAt).toLocaleString('pt-AO')}
                    </p>
                    <h2 className="text-base font-black text-slate-800">{p.individualChild.fullName}</h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                    {p.individualChild.gender === 'MALE' ? 'Masculino' : 'Feminino'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Nascimento</p>
                    <p className="text-slate-700">{p.individualChild.birthDate.replace('T', ' ').slice(0, 16)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Peso / Altura</p>
                    <p className="text-slate-700">{p.weight} kg · {p.height} cm</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Mãe</p>
                    <p className="text-slate-700">{p.mother.fullName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Pai</p>
                    <p className="text-slate-700">{p.father?.fullName || 'Não declarado'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Testemunhas</p>
                    <p className="text-slate-700">{p.witness?.length || 0}</p>
                  </div>
                </div>

                {draftError && (
                  <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold break-words">
                    {draftError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" disabled={isRetrying}
                    onClick={() => discardDraft(draft.id)}
                    className="w-1/2 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    Descartar
                  </button>
                  <button type="button" disabled={isRetrying}
                    onClick={() => retryDraft(draft)}
                    className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs">
                    {isRetrying ? 'A Enviar...' : 'Tentar Enviar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const stepLabels = ['Mãe', 'Pai', 'Bebé', 'Confirmar'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2">

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => router.push('/dashboard/recem-nascidos')}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">
          ← Voltar à lista
        </button>
        <h1 className="text-xl font-black text-slate-800">Novo Assento de Nascimento</h1>
        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {stepLabels.map((label, i) => {
            const n = i + 1; const active = step === n; const done = step > n;
            return (
              <React.Fragment key={n}>
                <div className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {done ? '✓ ' : `${n}. `}{label}
                </div>
                {i < 3 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {serverError && (
        <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold break-words flex items-center justify-between gap-3">
          <span>{serverError}</span>
          {networkError && (
            <button type="button" onClick={handleRetry} disabled={loading}
              className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition-colors">
              {loading ? 'A tentar...' : 'Tentar Novamente'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">

          {/* ── PASSO 1: Mãe ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">Dados da Mãe</h2>
              <ParentForm
                label="mãe"
                lookupDoc={motherLookupDoc}
                onLookupDocChange={v => setMotherLookupDoc(v)}
                lookupState={motherLookupState}
                onLookup={() => doLookup(motherLookupDoc, setMother, setMotherLookupState)}
                form={mother}
                onChange={patch => setMother(m => ({ ...m, ...patch }))}
                errors={motherErrors}
                provinces={provinces}
                municipalities={motherMunis}
                neighborhoods={motherNeighborhoods}
                loadingMunis={loadingMotherMunis}
                loadingNeighborhoods={loadingMotherNeighborhoods}
              />
              <button type="button" onClick={goToStep2}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors mt-2">
                Continuar: Dados do Pai →
              </button>
            </>
          )}

          {/* ── PASSO 2: Pai ─────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">Dados do Pai</h2>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <button type="button"
                  onClick={() => { setIncludeFather(!includeFather); setFather(emptyParent()); setFatherErrors({}); setFatherLookupDoc(''); setFatherLookupState('idle'); }}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${includeFather ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeFather ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-600 font-medium">
                  {includeFather ? 'Registar o pai neste assento' : 'Pai não incluído (pode ser adicionado depois)'}
                </span>
              </div>
              {includeFather && (
                <ParentForm
                  label="pai"
                  lookupDoc={fatherLookupDoc}
                  onLookupDocChange={v => setFatherLookupDoc(v)}
                  lookupState={fatherLookupState}
                  onLookup={() => doLookup(fatherLookupDoc, setFather, setFatherLookupState)}
                  form={father}
                  onChange={patch => setFather(f => ({ ...f, ...patch }))}
                  errors={fatherErrors}
                  provinces={provinces}
                  municipalities={fatherMunis}
                  neighborhoods={fatherNeighborhoods}
                  loadingMunis={loadingFatherMunis}
                  loadingNeighborhoods={loadingFatherNeighborhoods}
                />
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Voltar</button>
                <button type="button" onClick={goToStep3}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                  Continuar: Dados do Bebé →
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 3: Criança + Testemunhas ───────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">Dados do Recém-Nascido</h2>
              <div className="space-y-4">

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo da Criança *</label>
                  <input type="text" value={childName}
                    onChange={e => { setChildName(e.target.value); setChildErrors(v => ({ ...v, childName: '' })); }}
                    placeholder="Ex: Maria José da Silva"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  {childErrors.childName && <p className="text-xs text-rose-600 font-semibold">{childErrors.childName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Género *</label>
                  <select value={childGender} onChange={e => setChildGender(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Feminino</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento *</label>
                    <input type="date" max={today} value={childBirthDate}
                      onChange={e => { setChildBirthDate(e.target.value); setChildErrors(v => ({ ...v, childBirthDate: '' })); }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.childBirthDate && <p className="text-xs text-rose-600 font-semibold">{childErrors.childBirthDate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hora de Nascimento</label>
                    <input type="time" value={childBirthTime} onChange={e => setChildBirthTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Altura (cm) *</label>
                    <input type="number" min="1" max="100" step="0.1" value={height}
                      onChange={e => { setHeight(e.target.value); setChildErrors(v => ({ ...v, height: '' })); }}
                      placeholder="Ex: 50"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.height && <p className="text-xs text-rose-600 font-semibold">{childErrors.height}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peso (kg) *</label>
                    <input type="number" min="0.1" max="20" step="0.01" value={weight}
                      onChange={e => { setWeight(e.target.value); setChildErrors(v => ({ ...v, weight: '' })); }}
                      placeholder="Ex: 3.4"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.weight && <p className="text-xs text-rose-600 font-semibold">{childErrors.weight}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semanas Gestacionais *</label>
                    <input type="number" min="20" max="45" value={gestWeeks}
                      onChange={e => { setGestWeeks(e.target.value); setChildErrors(v => ({ ...v, gestWeeks: '' })); }}
                      placeholder="Ex: 39"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.gestWeeks && <p className="text-xs text-rose-600 font-semibold">{childErrors.gestWeeks}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dias Adicionais</label>
                    <input type="number" min="0" max="6" value={gestDays} onChange={e => setGestDays(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado Vital *</label>
                    <select value={vitalStatus} onChange={e => setVitalStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="ALIVE">Vivo</option>
                      <option value="DECEASED">Falecido</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local de Nascimento *</label>
                    <select value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="HOSPITAL">Hospital</option>
                      <option value="HOME">Domicílio</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </div>
                </div>

                {vitalStatus === 'DECEASED' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Óbito *</label>
                    <input type="date" max={today} value={deathDate}
                      onChange={e => { setDeathDate(e.target.value); setChildErrors(v => ({ ...v, deathDate: '' })); }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.deathDate && <p className="text-xs text-rose-600 font-semibold">{childErrors.deathDate}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unidade Hospitalar *</label>
                  <select value={selectedUnityId} disabled={unities.length === 0}
                    onChange={e => { setSelectedUnityId(e.target.value); setChildErrors(v => ({ ...v, selectedUnityId: '' })); }}
                    className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">{unities.length === 0 ? 'A carregar unidades...' : '-- Selecione a Unidade --'}</option>
                    {unities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {childErrors.selectedUnityId && <p className="text-xs text-rose-600 font-semibold">{childErrors.selectedUnityId}</p>}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <button type="button" onClick={() => setProfessionalSupport(!professionalSupport)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${professionalSupport ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${professionalSupport ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-600 font-medium">
                    {professionalSupport ? 'Nascimento assistido por profissional de saúde' : 'Sem assistência profissional'}
                  </span>
                </div>

                {/* ── Testemunhas ── */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-600 uppercase tracking-wide">
                        Testemunhas {includeFather ? '(opcional)' : <span className="text-rose-600">(obrigatório: mín. 2)</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">Máximo 3 testemunhas</p>
                    </div>
                    {witnesses.length < 3 && (
                      <button type="button" onClick={addWitness}
                        className="text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        + Adicionar Testemunha
                      </button>
                    )}
                  </div>
                  {childErrors.witnesses && <p className="text-xs text-rose-600 font-semibold">{childErrors.witnesses}</p>}
                  {witnesses.map((w, i) => (
                    <WitnessFormSection
                      key={i}
                      index={i}
                      data={w}
                      onChange={patch => updateWitness(i, patch)}
                      onRemove={() => removeWitness(i)}
                      onLookup={() => doLookup(w.lookupDoc, f => updateWitness(i, f), s => updateWitness(i, { lookupState: s }))}
                      provinces={provinces}
                      errors={witnessErrors[i] || {}}
                    />
                  ))}
                  {childErrors.witnessesInvalid && <p className="text-xs text-rose-600 font-semibold">{childErrors.witnessesInvalid}</p>}
                </div>

              </div>

              {(childErrors.motherAge || childErrors.fatherAge) && (
                <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold space-y-1">
                  {childErrors.motherAge && <p>{childErrors.motherAge}</p>}
                  {childErrors.fatherAge && <p>{childErrors.fatherAge}</p>}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)}
                  className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Voltar</button>
                <button type="button" onClick={goToStep4}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                  Rever Dados →
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 4: Confirmação ──────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">Revisão Final</h2>
              <div className="space-y-3">
                <SummaryBlock title="Criança">
                  <SummaryRow label="Nome" value={childName} />
                  <SummaryRow label="Género" value={childGender === 'MALE' ? 'Masculino' : 'Feminino'} />
                  <SummaryRow label="Nascimento" value={`${childBirthDate} ${childBirthTime}`} />
                  <SummaryRow label="Altura / Peso" value={`${height} cm / ${weight} kg`} />
                  <SummaryRow label="Idade Gestacional" value={`${gestWeeks}s ${gestDays}d`} />
                  <SummaryRow label="Local" value={placeOfBirth} />
                  <SummaryRow label="Unidade" value={unities.find(u => String(u.id) === selectedUnityId)?.name || 'N/D'} />
                </SummaryBlock>
                <SummaryBlock title="Mãe">
                  <SummaryRow label="Nome" value={mother.fullName} />
                  <SummaryRow label="Telefone" value={mother.phoneNumber} />
                  <SummaryRow label="Documento" value={`${mother.docType} ${mother.docNumber}`} />
                  <SummaryRow label="Bairro" value={mother.neighborhoodName} />
                </SummaryBlock>
                {includeFather ? (
                  <SummaryBlock title="Pai">
                    <SummaryRow label="Nome" value={father.fullName} />
                    <SummaryRow label="Telefone" value={father.phoneNumber} />
                    <SummaryRow label="Documento" value={`${father.docType} ${father.docNumber}`} />
                    <SummaryRow label="Bairro" value={father.neighborhoodName} />
                  </SummaryBlock>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    Pai não incluído neste assento.
                  </div>
                )}
                {witnesses.length > 0 && (
                  <SummaryBlock title={`Testemunhas (${witnesses.length})`}>
                    {witnesses.map((w, i) => (
                      <SummaryRow key={i} label={`Testemunha ${i + 1}`} value={`${w.fullName} · ${w.gender === 'MALE' ? 'M' : 'F'}`} />
                    ))}
                  </SummaryBlock>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={loading} onClick={() => setStep(3)}
                  className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Corrigir
                </button>
                <button type="submit" disabled={loading}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors">
                  {loading ? 'A Gravar...' : 'Confirmar e Gravar Assento'}
                </button>
              </div>
            </>
          )}

        </div>
      </form>
    </div>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-slate-800 font-semibold text-right">{value || 'N/D'}</span>
    </div>
  );
}
