'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { unityService } from '@/app/services/unidades';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';

export default function CreateUnidadePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados dos inputs da Unidade
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Estados da Cascata Territorial Hidratada
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);

  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedMuniId, setSelectedMuniId] = useState('');
  const [selectedBairroId, setSelectedBairroId] = useState('');

  // Carrega as Províncias
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

    if (!selectedBairroId || !selectedMuniId) {
      setError('Por favor, selecione a localização completa (Província, Município e Bairro).');
      setLoading(false);
      return;
    }

    // 🔥 Procura o objeto do bairro selecionado para extrair o nome em texto limpo
    const bairroSelecionado = bairros.find(b => b.id === Number(selectedBairroId));

    // 🚀 Payload ajustado exatamente para o que o validador do teu Back-End exige
    const payload = {
      name: name.trim(),
      nif: nif.trim().toUpperCase(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      neighborhoodId: Number(selectedBairroId), // ID numérico do bairro
      municipalityId: Number(selectedMuniId),   // ID numérico do município exigido
      neighborhoodName: bairroSelecionado ? bairroSelecionado.name : "Desconhecido" // Nome de texto do bairro exigido
    };

    try {
      const response = await unityService.createUnity(payload as any);
      if (response.success) {
        router.push('/dashboard/unidades'); // Cadastro com sucesso, regressa à lista
      } else {
        setError(response.message || 'Falha ao registar a unidade hospitalar.');
      }
    } catch (err: any) {
      console.error('Erro detalhado no cadastro da unidade:', err);
      // Exibe o erro formatado se o servidor devolver outro objeto de validação
      const apiMessage = err.response?.data?.message || err.response?.data || err.message;
      setError(`Erro no Servidor: ${typeof apiMessage === 'object' ? JSON.stringify(apiMessage) : apiMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <button 
        onClick={() => router.push('/dashboard/unidades')}
        className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors"
      >
        ← Voltar para a Listagem
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
        <h1 className="text-lg font-black text-slate-800 mb-1">Cadastrar Nova Unidade</h1>
        <p className="text-slate-400 text-xs mb-5">Insira os dados cadastrais e jurídicos do hospital ou maternidade.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-semibold border-l-4 border-rose-500 shadow-sm break-words">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome da Unidade */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Nome da Unidade Hospitalar</label>
            <input 
              type="text" required disabled={loading} value={name} 
              onChange={e => setName(e.target.value)} placeholder="Ex: Maternidade Lucrécia Paim"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          
          {/* NIF e Telemóvel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">NIF da Unidade</label>
              <input 
                type="text" required disabled={loading} value={nif} 
                onChange={e => setNif(e.target.value)} placeholder="Ex: 5001XXXXXX"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">Telemóvel de Contacto</label>
              <input 
                type="text" required disabled={loading} value={phoneNumber} 
                onChange={e => setPhoneNumber(e.target.value)} placeholder="9XXXXXXXX"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              />
            </div>
          </div>

          {/* Email institucional */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide">E-mail Institucional</label>
            <input 
              type="email" required disabled={loading} value={email} 
              onChange={e => setEmail(e.target.value)} placeholder="hospital@dnirn.gov.ao"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>

          {/* PARTE GEOGRÁFICA REATIVA */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Localização Geográfica</span>
            
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro Sede</label>
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
            {loading ? 'A Gravar Unidade...' : 'Gravar Unidade'}
          </button>
        </form>
      </div>
    </div>
  );
}