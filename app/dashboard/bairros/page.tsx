'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';

export default function BairrosPage() {
  // Estados de Listagem Estrutural
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);

  // Estados dos Filtros Ativos
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');

  // Estados de Feedback da UI
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [loadingBairro, setLoadingBairro] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBairroName, setNewBairroName] = useState('');
  const [modalMuniId, setModalMuniId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // 1. Carrega as Províncias logo ao abrir o ecrã
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await locationsService.getAllProvinces();
        if (response.success) {
          const dataPayload = response.data as any;
          const extractedProvinces = Array.isArray(dataPayload) ? dataPayload : (dataPayload?.provinces || dataPayload?.list || []);
          setProvinces(extractedProvinces);
        }
      } catch (err) {
        console.error('Erro ao carregar províncias:', err);
        setError('Não foi possível carregar as províncias iniciais.');
      }
    };
    loadProvinces();
  }, []);

  // 2. Cascata 1: Quando a Província muda -> busca os Municípios dela
  useEffect(() => {
    setMunicipalities([]);
    setBairros([]);
    setSelectedMunicipalityId('');
    setSuccessMessage('');

    if (!selectedProvinceId) return;

    const loadMunicipalities = async () => {
      setLoadingMuni(true);
      setError('');
      try {
        const response = await locationsService.getMunicipalitiesByProvince(Number(selectedProvinceId));
        if (response.success) {
          const dataPayload = response.data as any;
          const extractedMuni = Array.isArray(dataPayload) ? dataPayload : (dataPayload?.municipalities || dataPayload?.list || []);
          setMunicipalities(extractedMuni);
        }
      } catch (err) {
        console.error('Erro ao carregar municípios:', err);
        setError('Ocorreu um erro ao carregar os municípios desta província.');
      } finally {
        setLoadingMuni(false);
      }
    };

    loadMunicipalities();
  }, [selectedProvinceId]);

  // 3. Cascata 2: Quando o Município muda -> busca os Bairros dele
  const loadBairros = async () => {
    if (!selectedMunicipalityId) {
      setBairros([]);
      return;
    }

    setLoadingBairro(true);
    setError('');
    try {
      const response = await locationsService.getBairrosByMunicipality(Number(selectedMunicipalityId));
      
      if (response.success) {
        const dataPayload = response.data as any;
        
        // Extrai o array quer venha puro ou envelopado em .neighborhoods
        const extractedBairros = Array.isArray(dataPayload) 
          ? dataPayload 
          : (dataPayload?.neighborhoods || dataPayload?.list || []);
          
        setBairros(extractedBairros);
      } else {
        setBairros([]);
        setError(response.message || 'Não foi possível listar os bairros deste município.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar bairros:', err);
      setBairros([]);
      setError('Ocorreu um erro ao comunicar com o servidor de bairros.');
    } finally {
      setLoadingBairro(false);
    }
  };

  useEffect(() => {
    loadBairros();
  }, [selectedMunicipalityId]);

  // 4. Configura e Abre o Modal
  const handleOpenModal = () => {
    setModalMuniId(selectedMunicipalityId); // Pré-seleciona se já estiver a filtrar
    setNewBairroName('');
    setModalError('');
    setIsModalOpen(true);
  };

  // 5. Envia o Novo Bairro para a API Real
  const handleCreateBairro = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!newBairroName.trim() || !modalMuniId) {
      setModalError('Por favor, indique o nome do bairro e selecione o município.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await locationsService.createBairro({
        name: newBairroName.trim(),
        municipalityId: Number(modalMuniId)
      });

      if (response.success) {
        setSuccessMessage(response.message || 'Bairro adicionado com sucesso!');
        setIsModalOpen(false);

        // Se criou o bairro exatamente no município que está a ver agora, atualiza a tabela
        if (modalMuniId === selectedMunicipalityId) {
          loadBairros();
        } else {
          // Caso contrário, tenta guiar o filtro para o município correto para exibir o item
          setSelectedMunicipalityId(modalMuniId);
        }
      } else {
        setModalError(response.message || 'O servidor recusou criar o bairro.');
      }
    } catch (err: any) {
      console.error('Erro ao criar bairro:', err);
      setModalError(err.response?.data?.message || 'Falha ao registar o bairro no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Bairros de Angola</h1>
          <p className="text-slate-500 text-sm">Selecione a região geográfica para expor e expandir a malha de bairros.</p>
        </div>
        <div>
          <button
            onClick={handleOpenModal}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="text-lg leading-none">+</span> Adicionar Bairro
          </button>
        </div>
      </div>

      {/* Grid de Seletores Combinados */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Seletor 1: Província */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Província</label>
          <select
            value={selectedProvinceId}
            onChange={(e) => setSelectedProvinceId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          >
            <option value="">-- Escolha uma Província --</option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>{prov.name}</option>
            ))}
          </select>
        </div>

        {/* Seletor 2: Município (Depende da Província) */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Município</label>
          <select
            value={selectedMunicipalityId}
            disabled={!selectedProvinceId || loadingMuni}
            onChange={(e) => setSelectedMunicipalityId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          >
            <option value="">
              {loadingMuni ? 'A carregar municípios...' : !selectedProvinceId ? 'Aguardando província...' : '-- Escolha um Município --'}
            </option>
            {municipalities.map((muni) => (
              <option key={muni.id} value={muni.id}>{muni.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Alertas */}
      {error && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{error}</div>}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
          ✓ {successMessage}
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loadingBairro ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
            A mapear bairros registados no município...
          </div>
        ) : !selectedMunicipalityId ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Selecione uma província e um município acima para expor os bairros integrados.
          </div>
        ) : bairros.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm text-slate-500">
            Nenhum bairro localizado ou mapeado para este município.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bairros.map((bairro) => (
                <tr key={bairro.id} className="hover:bg-slate-50/80 transition-all text-slate-700 text-sm">
                  <td className="p-4 font-mono text-xs text-slate-400">{bairro.id}</td>
                  <td className="p-4 font-semibold text-slate-800">{bairro.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Novo Bairro</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBairro} className="p-6 space-y-4">
              {modalError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{modalError}</div>}

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro</label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={newBairroName}
                  onChange={(e) => setNewBairroName(e.target.value)}
                  placeholder="Ex: Palanca"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município de Destino</label>
                <select
                  required
                  disabled={isSubmitting || municipalities.length === 0}
                  value={modalMuniId}
                  onChange={(e) => setModalMuniId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-all"
                >
                  <option value="">-- Selecione o Município --</option>
                  {municipalities.map((muni) => (
                    <option key={muni.id} value={muni.id}>{muni.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                >
                  {isSubmitting ? 'A gravar...' : 'Gravar Bairro'}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}

    </div>
  );
}