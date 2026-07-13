'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { newbornService, ChildRecord } from '@/app/services/recem-nascidos';
import { individualsService } from '@/app/services/individuos';
import { locationsService, Province, Municipality, safeNeighborhoodName } from '@/app/services/locations';
import { validateBI, validateFullName, getTodayStr, validateParentBirthDate, isExpiredDate, validatePassportNumber } from '@/utils/validators';
import { AuditSection } from '@/components/DetailsModal';

type LookupState = 'idle' | 'searching' | 'found' | 'not_found' | 'submitting' | 'done';

interface FatherForm {
  fullName: string;
  phoneNumber: string;
  docType: 'BI' | 'PASSAPORT' | 'DNV';
  docNumber: string;
  docExpiry: string;
  birthDate: string;
  municipalityId: string;
  neighborhoodName: string;
}

const emptyFatherForm: FatherForm = {
  fullName: '', phoneNumber: '', docType: 'BI',
  docNumber: '', docExpiry: '', birthDate: '',
  municipalityId: '', neighborhoodName: '',
};

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [child, setChild] = useState<ChildRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Lookup de pai por nº de documento
  const [lookupDocNumber, setLookupDocNumber] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupError, setLookupError] = useState('');
  const [fatherForm, setFatherForm] = useState<FatherForm>(emptyFatherForm);
  const [formErrors, setFormErrors] = useState<Partial<FatherForm>>({});
  const [submitError, setSubmitError] = useState('');

  // Cascata de localização para o formulário do pai
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [loadingMuni, setLoadingMuni] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Usar dados em cache da lista enquanto carrega da API
    try {
      const cached = sessionStorage.getItem('dnirn_child_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id === id) {
          setChild(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // Tentar obter dados frescos da API
    newbornService.getChildById(id)
      .then(res => { if (res.success && res.data) setChild(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    locationsService.getAllProvinces().then(res => {
      if (res.success) {
        const data = res.data as any;
        setProvinces(Array.isArray(data) ? data : (data?.provinces || []));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    setFatherForm(f => ({ ...f, municipalityId: '', neighborhoodName: '' }));
    if (!selectedProvinceId) return;
    setLoadingMuni(true);
    locationsService.getMunicipalitiesByProvince(Number(selectedProvinceId))
      .then(res => {
        if (res.success) {
          const data = res.data as any;
          setMunicipalities(Array.isArray(data) ? data : (data?.municipalities || []));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMuni(false));
  }, [selectedProvinceId]);

  // Pesquisar pai por número de documento de identificação
  const handleLookup = async () => {
    const docNum = lookupDocNumber.trim().toUpperCase();
    if (!docNum) return;
    setLookupState('searching');
    setLookupError('');
    setFatherForm(emptyFatherForm);
    setSelectedProvinceId('');

    try {
      const res = await individualsService.getIndividualByIdNumber(docNum);
      if (res.success && res.data) {
        const ind = res.data as any;
        // A resposta usa typeDocument/identificationNumber/expirationDateDocument
        setFatherForm({
          fullName: ind.fullName || '',
          phoneNumber: ind.phoneNumber || '',
          docType: ind.identificationDocument?.typeDocument || ind.identificationDocument?.type || 'BI',
          docNumber: ind.identificationDocument?.identificationNumber || ind.identificationDocument?.number || docNum,
          docExpiry: (ind.identificationDocument?.expirationDateDocument || ind.identificationDocument?.expirationDate || '').split('T')[0],
          birthDate: (ind.birthDate || '').split('T')[0],
          municipalityId: String(ind.municipality?.id || ind.neighborhood?.municipality?.id || ''),
          neighborhoodName: safeNeighborhoodName(ind.neighborhood?.name),
        });
        setLookupState('found');
      } else {
        setFatherForm({ ...emptyFatherForm, docNumber: docNum });
        setLookupState('not_found');
      }
    } catch {
      setFatherForm({ ...emptyFatherForm, docNumber: docNum });
      setLookupState('not_found');
    }
  };

  const validate = (): boolean => {
    const errs: Partial<FatherForm> = {};
    if (!validateFullName(fatherForm.fullName)) errs.fullName = 'Introduza o nome completo (mínimo 2 nomes, só letras).';
    const phone = fatherForm.phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
    if (!phone) errs.phoneNumber = 'Telefone obrigatório.';
    else if (!/^9\d{8}$/.test(phone)) errs.phoneNumber = 'Formato inválido. 9 dígitos: Ex: 921025087';
    if (!fatherForm.docNumber.trim()) errs.docNumber = 'Número do documento obrigatório.';
    else if (fatherForm.docType === 'BI' && !validateBI(fatherForm.docNumber)) errs.docNumber = 'Formato de BI inválido. Ex: 000123456LA041';
    else if (fatherForm.docType === 'PASSAPORT' && !validatePassportNumber(fatherForm.docNumber)) errs.docNumber = 'Formato de passaporte inválido.';
    if (!fatherForm.docExpiry) errs.docExpiry = 'Data de validade obrigatória.';
    else if (isExpiredDate(fatherForm.docExpiry)) errs.docExpiry = 'Documento expirado. Insira um documento válido.';
    if (!fatherForm.birthDate) {
      errs.birthDate = 'Data de nascimento obrigatória.';
    } else {
      const childBirth = child?.individual?.birthDate?.split('T')[0];
      const ageErr = validateParentBirthDate(fatherForm.birthDate, childBirth || '');
      if (ageErr) errs.birthDate = ageErr;
    }
    if (!fatherForm.municipalityId) errs.municipalityId = 'Município obrigatório.';
    if (!fatherForm.neighborhoodName.trim()) errs.neighborhoodName = 'Bairro obrigatório.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitFather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLookupState('submitting');
    setSubmitError('');

    try {
      const res = await newbornService.addFather({
        childId: id as string,
        father: {
          fullName: fatherForm.fullName.trim(),
          phoneNumber: fatherForm.phoneNumber.trim(),
          identificationDocument: {
            type: fatherForm.docType,
            number: fatherForm.docNumber.toUpperCase().trim(),
            expirationDate: fatherForm.docExpiry,
          },
          birthDate: fatherForm.birthDate,
          municipalityId: Number(fatherForm.municipalityId),
          neighborhoodName: fatherForm.neighborhoodName.trim(),
        },
      });

      if (res.success) {
        setLookupState('done');
        const refreshed = await newbornService.getChildById(id as string);
        if (refreshed.success) setChild(refreshed.data);
      } else {
        setSubmitError(res.message || 'Erro ao adicionar o pai.');
        setLookupState('not_found');
      }
    } catch {
      setSubmitError('Erro de comunicação com o servidor.');
      setLookupState('not_found');
    }
  };

  const resetLookup = () => {
    setLookupState('idle');
    setLookupDocNumber('');
    setFatherForm(emptyFatherForm);
    setSelectedProvinceId('');
    setFormErrors({});
    setSubmitError('');
    setLookupError('');
  };

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">A carregar registo...</div>;
  if (pageError) return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={() => router.back()} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">← Voltar</button>
      <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm rounded-lg font-semibold">{pageError}</div>
    </div>
  );

  // Field paths seguem a resposta real da API: child.individual (não individualChild)
  const childName = child?.individual?.fullName ?? 'N/D';
  const childGender = child?.individual?.gender === 'MALE' ? 'Masculino' : 'Feminino';
  const childBirth = child?.individual?.birthDate?.split('T')[0] ?? 'N/D';
  const childDoc = child?.individual?.identificationDocument?.identificationNumber ?? 'N/D';
  const motherName = child?.mother?.individual?.fullName ?? 'N/D';
  const motherDoc = child?.mother?.individual?.identificationDocument?.identificationNumber ?? 'N/D';
  const fatherName = child?.father?.individual?.fullName ?? null;
  const fatherDoc = child?.father?.individual?.identificationDocument?.identificationNumber ?? 'N/D';
  const unityName = child?.unity?.name ?? 'N/D';
  const vitalLabel = child?.vitalStatus === 'ALIVE' ? 'Vivo' : 'Falecido';
  const hasFather = !!child?.father;
  const criadoEm = child?.individual?.createdAt?.split('T')[0];
  const actualizadoEm = child?.individual?.updatedAt?.split('T')[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-2">

      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => router.push('/dashboard/recem-nascidos')} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">← Voltar à lista</button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assento de Nascimento</p>
            <h1 className="text-2xl font-black text-slate-800">{childName}</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${vitalLabel === 'Vivo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {vitalLabel}
          </span>
        </div>
      </div>

      {/* Dados da Criança */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Dados da Criança</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <InfoField label="Género" value={childGender} />
          <InfoField label="Data de Nascimento" value={childBirth} />
          <InfoField label="Nº de Documento" value={childDoc} />
          <InfoField label="Local de Nascimento" value={child?.placeOfBirth ?? 'N/D'} />
          <InfoField label="Peso" value={child?.weight ? `${child.weight} kg` : 'N/D'} />
          <InfoField label="Altura" value={child?.height ? `${child.height} cm` : 'N/D'} />
          <InfoField label="Idade Gestacional" value={child?.gestacionalAge ? `${child.gestacionalAge.weeks}s ${child.gestacionalAge.days}d` : 'N/D'} />
          <InfoField label="Unidade Hospitalar" value={unityName} />
          <InfoField label="Apoio Profissional" value={child?.professionalSupport ? 'Sim' : 'Não'} />
          {criadoEm && <InfoField label="Criado em" value={criadoEm} />}
          {actualizadoEm && <InfoField label="Actualizado em" value={actualizadoEm} />}
        </div>
        <AuditSection creator={child?.individual?.creator} updater={child?.individual?.updater} />
      </div>

      {/* Dados da Mãe */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Dados da Mãe</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoField label="Nome Completo" value={motherName} />
          <InfoField label="Nº do Documento" value={motherDoc} />
        </div>
      </div>

      {/* Dados do Pai */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Dados do Pai</h2>

        {hasFather ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoField label="Nome Completo" value={fatherName ?? 'N/D'} />
            <InfoField label="Nº do Documento" value={fatherDoc} />
          </div>
        ) : lookupState === 'done' ? (
          <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-sm rounded-lg font-bold">
            Pai adicionado com sucesso ao registo.
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-500 italic">Nenhum pai registado neste assento.</p>

            {/* Pesquisar pai pelo nº de documento */}
            {lookupState === 'idle' && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pesquisar pai pelo nº de documento de identificação</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupDocNumber}
                    onChange={e => { setLookupDocNumber(e.target.value.toUpperCase()); setLookupError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    placeholder="Ex: 003456789LA001"
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  />
                  <button
                    onClick={handleLookup}
                    disabled={!lookupDocNumber.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Pesquisar
                  </button>
                </div>
                {lookupError && <p className="text-xs text-rose-600 font-semibold">{lookupError}</p>}
                <p className="text-[10px] text-slate-400">
                  Se o cidadão já existir no sistema, os dados serão pré-preenchidos automaticamente.
                </p>
              </div>
            )}

            {lookupState === 'searching' && (
              <div className="flex items-center gap-3 text-sm text-slate-400 animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                A pesquisar no sistema...
              </div>
            )}

            {(lookupState === 'found' || lookupState === 'not_found' || lookupState === 'submitting') && (
              <form onSubmit={handleSubmitFather} className="space-y-4">
                {lookupState === 'found' ? (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-800">Cidadão encontrado no sistema</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Dados pré-preenchidos. Verifique e confirme.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-800">Cidadão não encontrado</p>
                      <p className="text-xs text-amber-700 mt-0.5">Preencha os dados abaixo para registar o pai.</p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{submitError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
                    <input type="text" required disabled={lookupState === 'submitting'} value={fatherForm.fullName}
                      onChange={e => setFatherForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.fullName && <p className="text-xs text-rose-600">{formErrors.fullName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefone *</label>
                    <input type="text" required disabled={lookupState === 'submitting'} value={fatherForm.phoneNumber}
                      onChange={e => setFatherForm(f => ({ ...f, phoneNumber: e.target.value }))}
                      placeholder="9XXXXXXXX"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.phoneNumber && <p className="text-xs text-rose-600">{formErrors.phoneNumber}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data de Nascimento *</label>
                    <input type="date" max={getTodayStr()} required disabled={lookupState === 'submitting'} value={fatherForm.birthDate}
                      onChange={e => setFatherForm(f => ({ ...f, birthDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.birthDate && <p className="text-xs text-rose-600">{formErrors.birthDate}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Documento *</label>
                    <select disabled={lookupState === 'submitting'} value={fatherForm.docType}
                      onChange={e => setFatherForm(f => ({ ...f, docType: e.target.value as any }))}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="BI">BI</option>
                      <option value="PASSAPORT">Passaporte</option>
                      <option value="DNV">DNV</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nº do Documento *</label>
                    <input type="text" required disabled={lookupState === 'submitting'} value={fatherForm.docNumber}
                      onChange={e => setFatherForm(f => ({ ...f, docNumber: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.docNumber && <p className="text-xs text-rose-600">{formErrors.docNumber}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Validade do Documento *</label>
                    <input type="date" required disabled={lookupState === 'submitting'} value={fatherForm.docExpiry}
                      onChange={e => setFatherForm(f => ({ ...f, docExpiry: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.docExpiry && <p className="text-xs text-rose-600">{formErrors.docExpiry}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Província</label>
                    <select disabled={lookupState === 'submitting'} value={selectedProvinceId}
                      onChange={e => setSelectedProvinceId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">-- Escolha a Província --</option>
                      {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município *</label>
                    <select required disabled={lookupState === 'submitting' || !selectedProvinceId || loadingMuni}
                      value={fatherForm.municipalityId}
                      onChange={e => setFatherForm(f => ({ ...f, municipalityId: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">{loadingMuni ? 'A carregar...' : '-- Escolha o Município --'}</option>
                      {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {formErrors.municipalityId && <p className="text-xs text-rose-600">{formErrors.municipalityId}</p>}
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro *</label>
                    <input type="text" required disabled={lookupState === 'submitting'} value={fatherForm.neighborhoodName}
                      onChange={e => setFatherForm(f => ({ ...f, neighborhoodName: e.target.value }))}
                      placeholder="Ex: Palanca"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {formErrors.neighborhoodName && <p className="text-xs text-rose-600">{formErrors.neighborhoodName}</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <button type="button" onClick={resetLookup} disabled={lookupState === 'submitting'}
                    className="w-1/3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={lookupState === 'submitting'}
                    className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-colors">
                    {lookupState === 'submitting' ? 'A registar...' : 'Confirmar e Adicionar Pai'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
