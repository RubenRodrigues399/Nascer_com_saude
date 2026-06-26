'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService } from '@/app/services/profissionais';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';

export default function CreateProfessionalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados dos inputs do formulário
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [biNumber, setBiNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [birthDate, setBirthDate] = useState(''); 
  const [role, setRole] = useState<'TECHNICAL' | 'ADMINISTRATIVE_SUPER' | 'ADMINISTRATIVE'>('TECHNICAL');

  // Estados da Cascata Territorial Hidratada
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);

  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedMuniId, setSelectedMuniId] = useState('');
  const [selectedBairroId, setSelectedBairroId] = useState('');

  // Carrega as Províncias iniciais
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await locationsService.getAllProvinces();
        if (response.success) {
          const payload = response.data as any;
          setProvinces(Array.isArray(payload) ? payload : (payload.provinces || []));
        }
      } catch (err) {
        console.error('Erro ao carregar províncias:', err);
      }
    };
    loadProvinces();
  }, []);

  // Cascata: Província -> Município
  useEffect(() => {
    setMunicipalities([]);
    setBairros([]);
    setSelectedMuniId('');
    setSelectedBairroId('');
    if (!selectedProvId) return;

    const loadMuni = async () => {
      try {
        const response = await locationsService.getMunicipalitiesByProvince(Number(selectedProvId));
        if (response.success) {
          const payload = response.data as any;
          setMunicipalities(Array.isArray(payload) ? payload : (payload.municipalities || []));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadMuni();
  }, [selectedProvId]);

  // Cascata: Município -> Bairro
  useEffect(() => {
    setBairros([]);
    setSelectedBairroId('');
    if (!selectedMuniId) return;

    const loadBairros = async () => {
      try {
        const response = await locationsService.getBairrosByMunicipality(Number(selectedMuniId));
        if (response.success) {
          const payload = response.data as any;
          setBairros(Array.isArray(payload) ? payload : (payload.neighborhoods || payload.bairros || []));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadBairros();
  }, [selectedMuniId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!selectedBairroId || !birthDate || !selectedMuniId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    const bairroSelecionado = bairros.find(b => b.id === Number(selectedBairroId));

    // PAYLOAD IDENTICO AO QUE PASSOU NO SWAGGER
    const payload = {
      roleProfessional: role,
      idUnity: 1, 
      phoneNumber: phoneNumber.trim(),
      municipalityId: Number(selectedMuniId),
      individual: {
        fullName: fullName.trim(),
        gender: gender, 
        birthDate: birthDate, // "AAAA-MM-DD" puro
        role: "PROFESSIONAL",
        municipalityId: Number(selectedMuniId),
        neighborhoodName: bairroSelecionado ? bairroSelecionado.name : "Desconhecido",
        identificationDocument: {
          type: 'BI',
          number: biNumber.trim().toUpperCase(),
          expirationDate: '2034-12-31' // Data padrão limpa
        }
      }
    };

    try {
      const response = await professionalsService.createProfessional(payload as any);
      if (response.success) {
        router.push('/dashboard/profissionais'); // Volta para a listagem bonita
      } else {
        setError(response.message || 'Falha ao registar o profissional.');
      }
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      const apiMessage = err.response?.data?.message || err.message;
      setError(`Erro no Servidor: ${Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage}`);
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
        <h1 className="text-lg font-black text-slate-800 mb-1">Registar Novo Funcionário</h1>
        <p className="text-slate-400 text-xs mb-5">Insira os dados de identidade e o vínculo regional de atuação.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-semibold border-l-4 border-rose-500 shadow-sm break-words">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Nome Completo</label>
            <input 
              type="text" required disabled={loading} value={fullName} 
              onChange={e => setFullName(e.target.value)} placeholder="Ex: João dos Santos"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          
          {/* Telemóvel e BI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Telemóvel</label>
              <input 
                type="text" required disabled={loading} value={phoneNumber} 
                onChange={e => setPhoneNumber(e.target.value)} placeholder="9XXXXXXXX"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Número do BI</label>
              <input 
                type="text" required disabled={loading} value={biNumber} 
                onChange={e => setBiNumber(e.target.value)} placeholder="00XXXXXXXXLAXXX"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
          </div>

          {/* Gênero e Data de Nascimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Gênero</label>
              <select 
                className="w-full p-2.5 border border-slate-300 bg-white rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium" 
                value={gender} onChange={e => setGender(e.target.value as any)}
              >
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Data de Nascimento</label>
              <input 
                type="date" required disabled={loading} value={birthDate} 
                onChange={e => setBirthDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
          </div>

          {/* Função */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Função do Profissional</label>
            <select 
              className="w-full p-2.5 border border-slate-300 bg-white rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium" 
              value={role} onChange={e => setRole(e.target.value as any)}
            >
              <option value="TECHNICAL">TECHNICAL (Operador de Registo)</option>
              <option value="ADMINISTRATIVE">ADMINISTRATIVE (Supervisor Local)</option>
              <option value="ADMINISTRATIVE_SUPER">ADMINISTRATIVE_SUPER (Supervisor Global)</option>
            </select>
          </div>

          {/* PARTE GEOGRÁFICA REATIVA */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Atribuição Territorial</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Município</label>
                <select 
                  value={selectedMuniId} disabled={!selectedProvId} onChange={e => setSelectedMuniId(e.target.value)} 
                  className="w-full p-2 border border-slate-300 bg-white disabled:bg-slate-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Escolha --</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro Alvo</label>
              <select 
                value={selectedBairroId} disabled={!selectedMuniId} onChange={e => setSelectedBairroId(e.target.value)} 
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
            {loading ? 'A Gravar...' : 'Gravar Profissional'}
          </button>
        </form>
      </div>
    </div>
  );
}