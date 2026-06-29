'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { newbornService, CreateChildDto, ParentInput } from '@/app/services/recem-nascidos';
import { individualsService } from '@/app/services/individuos';
import { locationsService, Province, Municipality } from '@/app/services/locations';
import { unityService, UnityRecord } from '@/app/services/unidades';

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

const emptyParent = (): ParentFormData => ({
  fullName: '', phoneNumber: '', docType: 'BI',
  docNumber: '', docExpiry: '', birthDate: '',
  provinceId: '', municipalityId: '', neighborhoodName: '',
});

const validateParent = (p: ParentFormData): Partial<Record<keyof ParentFormData, string>> => {
  const e: Partial<Record<keyof ParentFormData, string>> = {};
  if (p.fullName.trim().split(' ').length < 2) e.fullName = 'Introduza o nome completo.';
  if (!p.phoneNumber.trim()) e.phoneNumber = 'Telefone obrigatório.';
  if (!p.docNumber.trim()) e.docNumber = 'Número do documento obrigatório.';
  if (!p.docExpiry) e.docExpiry = 'Validade do documento obrigatória.';
  if (!p.birthDate) e.birthDate = 'Data de nascimento obrigatória.';
  if (!p.municipalityId) e.municipalityId = 'Município obrigatório.';
  if (!p.neighborhoodName.trim()) e.neighborhoodName = 'Bairro obrigatório.';
  return e;
};

const toParentInput = (p: ParentFormData): ParentInput => ({
  fullName: p.fullName.trim(),
  phoneNumber: p.phoneNumber.trim(),
  identificationDocument: { type: p.docType, number: p.docNumber.toUpperCase().trim(), expirationDate: p.docExpiry },
  birthDate: p.birthDate,
  municipalityId: Number(p.municipalityId),
  neighborhoodName: p.neighborhoodName.trim(),
});

// ─── Componente interno: formulário de progenitor ────────────────────────────
interface ParentFormProps {
  label: string;
  lookupDoc: string;
  onLookupDocChange: (v: string) => void;
  lookupState: LookupState;
  onLookup: () => void;
  onReset: () => void;
  form: ParentFormData;
  onChange: (patch: Partial<ParentFormData>) => void;
  errors: Partial<Record<keyof ParentFormData, string>>;
  provinces: Province[];
  municipalities: Municipality[];
  loadingMunis: boolean;
}

