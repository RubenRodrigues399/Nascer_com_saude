'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province, Municipality } from '@/app/services/locations';

export default function MunicipiosPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMuniName, setNewMuniName] = useState('');
  const [modalProvinceId, setModalProvinceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // 1. Carrega o dropdown de províncias ao montar o ecrã
  const loadProvinces = async () => {
    try {
      const response = await locationsService.getAllProvinces();
      if (response.success) {
        const dataPayload = response.data as any;
        const extractedProvinces = Array.isArray(dataPayload) 
          ? dataPayload 
          : (dataPayload?.provinces || dataPayload?.list || []);
        setProvinces(extractedProvinces);
      }
    } catch (err) {
      console.error('Erro ao carregar províncias:', err);
      setError('Não foi possível carregar as províncias estruturais.');
    }
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  // 2. Carrega os municípios da província selecionada
  const loadMunicipalities = async () => {
    if (!selectedProvinceId) {
      setMunicipalities([]);
      setSuccessMessage('');
      return;
    }

    setLoadingMuni(true);
    setError('');
    try {
      const response = await locationsService.getMunicipalitiesByProvince(Number(selectedProvinceId));
      
      if (response.success) {
        const dataPayload = response.data as any;
        let extractedList: Municipality[] = [];

        if (Array.isArray(dataPayload)) {
          extractedList = dataPayload;
        } else if (dataPayload && Array.isArray(dataPayload.municipalities)) {
          extractedList = dataPayload.municipalities;
        } else if (dataPayload && Array.isArray(dataPayload.list)) {
          extractedList = dataPayload.list;
        }

        setMunicipalities(extractedList);
      } else {
        setMunicipalities([]);
        setError(response.message || 'Sem municípios mapeados para esta região.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar municípios:', err);
      setMunicipalities([]);
      setError('Ocorreu um erro ao carregar os municípios da província selecionada.');
    } finally {
      setLoadingMuni(false);
    }
  };

  useEffect(() => {
    loadMunicipalities();
  }, [selectedProvinceId]);

  // 3. Abre o Modal pré-configurando a província ativa
  const handleOpenModal = () => {
    setModalProvinceId(selectedProvinceId); // Se já tiver uma província no filtro, pré-seleciona
    setNewMuniName('');
    setModalError('');
    setIsModalOpen(true);
  };

  // 4. Submissão do Formulário do Modal para a API Real
  const handleCreateMunicipio = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!newMuniName.trim() || !modalProvinceId) {
      setModalError('Por favor, preencha o nome do município e selecione a província.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 🔥 AGORA SIM: Chamada real à API com os dados do formulário
      const response = await locationsService.createMunicipality({ 
        name: newMuniName.trim(), 
        provinceId: Number(modalProvinceId) 
      });
      
      if (response.success) {
        setSuccessMessage(response.message || 'Município adicionado com sucesso!');
        setIsModalOpen(false); // Fecha o modal
        
        // Se criaste o município na província que estás a ver no momento, atualiza a tabela automaticamente
        if (modalProvinceId === selectedProvinceId) {
          loadMunicipalities();
        } else {
          // Se criaste noutra província, muda o filtro para essa província para ver o novo município lá
          setSelectedProvinceId(modalProvinceId);
        }
      } else {
        setModalError(response.message || 'O servidor recusou o cadastro do município.');
      }
    } catch (err: any) {
      console.error('Erro ao criar município:', err);
      // Captura o erro real devolvido pelo teu Back-End (ex: "Município já existe")
      setModalError(err.response?.data?.message || 'Falha ao registar o município no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Municípios de Angola</h1>
          <p className="text-slate-500 text-sm">Selecione uma província para expor e gerir os seus municípios associados.</p>
        </div>
        <div>
          <button
            onClick={handleOpenModal}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <span className="text-lg leading-none">+</span> Adicionar Município
          </button>
        </div>
      </div>

      {/* Seletor de Província (Filtro Pai) */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          Filtrar por Província
        </label>
        <select
          value={selectedProvinceId}
          onChange={(e) => setSelectedProvinceId(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
        >
          <option value="">-- Escolha uma Província --</option>
          {provinces.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>

      {/* Feedbacks na Tela Principal */}
      {error && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{error}</div>}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold animate-fadeIn">
          ✓ {successMessage}
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loadingMuni ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
            A consultar base de dados territorial...
          </div>
        ) : !selectedProvinceId ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Por favor, selecione uma província acima para visualizar os municípios.
          </div>
        ) : municipalities.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm text-slate-500">
            Nenhum município localizado ou mapeado para esta província.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Município</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {municipalities.map((muni) => (
                <tr key={muni.id} className="hover:bg-slate-50/80 transition-all text-slate-700 text-sm">
                  <td className="p-4 font-mono text-xs text-slate-400">{muni.id}</td>
                  <td className="p-4 font-semibold text-slate-800">{muni.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================================ */}
      {/* COMPONENTE DO MODAL DE ADICIONAR MUNICÍPIO */}
      {/* ============================================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Cabeçalho do Modal */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Novo Município</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleCreateMunicipio} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
                  {modalError}
                </div>
              )}

              {/* Input: Nome */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Nome do Município
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={newMuniName}
                  onChange={(e) => setNewMuniName(e.target.value)}
                  placeholder="Ex: Cazenga"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Seletor: Província Alvo dentro do Modal */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Província de Pertencimento
                </label>
                <select
                  required
                  disabled={isSubmitting}
                  value={modalProvinceId}
                  onChange={(e) => setModalProvinceId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-all"
                >
                  <option value="">-- Selecione a Província --</option>
                  {provinces.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ações do Modal */}
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
                  {isSubmitting ? 'A gravar...' : 'Gravar Município'}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}

    </div>
  );
}