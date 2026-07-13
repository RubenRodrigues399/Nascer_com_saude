'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { unityService, UnityRecord } from '@/app/services/unidades';
import { locationsService, Province, Municipality, safeNeighborhoodName } from '@/app/services/locations';
import { DetailsModal, DetailRow, AuditSection } from '@/components/DetailsModal';
import { useAuth } from '@/context/AuthContext';
import { canAccessUnidades, canCreateUnidade, canDelete, scopeUnityId } from '@/lib/permissions';
import { useRequireAccess } from '@/hooks/useRequireAccess';

type SearchMode = 'all' | 'nif' | 'id';

function locationPath(uni: UnityRecord) {
  const parts = [
    uni.neighborhood?.municipality?.province?.name,
    uni.neighborhood?.municipality?.name,
    safeNeighborhoodName(uni.neighborhood?.name),
  ].filter(Boolean);
  return parts.length ? parts.join(' › ') : 'N/D';
}

export default function UnidadesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { blocked } = useRequireAccess(canAccessUnidades(user?.roleProfessional));
  const scopedUnityId = scopeUnityId(user?.roleProfessional, user?.unityId);

  const [allUnidades, setAllUnidades] = useState<UnityRecord[]>([]);
  const [displayed, setDisplayed] = useState<UnityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Pesquisa
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  // Modal de edição
  const [editingUnity, setEditingUnity] = useState<UnityRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', nif: '', phoneNumber: '', email: '', neighborhoodName: '' });
  const [editMunicipalityId, setEditMunicipalityId] = useState('');
  const [editProvinceId, setEditProvinceId] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Localização para o modal de edição
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [editMunicipalities, setEditMunicipalities] = useState<Municipality[]>([]);
  const [loadingMuni, setLoadingMuni] = useState(false);

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detalhes / auditoria
  const [detailsUnity, setDetailsUnity] = useState<UnityRecord | null>(null);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await unityService.getAllUnities();
      if (res.success) {
        const list = scopedUnityId != null ? res.data.filter(u => u.id === scopedUnityId) : res.data;
        setAllUnidades(list);
        setDisplayed(list);
      }
    } catch {
      setError('Não foi possível carregar a lista de unidades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Províncias para o modal
  useEffect(() => {
    locationsService.getAllProvinces().then(res => {
      if (res.success) {
        const data = res.data as any;
        setProvinces(Array.isArray(data) ? data : (data?.provinces || []));
      }
    }).catch(() => {});
  }, []);

  // Cascata município no modal
  useEffect(() => {
    setEditMunicipalities([]);
    setEditMunicipalityId('');
    if (!editProvinceId) return;
    setLoadingMuni(true);
    locationsService.getMunicipalitiesByProvince(Number(editProvinceId)).then(res => {
      if (res.success) {
        const data = res.data as any;
        setEditMunicipalities(Array.isArray(data) ? data : (data?.municipalities || data?.list || []));
      }
    }).catch(() => {}).finally(() => setLoadingMuni(false));
  }, [editProvinceId]);

  // Quando muda o modo de pesquisa, repõe
  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setSearchQuery('');
    setSearchError('');
    if (mode === 'all') setDisplayed(allUnidades);
  };

  // Pesquisa
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    try {
      if (searchMode === 'nif') {
        const res = await unityService.getUnityByNif(q);
        if (res.success && res.data && (scopedUnityId == null || res.data.id === scopedUnityId)) {
          setDisplayed([res.data]);
        } else {
          setDisplayed([]);
          setSearchError(res.message || 'Nenhuma unidade encontrada com esse NIF.');
        }
      } else if (searchMode === 'id') {
        const id = parseInt(q, 10);
        if (isNaN(id)) { setSearchError('Introduza um ID numérico válido.'); return; }
        const res = await unityService.getUnityById(id);
        if (res.success && res.data && (scopedUnityId == null || res.data.id === scopedUnityId)) {
          setDisplayed([res.data]);
        } else {
          setDisplayed([]);
          setSearchError(res.message || 'Nenhuma unidade encontrada com esse ID.');
        }
      }
    } catch (err: any) {
      setDisplayed([]);
      setSearchError(err.response?.data?.message || 'Erro ao pesquisar. Tente novamente.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Editar
  const openEdit = (uni: UnityRecord) => {
    setEditingUnity(uni);
    setEditForm({
      name: uni.name,
      nif: uni.nif,
      phoneNumber: uni.phoneNumber,
      email: uni.email,
      neighborhoodName: safeNeighborhoodName(uni.neighborhood?.name),
    });
    setEditProvinceId('');
    setEditMunicipalityId('');
    setEditMunicipalities([]);
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnity?.id) return;
    if (!editMunicipalityId) { setEditError('Seleccione o município.'); return; }
    if (!editForm.neighborhoodName.trim()) { setEditError('Introduza o nome do bairro.'); return; }
    setEditLoading(true);
    setEditError('');
    try {
      const res = await unityService.updateUnity(editingUnity.id, {
        name: editForm.name,
        nif: editForm.nif,
        phoneNumber: editForm.phoneNumber,
        email: editForm.email,
        municipalityId: Number(editMunicipalityId),
        neighborhoodName: editForm.neighborhoodName.trim(),
      });
      if (res.success) {
        setEditingUnity(null);
        loadAll();
        flash('Unidade actualizada com sucesso.');
      } else {
        setEditError(res.message || 'Erro ao actualizar.');
      }
    } catch {
      setEditError('Erro de comunicação com o servidor.');
    } finally {
      setEditLoading(false);
    }
  };

  // Apagar
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await unityService.deleteUnity(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadAll();
        flash('Unidade eliminada com sucesso.');
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">

      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Unidades Hospitalares</h1>
          <p className="text-sm text-slate-500">Gestão de maternidades e hospitais integrados na DNIRN.</p>
        </div>
        {canCreateUnidade(user?.roleProfessional) && (
          <button
            onClick={() => router.push('/dashboard/unidades/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            + Nova Unidade
          </button>
        )}
      </div>

      {actionMessage && <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{actionError}</div>}

      {/* PAINEL DE PESQUISA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Selector de modo */}
        <div className="flex gap-2 flex-wrap">
          {(scopedUnityId == null
            ? ([['all', 'Todas as Unidades'], ['nif', 'Pesquisar por NIF'], ['id', 'Pesquisar por ID']] as [SearchMode, string][])
            : ([['all', 'A Minha Unidade']] as [SearchMode, string][])
          ).map(([mode, label]) => (
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

        {/* Barra de pesquisa */}
        {searchMode !== 'all' && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type={searchMode === 'id' ? 'number' : 'text'}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchError(''); }}
              placeholder={searchMode === 'nif' ? 'Ex: 6851409466' : 'Ex: 3'}
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
              onClick={() => { setSearchQuery(''); setDisplayed(allUnidades); setSearchError(''); }}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              Limpar
            </button>
          </form>
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
              <th className="p-4">Nome da Unidade</th>
              <th className="p-4">NIF</th>
              <th className="p-4">Telemóvel</th>
              <th className="p-4">Localização</th>
              <th className="p-4 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 animate-pulse">A carregar unidades...</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma unidade encontrada.</td></tr>
            ) : (
              displayed.map((uni) => (
                <tr key={uni.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-semibold text-slate-800">{uni.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-600">{uni.nif || 'N/D'}</td>
                  <td className="p-4 text-slate-600">{uni.phoneNumber || 'N/D'}</td>
                  <td className="p-4 text-xs text-slate-500">{locationPath(uni)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDetailsUnity(uni)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => openEdit(uni)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        Editar
                      </button>
                      {canDelete(user?.roleProfessional) && (
                        <button
                          onClick={() => setConfirmDeleteId(uni.id)}
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
          {displayed.length} unidade(s) apresentada(s)
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingUnity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Unidade</h3>
              <button onClick={() => setEditingUnity(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{editError}</div>}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome da Unidade</label>
                <input type="text" required disabled={editLoading} value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">NIF</label>
                <input type="text" disabled={editLoading} value={editForm.nif}
                  onChange={(e) => setEditForm(f => ({ ...f, nif: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telemóvel</label>
                  <input type="text" disabled={editLoading} value={editForm.phoneNumber}
                    onChange={(e) => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" disabled={editLoading} value={editForm.email}
                    onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Nova Localização *</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Província *</label>
                    <select disabled={editLoading} value={editProvinceId} onChange={(e) => setEditProvinceId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">-- Escolha --</option>
                      {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município *</label>
                    <select disabled={editLoading || !editProvinceId || loadingMuni} value={editMunicipalityId}
                      onChange={(e) => setEditMunicipalityId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">{loadingMuni ? 'A carregar...' : '-- Escolha --'}</option>
                      {editMunicipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro *</label>
                  <input type="text" disabled={editLoading} value={editForm.neighborhoodName}
                    onChange={(e) => setEditForm(f => ({ ...f, neighborhoodName: e.target.value }))}
                    placeholder="Ex: Palanca"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={editLoading} onClick={() => setEditingUnity(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={editLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm">
                  {editLoading ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <p className="text-xs text-slate-500 mb-6">A unidade hospitalar será removida permanentemente do sistema.</p>
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
      {detailsUnity && (
        <DetailsModal title="Detalhes da Unidade" onClose={() => setDetailsUnity(null)}>
          <DetailRow label="Nome" value={detailsUnity.name} />
          <DetailRow label="NIF" value={detailsUnity.nif || 'N/D'} />
          <DetailRow label="Localização" value={locationPath(detailsUnity)} />
          <AuditSection creator={detailsUnity.creator} updater={detailsUnity.updater} />
        </DetailsModal>
      )}
    </div>
  );
}
