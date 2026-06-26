'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { validateBI } from '@/utils/validators';
import { generateAssentoPDF } from '@/utils/pdfGenerator';
import { logAction } from '@/utils/audit';
import { useAuth } from '@/context/AuthContext';
import { newbornService } from '@/app/services/recem-nascidos';

function generateUniqueOfflineId(): string {
  const codigoMaternidade = "MAT-LUC01";
  const anoActual = new Date().getFullYear();
  const sufixoAleatorio = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${codigoMaternidade}-${anoActual}-${sufixoAleatorio}`;
}

export default function BirthForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [ultimoRegistoSalvo, setUltimoRegistoSalvo] = useState<any>(null);
  const [maxDateStr, setMaxDateStr] = useState('');
  
  const [formData, setFormData] = useState({
    nomeMae: '',
    biMae: '',
    nomePai: '',
    biPai: '',
    nomeCrianca: '',
    dataNascimento: '',
    horaNascimento: '',
    sexo: '',
    naturalDe: '',
    municipioId: '', 
    provinciaId: ''  
  });

  const provinces = useLiveQuery(() => db.provinces.orderBy('name').toArray()) || [];
  const municipalities = useLiveQuery(() => db.municipalities.orderBy('name').toArray()) || [];

  const municipiosDisponiveis = municipalities.filter(
    m => m.provinceId === Number(formData.provinciaId)
  );

  useEffect(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    setMaxDateStr(`${ano}-${mes}-${dia}`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'provinciaId') {
      setFormData(prev => ({ ...prev, provinciaId: value, municipioId: '' }));
    }
  };

  const handleAvançarPasso1 = () => {
    const localErrors: { [key: string]: string } = {};
    if (formData.nomeMae.trim().split(' ').length < 2) {
      localErrors.nomeMae = "Introduza o nome completo da mãe (mínimo nome e sobrenome).";
    }
    if (!validateBI(formData.biMae)) {
      localErrors.biMae = "Formato de BI da mãe inválido.";
    }

    if (Object.keys(localErrors).length > 0) setErrors(localErrors);
    else setStep(2);
  };

  const handleAvançarPasso2 = () => {
    const localErrors: { [key: string]: string } = {};
    if (formData.nomePai.trim() && formData.nomePai.trim().split(' ').length < 2) {
      localErrors.nomePai = "Se declarado, introduza o nome completo do pai.";
    }
    if (formData.biPai.trim() && formData.biPai !== 'N/D' && !validateBI(formData.biPai)) {
      localErrors.biPai = "Formato de BI do pai inválido.";
    }

    if (Object.keys(localErrors).length > 0) setErrors(localErrors);
    else setStep(3);
  };

  const handleAvançarPasso3 = () => {
    const localErrors: { [key: string]: string } = {};
    const dataIntroduzida = new Date(`${formData.dataNascimento}T${formData.horaNascimento || '00:00'}`);
    const agora = new Date();

    if (formData.nomeCrianca.trim().split(' ').length < 2) {
      localErrors.nomeCrianca = "Introduza o nome completo da criança.";
    }
    if (dataIntroduzida > agora) {
      localErrors.dataNascimento = "A data e hora de nascimento não podem ser futuras.";
    }
    if (!formData.provinciaId) localErrors.provinciaId = "Selecione a província.";
    if (!formData.municipioId) localErrors.municipioId = "Selecione o município.";
    if (!formData.naturalDe.trim()) localErrors.naturalDe = "Introduza a unidade sanitária.";

    if (Object.keys(localErrors).length > 0) setErrors(localErrors);
    else setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError('');

    const provObj = provinces.find(p => p.id === Number(formData.provinciaId));
    const muniObj = municipalities.find(m => m.id === Number(formData.municipioId));

    // Formatações de data estritas conforme o Swagger recebido
    const childBirthDate = `${formData.dataNascimento}T${formData.horaNascimento || '00:00:00'}`;
    const defaultPastDate = "1995-01-01T00:00:00"; // Data padrão limpa para os pais se o back exigir string formato completo

    // MAPEAR EXATAMENTE O PAYLOAD EXIGIDO DO SWAGGER
    const payload = {
      individualChild: {
        fullName: formData.nomeCrianca.trim(),
        gender: formData.sexo === 'M' ? 'MALE' : 'FEMALE',
        identificationNumber: '',
        birthDate: childBirthDate
      },
      height: 50, // Padrões de recém-nascido
      weight: 3.2,
      vitalStatus: "ALIVE",
      gestacionalAge: {
        weeks: 39,
        days: 0
      },
      placeOfBirth: "HOSPITAL",
      professionalSupport: true,
      unityId: 1, // Puxa idUnity associado por padrão
      mother: {
        fullName: formData.nomeMae.trim(),
        phoneNumber: "244900000000",
        identificationDocument: {
          type: "BI",
          number: formData.biMae.toUpperCase().trim(),
          expirationDate: "2034-12-31T00:00:00"
        },
        birthDate: defaultPastDate,
        municipalityId: Number(formData.municipioId),
        neighborhoodName: muniObj ? muniObj.name : "Desconhecido"
      },
      father: formData.nomePai.trim() ? {
        fullName: formData.nomePai.trim(),
        phoneNumber: "244900000000",
        identificationDocument: {
          type: "BI",
          number: formData.biPai.toUpperCase().trim(),
          expirationDate: "2034-12-31T00:00:00"
        },
        birthDate: defaultPastDate,
        municipalityId: Number(formData.municipioId),
        neighborhoodName: muniObj ? muniObj.name : "Desconhecido"
      } : null,
      witness: []
    };

    let apiSuccess = false;

    try {
      // Tenta enviar para a API
      const apiResponse = await newbornService.createChild(payload);
      if (apiResponse.success) {
        apiSuccess = true;
      } else {
        setServerError(apiResponse.message || 'Erro ao sincronizar com o servidor remoto.');
      }
    } catch (err) {
      console.warn("API Offline, mantendo gravação em cache local Dexie:", err);
    }

    // Gravação offline resiliente de segurança
    const novoRegisto = {
      id: generateUniqueOfflineId(),
      nomeMae: formData.nomeMae.trim(),
      biMae: formData.biMae.toUpperCase().trim(),
      nomePai: formData.nomePai.trim() || 'Não Declarado',
      biPai: formData.biPai ? formData.biPai.toUpperCase().trim() : 'N/D',
      nomeCrianca: formData.nomeCrianca.trim(),
      dataNascimento: formData.dataNascimento,
      horaNascimento: formData.horaNascimento,
      sexo: formData.sexo,
      naturalDe: formData.naturalDe.trim(),
      municipio: muniObj ? muniObj.name : 'Desconhecido',
      provincia: provObj ? provObj.name : 'Desconhecido',
      status: apiSuccess ? 'sincronizado' as const : 'pendente' as const,
      createdAt: Date.now()
    };

    try {
      await db.records.add(novoRegisto);
      
      if (logAction) {
        await logAction(
          'Registo de Nascimento', 
          `Criou o registo ID: ${novoRegisto.id} (${apiSuccess ? 'API Direto' : 'Offline-First'})`,
          user?.fullName,
          user?.roleProfessional
        );
      }
      
      setUltimoRegistoSalvo(novoRegisto);
      setSuccessMessage(apiSuccess 
        ? `Registo de ${formData.nomeCrianca} guardado com sucesso na rede DNIRN!` 
        : `Registo de ${formData.nomeCrianca} guardado localmente (Pendente Sincronização).`
      );
      
      setFormData({ 
        nomeMae: '', biMae: '', nomePai: '', biPai: '', nomeCrianca: '', 
        dataNascimento: '', horaNascimento: '', sexo: '', naturalDe: '', 
        municipioId: '', provinciaId: '' 
      });
      setStep(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const provSelecionadaNome = provinces.find(p => p.id === Number(formData.provinciaId))?.name || '';
  const muniSelecionadoNome = municipalities.find(m => m.id === Number(formData.municipioId))?.name || '';

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6 mt-6 border border-slate-200">
      
      {serverError && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-900 text-xs rounded-lg font-semibold border-l-4 border-amber-500 break-words">
          Aviso do Servidor: {serverError}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded flex flex-col gap-2">
          <p className="font-bold">✓ Registo Blindado com Sucesso</p>
          <p className="text-sm">{successMessage}</p>
          {ultimoRegistoSalvo && (
            <button
              type="button"
              onClick={() => generateAssentoPDF(ultimoRegistoSalvo)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded w-fit transition-colors"
            >
              Imprimir Assento de Nascimento (PDF)
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-8 text-xs font-bold text-slate-400 uppercase select-none">
        <span className={step === 1 ? 'text-blue-600' : ''}>1. Mãe</span>
        <span>➔</span>
        <span className={step === 2 ? 'text-blue-600' : ''}>2. Pai</span>
        <span>➔</span>
        <span className={step === 3 ? 'text-blue-600' : ''}>3. Bebé & Local</span>
        <span>➔</span>
        <span className={step === 4 ? 'text-blue-600' : ''}>4. Confirmar</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo da Mãe</label>
              <input type="text" name="nomeMae" required value={formData.nomeMae} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.nomeMae ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} placeholder="Ex: Maria António Nzuzi" />
              {errors.nomeMae && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.nomeMae}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nº do Bilhete de Identidade (Mãe)</label>
              <input type="text" name="biMae" required value={formData.biMae} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg uppercase focus:outline-none focus:ring-2 ${errors.biMae ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} placeholder="Ex: 000123456LA041" maxLength={14} />
              {errors.biMae && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.biMae}</p>}
            </div>
            <button type="button" onClick={handleAvançarPasso1} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">Continuar ➔</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo do Pai (Opcional)</label>
              <input type="text" name="nomePai" value={formData.nomePai} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.nomePai ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} placeholder="Deixe em branco se não declarado" />
              {errors.nomePai && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.nomePai}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nº do Bilhete de Identidade (Pai - Opcional)</label>
              <input type="text" name="biPai" value={formData.biPai} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg uppercase focus:outline-none focus:ring-2 ${errors.biPai ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} placeholder="Ex: 000654321BO042" maxLength={14} />
              {errors.biPai && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.biPai}</p>}
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-slate-100 border border-slate-300 py-2.5 rounded-lg text-sm font-medium text-slate-700">Voltar</button>
              <button type="button" onClick={handleAvançarPasso2} className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">Continuar ➔</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Recém-Nascido</label>
              <input type="text" name="nomeCrianca" required value={formData.nomeCrianca} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.nomeCrianca ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} placeholder="Ex: Manuel António" />
              {errors.nomeCrianca && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.nomeCrianca}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data de Nascimento</label>
                <input type="date" name="dataNascimento" required max={maxDateStr} value={formData.dataNascimento} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.dataNascimento ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-500'} text-slate-800`} />
                {errors.dataNascimento && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.dataNascimento}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hora exata</label>
                <input type="time" name="horaNascimento" required value={formData.horaNascimento} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Género</label>
                <select name="sexo" required value={formData.sexo} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800">
                  <option value="">Escolha...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Natural de (Unidade Sanitária)</label>
                <input type="text" name="naturalDe" required value={formData.naturalDe} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800" placeholder="Ex: Maternidade Lucrécia Paim" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Província</label>
                <select name="provinciaId" required value={formData.provinciaId} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800">
                  <option value="">Selecione a província...</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.provinciaId && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.provinciaId}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Município</label>
                <select name="municipioId" required value={formData.municipioId} disabled={!formData.provinciaId} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 text-slate-800">
                  <option value="">Selecione o município...</option>
                  {municipiosDisponiveis.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {errors.municipioId && <p className="text-rose-600 text-xs mt-1 font-medium">{errors.municipioId}</p>}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-slate-100 border border-slate-300 py-2.5 rounded-lg text-sm font-medium text-slate-700">Voltar</button>
              <button type="button" onClick={handleAvançarPasso3} className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors">Rever Dados ➔</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-1.5 text-slate-700 shadow-inner">
              <p><strong>Criança:</strong> {formData.nomeCrianca} ({formData.sexo === 'M' ? 'Masculino' : 'Feminino'})</p>
              <p><strong>Nascimento:</strong> {formData.dataNascimento} às {formData.horaNascimento}</p>
              <p><strong>Naturalidade:</strong> {formData.naturalDe}, Município de {muniSelecionadoNome}, Província de {provSelecionadaNome}</p>
              <hr className="my-2 border-slate-200" />
              <p><strong>Mãe:</strong> {formData.nomeMae} (BI: {formData.biMae.toUpperCase()})</p>
              <p><strong>Pai:</strong> {formData.nomePai || 'Não Declarado'} (BI: {formData.biPai || 'N/D'})</p>
            </div>
            <div className="flex gap-4">
              <button type="button" disabled={loading} onClick={() => setStep(3)} className="w-1/3 bg-slate-100 border border-slate-300 py-2.5 rounded-lg text-sm font-medium text-slate-700">Corrigir</button>
              <button type="submit" disabled={loading} className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:bg-slate-300">
                {loading ? 'A Enviar à API...' : 'Guardar Registo Civil'}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}