function ParentForm({
  label, lookupDoc, onLookupDocChange, lookupState, onLookup, onReset,
  form, onChange, errors, provinces, municipalities, loadingMunis,
}: ParentFormProps) {
  const isSearching = lookupState === 'searching';
  const showForm = lookupState === 'found' || lookupState === 'not_found';

  return (
    <div className="space-y-4">
      {/* Pesquisa */}
      <div className="space-y-2">
        <p className="text-xs font-black text-slate-600 uppercase tracking-wide">
          Pesquisar {label} pelo nº de documento de identificação
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupDoc}
            onChange={e => onLookupDocChange(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && !isSearching && lookupDoc.trim() && onLookup()}
            placeholder="Ex: 003456789LA001"
            disabled={isSearching || showForm}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase disabled:bg-slate-50"
          />
          {showForm ? (
            <button type="button" onClick={onReset}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">
              Limpar
            </button>
          ) : (
            <button type="button" onClick={onLookup}
              disabled={!lookupDoc.trim() || isSearching}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors">
              {isSearching ? 'A pesquisar...' : 'Pesquisar'}
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400">
          Se o cidadão já existir no sistema, os dados serão pré-preenchidos automaticamente.
        </p>
      </div>

      {lookupState === 'found' && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xs font-bold text-emerald-800">Cidadão encontrado — dados pré-preenchidos. Verifique e confirme.</p>
        </div>
      )}
      {lookupState === 'not_found' && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <p className="text-xs font-bold text-amber-800">Cidadão não encontrado — preencha os dados abaixo.</p>
        </div>
      )}

      {showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
            <input type="text" required value={form.fullName}
              onChange={e => onChange({ fullName: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefone *</label>
            <input type="text" required value={form.phoneNumber}
              onChange={e => onChange({ phoneNumber: e.target.value })}
              placeholder="9XXXXXXXX"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.phoneNumber && <p className="text-xs text-rose-600">{errors.phoneNumber}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento *</label>
            <input type="date" required value={form.birthDate}
              onChange={e => onChange({ birthDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.birthDate && <p className="text-xs text-rose-600">{errors.birthDate}</p>}
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
            <input type="text" required value={form.docNumber}
              onChange={e => onChange({ docNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.docNumber && <p className="text-xs text-rose-600">{errors.docNumber}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Validade do Documento *</label>
            <input type="date" required value={form.docExpiry}
              onChange={e => onChange({ docExpiry: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.docExpiry && <p className="text-xs text-rose-600">{errors.docExpiry}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Província</label>
            <select value={form.provinceId} onChange={e => onChange({ provinceId: e.target.value, municipalityId: '' })}
              className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">-- Escolha a Província --</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município *</label>
            <select required value={form.municipalityId} disabled={!form.provinceId || loadingMunis}
              onChange={e => onChange({ municipalityId: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">{loadingMunis ? 'A carregar...' : '-- Escolha o Município --'}</option>
              {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.municipalityId && <p className="text-xs text-rose-600">{errors.municipalityId}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro *</label>
            <input type="text" required value={form.neighborhoodName}
              onChange={e => onChange({ neighborhoodName: e.target.value })}
              placeholder="Ex: Palanca"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {errors.neighborhoodName && <p className="text-xs text-rose-600">{errors.neighborhoodName}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CreateChildPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Localização partilhada (provinces carregadas uma vez)
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Unidades
  const [unities, setUnities] = useState<UnityRecord[]>([]);

  // ── Mãe
  const [motherLookupDoc, setMotherLookupDoc] = useState('');
  const [motherLookupState, setMotherLookupState] = useState<LookupState>('idle');
  const [mother, setMother] = useState<ParentFormData>(emptyParent());
  const [motherErrors, setMotherErrors] = useState<Partial<Record<keyof ParentFormData, string>>>({});
  const [motherMunis, setMotherMunis] = useState<Municipality[]>([]);
  const [loadingMotherMunis, setLoadingMotherMunis] = useState(false);

  // ── Pai (opcional)
  const [includeFather, setIncludeFather] = useState(false);
  const [fatherLookupDoc, setFatherLookupDoc] = useState('');
  const [fatherLookupState, setFatherLookupState] = useState<LookupState>('idle');
  const [father, setFather] = useState<ParentFormData>(emptyParent());
  const [fatherErrors, setFatherErrors] = useState<Partial<Record<keyof ParentFormData, string>>>({});
  const [fatherMunis, setFatherMunis] = useState<Municipality[]>([]);
  const [loadingFatherMunis, setLoadingFatherMunis] = useState(false);

  // ── Criança
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [childBirthDate, setChildBirthDate] = useState('');
  const [childBirthTime, setChildBirthTime] = useState('00:00');
  const [childDocNumber, setChildDocNumber] = useState('');
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

  // Carregar províncias e unidades uma única vez
  useEffect(() => {
    locationsService.getAllProvinces().then(res => {
      if (res.success) {
        const data = res.data as any;
        setProvinces(Array.isArray(data) ? data : (data?.provinces || []));
      }
    }).catch(() => {});
    unityService.getAllUnities().then(res => {
      if (res.success && Array.isArray(res.data)) setUnities(res.data);
    }).catch(() => {});
  }, []);

  // Municípios da mãe
  useEffect(() => {
    setMotherMunis([]);
    if (!mother.provinceId) return;
    setLoadingMotherMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(mother.provinceId))
      .then(res => {
        if (res.success) {
          const data = res.data as any;
          setMotherMunis(Array.isArray(data) ? data : (data?.municipalities || []));
        }
      }).catch(() => {}).finally(() => setLoadingMotherMunis(false));
  }, [mother.provinceId]);

  // Municípios do pai
  useEffect(() => {
    setFatherMunis([]);
    if (!father.provinceId) return;
    setLoadingFatherMunis(true);
    locationsService.getMunicipalitiesByProvince(Number(father.provinceId))
      .then(res => {
        if (res.success) {
          const data = res.data as any;
          setFatherMunis(Array.isArray(data) ? data : (data?.municipalities || []));
        }
      }).catch(() => {}).finally(() => setLoadingFatherMunis(false));
  }, [father.provinceId]);

  // ── Lookup de indivíduo por nº de documento
  const doLookup = async (
    docNum: string,
    setForm: (f: ParentFormData) => void,
    setState: (s: LookupState) => void,
  ) => {
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
          neighborhoodName: ind.neighborhood?.name || '',
        });
        setState('found');
      } else {
        setForm({ ...emptyParent(), docNumber: doc });
        setState('not_found');
      }
    } catch {
      setForm({ ...emptyParent(), docNumber: doc });
      setState('not_found');
    }
  };

  // ── Navegação entre passos
  const goToStep2 = () => {
    if (motherLookupState === 'idle') {
      setMotherErrors({ fullName: 'Pesquise o documento da mãe primeiro.' });
      return;
    }
    const errs = validateParent(mother);
    setMotherErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  const goToStep3 = () => {
    if (includeFather) {
      if (fatherLookupState === 'idle') {
        setFatherErrors({ fullName: 'Pesquise o documento do pai primeiro.' });
        return;
      }
      const errs = validateParent(father);
      setFatherErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }
    setStep(3);
  };

  const goToStep4 = () => {
    const errs: { [k: string]: string } = {};
    if (childName.trim().split(' ').length < 2) errs.childName = 'Introduza o nome completo da criança.';
    if (!childBirthDate) errs.childBirthDate = 'Data de nascimento obrigatória.';
    if (!height || isNaN(Number(height)) || Number(height) <= 0) errs.height = 'Altura inválida.';
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) errs.weight = 'Peso inválido.';
    if (!gestWeeks || isNaN(Number(gestWeeks))) errs.gestWeeks = 'Semanas gestacionais obrigatórias.';
    if (!selectedUnityId) errs.selectedUnityId = 'Unidade hospitalar obrigatória.';
    if (vitalStatus === 'DECEASED' && !deathDate) errs.deathDate = 'Data de óbito obrigatória.';
    setChildErrors(errs);
    if (Object.keys(errs).length === 0) setStep(4);
  };

  // ── Submissão final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError('');

<<<<<<< HEAD
    const payload: CreateChildDto = {
=======
    const muniObj = municipalities.find(m => Number(m.id) === Number(formData.municipioId));

    // payload exatamente com as chaves do Swagger
    const payload: any = {
>>>>>>> 1822ed3e77f82bd508d871208e17e760aaa44242
      individualChild: {
        fullName: childName.trim(),
        gender: childGender,
        identificationNumber: childDocNumber.trim(),
        birthDate: `${childBirthDate}T${childBirthTime}:00`,
      },
<<<<<<< HEAD
      height: Number(height),
      weight: Number(weight),
      vitalStatus,
      deathDate: vitalStatus === 'DECEASED' ? deathDate : undefined,
      gestacionalAge: { weeks: Number(gestWeeks), days: Number(gestDays || 0) },
      placeOfBirth,
      professionalSupport,
      unityId: Number(selectedUnityId),
      mother: toParentInput(mother),
      father: includeFather ? toParentInput(father) : null,
      witness: [],
=======
      height: 50,
      weight: 3.4,
      vitalStatus: "ALIVE",
      gestacionalAge: {
        weeks: 39,
        days: 0
      },
      placeOfBirth: "HOSPITAL",
      professionalSupport: true, 
      unityId: Number(formData.unityId),
      mother: {
        fullName: formData.nomeMae.trim(),
        phoneNumber: "244900000000",
        identificationDocument: {
          type: "BI",
          number: formData.biMae.toUpperCase().trim(),
          expirationDate: "2035-12-31" // Formato curto YYYY-MM-DD
        },
        birthDate: "1998-05-20", 
        municipalityId: Number(formData.municipioId),
        neighborhoodName: muniObj ? muniObj.name : "Sede"
      },
      father: formData.nomePai.trim() ? {
        fullName: formData.nomePai.trim(),
        phoneNumber: "244900000000",
        identificationDocument: {
          type: "BI",
          number: formData.biPai.toUpperCase().trim(),
          expirationDate: "2035-12-31"
        },
        birthDate: "1995-01-01",
        municipalityId: Number(formData.municipioId),
        neighborhoodName: muniObj ? muniObj.name : "Sede"
      } : null, 
      witness: []
>>>>>>> 1822ed3e77f82bd508d871208e17e760aaa44242
    };

    try {
      const res = await newbornService.createChild(payload);
      if (res.success) {
        router.push('/dashboard/recem-nascidos');
      } else {
        setServerError(res.message || 'Erro ao comunicar com a API.');
        setStep(4);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setServerError(Array.isArray(msg) ? msg.join(', ') : msg);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['1. Mãe', '2. Pai', '3. Bebé', '4. Confirmar'];

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2">

      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => router.push('/dashboard/recem-nascidos')}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">
          ← Voltar à lista
        </button>
        <h1 className="text-xl font-black text-slate-800">Novo Assento de Nascimento</h1>

        {/* Indicador de passo */}
        <div className="flex items-center gap-1 mt-4">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <React.Fragment key={n}>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {done ? '✓' : n}. {label.split('. ')[1]}
                </div>
                {i < 3 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {serverError && (
        <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold break-words">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">

          {/* ── PASSO 1: Dados da Mãe ──────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Dados da Mãe</h2>
              <ParentForm
                label="a mãe"
                lookupDoc={motherLookupDoc}
                onLookupDocChange={v => { setMotherLookupDoc(v); setMotherErrors({}); }}
                lookupState={motherLookupState}
                onLookup={() => doLookup(motherLookupDoc, setMother, setMotherLookupState)}
                onReset={() => { setMotherLookupState('idle'); setMotherLookupDoc(''); setMother(emptyParent()); setMotherErrors({}); }}
                form={mother}
                onChange={patch => setMother(m => ({ ...m, ...patch }))}
                errors={motherErrors}
                provinces={provinces}
                municipalities={motherMunis}
                loadingMunis={loadingMotherMunis}
              />
              {motherErrors.fullName && motherLookupState === 'idle' && (
                <p className="text-xs text-rose-600 font-semibold">{motherErrors.fullName}</p>
              )}
              <button type="button" onClick={goToStep2}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                Continuar: Dados do Pai →
              </button>
            </>
          )}

          {/* ── PASSO 2: Dados do Pai ──────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Dados do Pai</h2>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <button type="button"
                  onClick={() => { setIncludeFather(!includeFather); setFatherLookupState('idle'); setFather(emptyParent()); setFatherErrors({}); setFatherLookupDoc(''); }}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${includeFather ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeFather ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-600 font-medium">
                  {includeFather ? 'Registar o pai neste assento' : 'Pai não registado neste assento (opcional)'}
                </span>
              </div>

              {includeFather && (
                <ParentForm
                  label="o pai"
                  lookupDoc={fatherLookupDoc}
                  onLookupDocChange={v => { setFatherLookupDoc(v); setFatherErrors({}); }}
                  lookupState={fatherLookupState}
                  onLookup={() => doLookup(fatherLookupDoc, setFather, setFatherLookupState)}
                  onReset={() => { setFatherLookupState('idle'); setFatherLookupDoc(''); setFather(emptyParent()); setFatherErrors({}); }}
                  form={father}
                  onChange={patch => setFather(f => ({ ...f, ...patch }))}
                  errors={fatherErrors}
                  provinces={provinces}
                  municipalities={fatherMunis}
                  loadingMunis={loadingFatherMunis}
                />
              )}
              {fatherErrors.fullName && fatherLookupState === 'idle' && includeFather && (
                <p className="text-xs text-rose-600 font-semibold">{fatherErrors.fullName}</p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Voltar
                </button>
                <button type="button" onClick={goToStep3}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                  Continuar: Dados do Bebé →
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 3: Dados da Criança ──────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Dados do Recém-Nascido</h2>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo da Criança *</label>
                  <input type="text" required value={childName} onChange={e => { setChildName(e.target.value); setChildErrors(errs => ({ ...errs, childName: '' })); }}
                    placeholder="Ex: Maria José da Silva"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  {childErrors.childName && <p className="text-xs text-rose-600">{childErrors.childName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Género *</label>
                    <select value={childGender} onChange={e => setChildGender(e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="MALE">Masculino</option>
                      <option value="FEMALE">Feminino</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nº de Documento (opcional)</label>
                    <input type="text" value={childDocNumber} onChange={e => setChildDocNumber(e.target.value.toUpperCase())}
                      placeholder="Pode ficar em branco"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento *</label>
                    <input type="date" required max={today} value={childBirthDate}
                      onChange={e => { setChildBirthDate(e.target.value); setChildErrors(errs => ({ ...errs, childBirthDate: '' })); }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.childBirthDate && <p className="text-xs text-rose-600">{childErrors.childBirthDate}</p>}
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
                    <input type="number" required min="1" max="100" step="0.1" value={height}
                      onChange={e => { setHeight(e.target.value); setChildErrors(errs => ({ ...errs, height: '' })); }}
                      placeholder="Ex: 50"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.height && <p className="text-xs text-rose-600">{childErrors.height}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peso (kg) *</label>
                    <input type="number" required min="0.1" max="20" step="0.01" value={weight}
                      onChange={e => { setWeight(e.target.value); setChildErrors(errs => ({ ...errs, weight: '' })); }}
                      placeholder="Ex: 3.4"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.weight && <p className="text-xs text-rose-600">{childErrors.weight}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semanas Gestacionais *</label>
                    <input type="number" required min="20" max="45" value={gestWeeks}
                      onChange={e => { setGestWeeks(e.target.value); setChildErrors(errs => ({ ...errs, gestWeeks: '' })); }}
                      placeholder="Ex: 39"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.gestWeeks && <p className="text-xs text-rose-600">{childErrors.gestWeeks}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dias Adicionais</label>
                    <input type="number" min="0" max="6" value={gestDays}
                      onChange={e => setGestDays(e.target.value)}
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
                    <input type="date" required value={deathDate} max={today}
                      onChange={e => { setDeathDate(e.target.value); setChildErrors(errs => ({ ...errs, deathDate: '' })); }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {childErrors.deathDate && <p className="text-xs text-rose-600">{childErrors.deathDate}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unidade Hospitalar *</label>
                  <select required value={selectedUnityId}
                    onChange={e => { setSelectedUnityId(e.target.value); setChildErrors(errs => ({ ...errs, selectedUnityId: '' })); }}
                    disabled={unities.length === 0}
                    className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">{unities.length === 0 ? 'A carregar unidades...' : '-- Selecione a Unidade --'}</option>
                    {unities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  {childErrors.selectedUnityId && <p className="text-xs text-rose-600">{childErrors.selectedUnityId}</p>}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <button type="button"
                    onClick={() => setProfessionalSupport(!professionalSupport)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${professionalSupport ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${professionalSupport ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-600 font-medium">
                    {professionalSupport ? 'Nascimento assistido por profissional de saúde' : 'Sem assistência profissional'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)}
                  className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Voltar
                </button>
                <button type="button" onClick={goToStep4}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors">
                  Rever Dados →
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 4: Revisão e Confirmação ────────────────────────────────── */}
          {step === 4 && (
            <>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Revisão Final</h2>

              <div className="space-y-3 text-sm">
                <SummaryBlock title="Criança">
                  <SummaryRow label="Nome" value={childName} />
                  <SummaryRow label="Género" value={childGender === 'MALE' ? 'Masculino' : 'Feminino'} />
                  <SummaryRow label="Data de Nascimento" value={`${childBirthDate} ${childBirthTime}`} />
                  <SummaryRow label="Altura / Peso" value={`${height} cm / ${weight} kg`} />
                  <SummaryRow label="Idade Gestacional" value={`${gestWeeks}s ${gestDays}d`} />
                  <SummaryRow label="Local" value={placeOfBirth} />
                  <SummaryRow label="Estado" value={vitalStatus === 'ALIVE' ? 'Vivo' : 'Falecido'} />
                  <SummaryRow label="Unidade" value={unities.find(u => String(u.id) === selectedUnityId)?.name || 'N/D'} />
                </SummaryBlock>

                <SummaryBlock title="Mãe">
                  <SummaryRow label="Nome" value={mother.fullName} />
                  <SummaryRow label="Telefone" value={mother.phoneNumber} />
                  <SummaryRow label="Documento" value={`${mother.docType} ${mother.docNumber}`} />
                  <SummaryRow label="Nascimento" value={mother.birthDate} />
                </SummaryBlock>

                {includeFather ? (
                  <SummaryBlock title="Pai">
                    <SummaryRow label="Nome" value={father.fullName} />
                    <SummaryRow label="Telefone" value={father.phoneNumber} />
                    <SummaryRow label="Documento" value={`${father.docType} ${father.docNumber}`} />
                    <SummaryRow label="Nascimento" value={father.birthDate} />
                  </SummaryBlock>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    Pai não registado neste assento.
                  </div>
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
