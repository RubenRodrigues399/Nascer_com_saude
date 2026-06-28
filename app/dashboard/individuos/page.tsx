'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { individualsService, IndividualRecord } from '@/app/services/individuos';

type SearchMode = 'all' | 'phone' | 'bi';

export default function IndividuosPage() {
  const [allIndividuals, setAllIndividuals] = useState<IndividualRecord[]>([]);
  const [results, setResults] = useState<IndividualRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');

  // Carrega todos os indivíduos ao montar
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await individualsService.getAllIndividuals();
        if (res.success) {
          const data = Array.isArray(res.data) ? res.data : [];
          setAllIndividuals(data);
          setResults(data);
        } else {
          setError(res.message || 'Erro ao carregar cidadãos.');
        }
      } catch (err: any) {
        setError('Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filtro client-side para modo "all"
  useEffect(() => {
    if (searchMode !== 'all') return;
    if (!searchTerm.trim()) {
      setResults(allIndividuals);
      return;
    }
    const term = searchTerm.toLowerCase();
    setResults(
      allIndividuals.filter(
        (ind) =>
          ind.fullName?.toLowerCase().includes(term) ||
          ind.phoneNumber?.includes(term) ||
          ind.identificationDocument?.number?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, searchMode, allIndividuals]);

  // Pesquisa via API por telefone ou BI
  const handleApiSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setSearching(true);
    setError('');
    try {
      let res;
      if (searchMode === 'phone') {
        res = await individualsService.getIndividualByPhone(term);
      } else {
        res = await individualsService.getIndividualByIdNumber(term);
      }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchMode !== 'all') handleApiSearch();
  };

  const resetSearch = () => {
    setSearchTerm('');
    setSearchMode('all');
    setResults(allIndividuals);
    setError('');
  };

  const genderLabel = (g?: string) => g === 'MALE' ? 'Masculino' : g === 'FEMALE' ? 'Feminino' : 'N/D';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cidadãos / Indivíduos</h1>
          <p className="text-sm text-slate-500">Consulta e pesquisa de cidadãos registados no sistema.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-800">{allIndividuals.length}</span>
          <p className="text-xs text-slate-400 font-medium">registos totais</p>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Modo de pesquisa */}
        <div className="flex gap-2">
          {(['all', 'phone', 'bi'] as SearchMode[]).map((mode) => {
            const labels: Record<SearchMode, string> = { all: 'Todos (filtro local)', phone: 'Por Telefone (API)', bi: 'Por BI/Doc (API)' };
            return (
              <button
                key={mode}
                onClick={() => { setSearchMode(mode); setSearchTerm(''); setError(''); if (mode === 'all') setResults(allIndividuals); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                  searchMode === mode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* Input + botão */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              searchMode === 'all'
                ? 'Pesquisar por nome, telefone ou número de documento...'
                : searchMode === 'phone'
                ? 'Ex: 923000000 ou +244923000000'
                : 'Ex: 003456789LA001'
            }
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
          />
          {searchMode !== 'all' && (
            <button
              onClick={handleApiSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-colors"
            >
              {searching ? 'A pesquisar...' : 'Pesquisar'}
            </button>
          )}
          {(searchTerm || searchMode !== 'all') && (
            <button onClick={resetSearch} className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-sm transition-colors">
              Limpar
            </button>
          )}
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Nome Completo</th>
                <th className="px-6 py-3">Documento</th>
                <th className="px-6 py-3">Género</th>
                <th className="px-6 py-3">Telefone</th>
                <th className="px-6 py-3">Município</th>
                <th className="px-6 py-3">Data Nasc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse">A carregar cidadãos...</td></tr>
              ) : searching ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse">A pesquisar...</td></tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum cidadão encontrado.
                  </td>
                </tr>
              ) : (
                results.map((ind) => (
                  <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{ind.fullName}</td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-700">{ind.identificationDocument?.number || 'N/D'}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{ind.identificationDocument?.type || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{genderLabel(ind.gender)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{ind.phoneNumber || 'N/D'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ind.municipality?.name || 'N/D'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ind.birthDate?.split('T')[0] || 'N/D'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
