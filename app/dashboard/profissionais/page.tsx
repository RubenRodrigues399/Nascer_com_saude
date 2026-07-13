'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService, ProfessionalRecord } from '@/app/services/profissionais';
import { DetailsModal, DetailRow, AuditSection } from '@/components/DetailsModal';
import { useAuth } from '@/context/AuthContext';
import { canAccessProfissionais, canDelete, scopeUnityId } from '@/lib/permissions';
import { useRequireAccess } from '@/hooks/useRequireAccess';

type SearchMode = 'all' | 'phone' | 'id' | 'verify';

const roleLabel: Record<string, string> = {
  ADMINISTRATIVE: 'Supervisor Local',
  TECHNICAL: 'Técnico de Registo',
  ADMINISTRATIVE_SUPER: 'Super Admin',
};

const roleBadge: Record<string, string> = {
  ADMINISTRATIVE: 'bg-amber-50 text-amber-700 border-amber-200',
  TECHNICAL: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMINISTRATIVE_SUPER: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function ProfessionalsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { blocked } = useRequireAccess(canAccessProfissionais(user?.roleProfessional));
  const scopedUnityId = scopeUnityId(user?.roleProfessional, user?.unityId);

  const [allProfessionals, setAllProfessionals] = useState<ProfessionalRecord[]>([]);
  const [displayed, setDisplayed] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Pesquisa
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detalhes / auditoria
  const [detailsPro, setDetailsPro] = useState<ProfessionalRecord | null>(null);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await professionalsService.getAllProfessionals();
      if (res.success) {
        const list = scopedUnityId != null ? res.data.filter(p => p.unity?.id === scopedUnityId) : res.data;
        setAllProfessionals(list);
        setDisplayed(list);
      }
    } catch {
      setError('Não foi possível carregar a lista de profissionais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setSearchQuery('');
    setSearchError('');
    if (mode === 'all') setDisplayed(allProfessionals);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    try {
      let res;
      if (searchMode === 'phone') {
        res = await professionalsService.getProfessionalByPhone(q);
      } else if (searchMode === 'id') {
        res = await professionalsService.getProfessionalById(q);
      } else if (searchMode === 'verify') {
        res = await professionalsService.verifyPhoneNumberRecover(q);
      }

      if (res?.success && res.data) {
        setDisplayed(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        setDisplayed([]);
        setSearchError(res?.message || 'Nenhum profissional encontrado.');
      }
    } catch (err: any) {
      setDisplayed([]);
      setSearchError(err.response?.data?.message || 'Erro ao pesquisar. Tente novamente.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await professionalsService.deleteProfessional(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadAll();
        flash('Profissional eliminado com sucesso.');
      } else {
        flash(res.message || 'Erro ao eliminar.', true);
        setConfirmDeleteId(null);
      }
    } catch {
      flash('Erro de comunicação com o servidor.', true);
      setConfirmDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (blocked) {
    return <div className="p-8 text-center text-slate-400 text-sm animate-pulse">A verificar permissões...</div>;
  }

  if (error) return <div className="p-6 text-rose-500 text-sm font-semibold">{error}</div>;

  const searchModes: [SearchMode, string][] = [
    ['all', 'Todos os Profissionais'],
    ['phone', 'Pesquisar por Telemóvel'],
    ['id', 'Pesquisar por ID'],
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">

      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Profissionais</h1>
          <p className="text-sm text-slate-500">Gestão de profissionais integrados na plataforma DNIRN.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/profissionais/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          + Novo Profissional
        </button>
      </div>

      {actionMessage && <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{actionError}</div>}

      {/* PAINEL DE PESQUISA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {searchModes.map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                searchMode === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {searchMode !== 'all' && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchError(''); }}
              placeholder={
                searchMode === 'phone' || searchMode === 'verify'
                  ? 'Ex: 921025087'
                  : 'Ex: 3fa85f64-5717-...'
              }
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              {searchLoading ? 'A pesquisar...' : 'Pesquisar'}
            </button>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setDisplayed(allProfessionals); setSearchError(''); }}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              Limpar
            </button>
          </form>
        )}

        {searchMode === 'verify' && (
          <p className="text-[11px] text-slate-400">
            Verifica se o número está registado no sistema e elegível para recuperação de senha.
          </p>
        )}

        {searchError && (
          <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-xs rounded-lg font-semibold">
            {searchError}
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Nome Completo</th>
              <th className="p-4">Cargo / Função</th>
              <th className="p-4">Telemóvel</th>
              <th className="p-4">Nº Documento</th>
              <th className="p-4">Unidade</th>
              <th className="p-4 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400 animate-pulse">A carregar profissionais...</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum profissional encontrado.</td></tr>
            ) : (
              displayed.map((pro) => (
                <tr key={pro.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-semibold text-slate-800">{pro.individual?.fullName ?? 'N/D'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge[pro.roleProfessional] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {roleLabel[pro.roleProfessional] ?? pro.roleProfessional}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600">{pro.individual?.phoneNumber ?? 'N/D'}</td>
                  <td className="p-4 font-mono text-xs text-slate-600">
                    {pro.individual?.identificationDocument?.identificationNumber ?? 'N/D'}
                  </td>
                  <td className="p-4 text-xs text-slate-500">{pro.unity?.name ?? 'N/D'}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDetailsPro(pro)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                      >
                        Detalhes
                      </button>
                      {canDelete(user?.roleProfessional) && (
                        <button
                          onClick={() => setConfirmDeleteId(pro.id)}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                        >
                          Apagar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
          {displayed.length} profissional(ais) apresentado(s)
        </div>
      </div>

      {/* CONFIRMAÇÃO DE APAGAR */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-500 mb-6">O profissional será removido permanentemente do sistema.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleteLoading} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleConfirmDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold">
                {deleteLoading ? 'A eliminar...' : 'Sim, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES / AUDITORIA */}
      {detailsPro && (
        <DetailsModal title="Detalhes do Profissional" onClose={() => setDetailsPro(null)}>
          <DetailRow label="Nome" value={detailsPro.individual?.fullName ?? 'N/D'} />
          <DetailRow label="Cargo" value={roleLabel[detailsPro.roleProfessional] ?? detailsPro.roleProfessional} />
          <DetailRow label="Unidade" value={detailsPro.unity?.name ?? 'N/D'} />
          <AuditSection creator={detailsPro.creator} updater={detailsPro.updater} />
        </DetailsModal>
      )}
    </div>
  );
}
