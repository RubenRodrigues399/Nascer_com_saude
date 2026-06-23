'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { validateBI } from '@/utils/validators';
import { generateAssentoPDF } from '@/utils/pdfGenerator';
import { logAction } from '@/utils/audit';
import { useAuth } from '@/context/AuthContext';
import { newbornService } from '@/app/services/recem-nascidos';

export default function CreateRecemNascidoPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [maxDateStr, setMaxDateStr] = useState('');
  
  const [formData, setFormData] = useState({
    nomeMae: '', biMae: '', nomePai: '', biPai: '', nomeCrianca: '',
    dataNascimento: '', horaNascimento: '', sexo: '', naturalDe: '',
    municipioId: '', provinciaId: ''  
  });

  const provinces = useLiveQuery(() => db.provinces.orderBy('name').toArray()) || [];
  const municipalities = useLiveQuery(() => db.municipalities.orderBy('name').toArray()) || [];
  const municipiosDisponiveis = municipalities.filter(m => m.provinceId === Number(formData.provinciaId));

  useEffect(() => {
    const hoje = new Date();
    setMaxDateStr(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'provinciaId') setFormData(prev => ({ ...prev, provinciaId: value, municipioId: '' }));
  };

  const handleAvançarPasso1 = () => {
    if (formData.nomeMae.trim().split(' ').length < 2) return setErrors({ nomeMae: "Introduza o nome completo da mãe." });
    if (!validateBI(formData.biMae)) return setErrors({ biMae: "Formato de BI da mãe inválido." });
    setStep(2);
  };

  const handleAvançarPasso2 = () => {
    if (formData.nomePai.trim() && formData.nomePai.trim().split(' ').length < 2) return setErrors({ nomePai: "Introduza o nome completo do pai." });
    if (formData.biPai.trim() && formData.biPai !== 'N/D' && !validateBI(formData.biPai)) return setErrors({ biPai: "Formato de BI do pai inválido." });
    setStep(3);
  };

  const handleAvançarPasso3 = () => {
    if (formData.nomeCrianca.trim().split(' ').length < 2) return setErrors({ nomeCrianca: "Introduza o nome completo da criança." });
    if (!formData.provinciaId || !formData.municipioId) return setErrors({ municipioId: "Campos territoriais obrigatórios." });
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError('');

    const provObj = provinces.find(p => p.id === Number(formData.provinciaId));
    const muniObj = municipalities.find(m => m.id === Number(formData.municipioId));

    const payload = {
      individualChild: {
        fullName: formData.nomeCrianca.trim(),
        gender: formData.sexo === 'M' ? 'MALE' : 'FEMALE',
        identificationNumber: '',
        birthDate: `${formData.dataNascimento}T${formData.horaNascimento || '00:00:00'}`
      },
      height: 50, weight: 3.2, vitalStatus: "ALIVE",
      gestacionalAge: { weeks: 39, days: 0 },
      placeOfBirth: "HOSPITAL", professionalSupport: true, unityId: 1,
      mother: {
        fullName: formData.nomeMae.trim(), phoneNumber: "244900000000",
        identificationDocument: { type: "BI", number: formData.biMae.toUpperCase().trim(), expirationDate: "2034-12-31T00:00:00" },
        birthDate: "1995-01-01T00:00:00", municipalityId: Number(formData.municipioId), neighborhoodName: muniObj ? muniObj.name : "Sede"
      },
      father: formData.nomePai.trim() ? {
        fullName: formData.nomePai.trim(), phoneNumber: "244900000000",
        identificationDocument: { type: "BI", number: formData.biPai.toUpperCase().trim(), expirationDate: "2034-12-31T00:00:00" },
        birthDate: "1995-01-01T00:00:00", municipalityId: Number(formData.municipioId), neighborhoodName: muniObj ? muniObj.name : "Sede"
      } : null,
      witness: []
    };

    let apiSuccess = false;
    try {
      const apiResponse = await newbornService.createChild(payload);
      if (apiResponse.success) apiSuccess = true;
      else setServerError(apiResponse.message);
    } catch (err) { console.warn(err); }

    if (apiSuccess) {
      router.push('/dashboard/recem-nascidos'); // Retorna direto para a lista limpa! 🎉
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6 mt-6 border border-slate-200">
      <button onClick={() => router.push('/dashboard/recem-nascidos')} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase mb-4 block">← Voltar</button>
      
      <h2 className="text-xl font-black text-slate-800 mb-4">Novo Assento de Nascimento</h2>
      
      {serverError && <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border-l-4 border-rose-500 font-semibold">{serverError}</div>}

      {/* OS PASSOS VISUAIS EXATOS DO TEU ANTIGO WIZARD */}
      <div className="flex items-center justify-between mb-8 text-xs font-bold text-slate-400 uppercase select-none">
        <span className={step === 1 ? 'text-blue-600' : ''}>1. Mãe</span><span>➔</span>
        <span className={step === 2 ? 'text-blue-600' : ''}>2. Pai</span><span>➔</span>
        <span className={step === 3 ? 'text-blue-600' : ''}>3. Bebé</span><span>➔</span>
        <span className={step === 4 ? 'text-blue-600' : ''}>4. Confirmar</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo da Mãe</label>
              <input type="text" name="nomeMae" required value={formData.nomeMae} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-slate-800" />
              {errors.nomeMae && <p className="text-rose-600 text-xs mt-1">{errors.nomeMae}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nº do Bilhete da Mãe</label>
              <input type="text" name="biMae" required value={formData.biMae} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg uppercase text-slate-800" maxLength={14} />
              {errors.biMae && <p className="text-rose-600 text-xs mt-1">{errors.biMae}</p>}
            </div>
            <button type="button" onClick={handleAvançarPasso1} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold">Continuar ➔</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Pai (Opcional)</label>
              <input type="text" name="nomePai" value={formData.nomePai} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">BI do Pai (Opcional)</label>
              <input type="text" name="biPai" value={formData.biPai} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg uppercase text-slate-800" maxLength={14} />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-slate-100 py-2.5 rounded-lg text-slate-700">Voltar</button>
              <button type="button" onClick={handleAvançarPasso2} className="w-2/3 bg-blue-600 text-white py-2.5 rounded-lg font-bold">Continuar ➔</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Recém-Naccido</label>
              <input type="text" name="nomeCrianca" required value={formData.nomeCrianca} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" name="dataNascimento" required max={maxDateStr} value={formData.dataNascimento} onChange={handleInputChange} className="px-4 py-2 border rounded-lg text-slate-800" />
              <input type="time" name="horaNascimento" required value={formData.horaNascimento} onChange={handleInputChange} className="px-4 py-2 border rounded-lg text-slate-800" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select name="sexo" required value={formData.sexo} onChange={handleInputChange} className="border p-2 rounded-lg bg-white text-slate-800">
                <option value="">Género...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
              <input type="text" name="naturalDe" placeholder="Maternidade..." required value={formData.naturalDe} onChange={handleInputChange} className="col-span-2 px-4 py-2 border rounded-lg text-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select name="provinciaId" required value={formData.provinciaId} onChange={handleInputChange} className="border p-2 rounded-lg bg-white text-slate-800">
                <option value="">Província...</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="municipioId" required value={formData.municipioId} disabled={!formData.provinciaId} onChange={handleInputChange} className="border p-2 rounded-lg bg-white text-slate-800">
                <option value="">Município...</option>
                {municipiosDisponiveis.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-slate-100 py-2.5 rounded-lg text-slate-700">Voltar</button>
              <button type="button" onClick={handleAvançarPasso3} className="w-2/3 bg-blue-600 text-white py-2.5 rounded-lg font-bold">Rever Dados ➔</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl text-sm space-y-1.5 text-slate-700 border">
              <p><strong>Criança:</strong> {formData.nomeCrianca}</p>
              <p><strong>Mãe:</strong> {formData.nomeMae}</p>
              <p><strong>Pai:</strong> {formData.nomePai || 'Não Declarado'}</p>
            </div>
            <div className="flex gap-4">
              <button type="button" disabled={loading} onClick={() => setStep(3)} className="w-1/3 bg-slate-100 py-2.5 rounded-lg text-slate-700">Corrigir</button>
              <button type="submit" disabled={loading} className="w-2/3 bg-emerald-600 text-white py-2.5 rounded-lg font-bold">
                {loading ? 'A Gravar na API...' : 'Confirmar e Gravar'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}