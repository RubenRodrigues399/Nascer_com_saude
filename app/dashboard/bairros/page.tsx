'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province, Municipality, Neighborhood } from '@/app/services/locations';

export default function BairrosPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [bairros, setBairros] = useState<Neighborhood[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [loadingBairro, setLoadingBairro] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBairroName, setNewBairroName] = useState('');
  const [modalMuniId, setModalMuniId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal de edição
  const [editingBairro, setEditingBairro] = useState<Neighborhood | null>(null);
  const [editBairroName, setEditBairroName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await locationsService.getAllProvinces();
        if (res.success) {
          const data = res.data as any;
          setProvinces(Array.isArray(data) ? data : (data?.provinces || data?.list || []));
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  useEffect(() => {
    setMunicipalities([]);
    setBairros([]);
    setSelectedMunicipalityId('');
    if (!selectedProvinceId) return;

    const load = async () => {
      setLoadingMuni(true);
      try {
        const res = await locationsService.getMunicipalitiesByProvince(Number(selectedProvinceId));
        if (res.success) {
          const data = res.data as any;
          setMunicipalities(Array.isArray(data) ? data : (data?.municipalities || data?.list || []));
        }
      } catch { /* silent */ } finally { setLoadingMuni(false); }
    };
    load();
  }, [selectedProvinceId]);

  const loadBairros = async (muniId?: string) => {
    const id = muniId ?? selectedMunicipalityId;
    if (!id) { setBairros([]); return; }
    setLoadingBairro(true);
    try {
      const res = await locationsService.getBairrosByMunicipality(Number(id));
      if (res.success) {
        const data = res.data as any;
        setBairros(Array.isArray(data) ? data : (data?.neighborhoods || data?.list || []));
      } else {
        setBairros([]);
      }
    } catch { setBairros([]); } finally { setLoadingBairro(false); }
  };

  useEffect(() => { loadBairros(selectedMunicipalityId); }, [selectedMunicipalityId]);

  // --- CRIAR ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newBairroName.trim() || !modalMuniId) {
      setCreateError('Indique o nome e o município.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await locationsService.createBairro({ name: newBairroName.trim(), municipalityId: Number(modalMuniId) });
      if (res.success) {
        setIsCreateOpen(false);
        setNewBairroName('');
        if (modalMuniId === selectedMunicipalityId) loadBairros();
        else setSelectedMunicipalityId(modalMuniId);
        flash('Bairro registado com sucesso.');
      } else {
        setCreateError(res.message || 'Erro ao registar.');
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Erro de comunicação.');
    } finally {
      setCreateLoading(false);
    }
  };

  // --- EDITAR ---
  const openEdit = (bairro: Neighborhood) => {
    setEditingBairro(bairro);
    setEditBairroName(bairro.name);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBairro?.id || !editBairroName.trim()) return;
    setEditLoading(true);
    try {
      const muniId = editingBairro.municipality?.id || Number(selectedMunicipalityId);
      const res = await locationsService.updateBairro(editingBairro.id, { name: editBairroName.trim(), municipalityId: muniId });
      if (res.success) {
        setEditingBairro(null);
        loadBairros();
        flash('Bairro actualizado com sucesso.');
      } else {
        flash(res.message || 'Erro ao actualizar.', true);
      }
    } catch {
      flash('Erro de comunicação com o servidor.', true);
    } finally {
      setEditLoading(false);
    }
  };

  // --- APAGAR ---
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await locationsService.deleteBairro(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadBairros();
        flash('Bairro eliminado.');
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bairros</h1>
          <p className="text-slate-500 text-sm">Selecione um município para gerir os seus bairros.</p>
        </div>
        <button
          onClick={() => { setModalMuniId(selectedMunicipalityId); setNewBairroName(''); setCreateError(''); setIsCreateOpen(true); }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Adicionar Bairro
        </button>
      </div>

      {/* Filtros em cascata */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Província</label>
          <select value={selectedProvinceId} onChange={(e) => setSelectedProvinceId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">-- Escolha uma Província --</option>
            {provinces.map((prov) => <option key={prov.id} value={prov.id}>{prov.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Município</label>
          <select value={selectedMunicipalityId} disabled={!selectedProvinceId || loadingMuni}
            onChange={(e) => setSelectedMunicipalityId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">{loadingMuni ? 'A carregar...' : !selectedProvinceId ? 'Aguardando província...' : '-- Escolha um Município --'}</option>
            {municipalities.map((muni) => <option key={muni.id} value={muni.id}>{muni.name}</option>)}
          </select>
        </div>
      </div>

      {actionMessage && <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{actionError}</div>}

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loadingBairro ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">A mapear bairros...</div>
        ) : !selectedMunicipalityId ? (
          <div className="p-12 text-center text-slate-400 text-sm">Selecione uma província e município para ver os bairros.</div>
        ) : bairros.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Nenhum bairro localizado para este município.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bairros.map((bairro) => (
                <tr key={bairro.id} className="hover:bg-slate-50/80 transition-all text-slate-700 text-sm">
                  <td className="p-4 font-mono text-xs text-slate-400">{bairro.id}</td>
                  <td className="p-4 font-semibold text-slate-800">{bairro.name}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(bairro)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">Editar</button>
                      <button onClick={() => setConfirmDeleteId(bairro.id)} className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors">Apagar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Novo Bairro</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{createError}</div>}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro</label>
                <input type="text" required disabled={createLoading} value={newBairroName} onChange={(e) => setNewBairroName(e.target.value)}
                  placeholder="Ex: Palanca"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Município de Destino</label>
                <select required disabled={createLoading || municipalities.length === 0} value={modalMuniId} onChange={(e) => setModalMuniId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium">
                  <option value="">-- Selecione o Município --</option>
                  {municipalities.map((muni) => <option key={muni.id} value={muni.id}>{muni.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={createLoading} onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={createLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm">
                  {createLoading ? 'A gravar...' : 'Gravar Bairro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingBairro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Bairro</h3>
              <button onClick={() => setEditingBairro(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Bairro</label>
                <input type="text" required disabled={editLoading} value={editBairroName} onChange={(e) => setEditBairroName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={editLoading} onClick={() => setEditingBairro(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider">Cancelar</button>
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
            <p className="text-xs text-slate-500 mb-6">Esta acção é irreversível.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleteLoading} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleConfirmDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold">
                {deleteLoading ? 'A eliminar...' : 'Sim, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
