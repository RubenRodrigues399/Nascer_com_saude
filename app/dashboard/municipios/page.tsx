'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province, Municipality } from '@/app/services/locations';

export default function MunicipiosPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingMuni, setLoadingMuni] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMuniName, setNewMuniName] = useState('');
  const [modalProvinceId, setModalProvinceId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal de edição
  const [editingMuni, setEditingMuni] = useState<Municipality | null>(null);
  const [editMuniName, setEditMuniName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  const loadProvinces = async () => {
    try {
      const response = await locationsService.getAllProvinces();
      if (response.success) {
        const data = response.data as any;
        setProvinces(Array.isArray(data) ? data : (data?.provinces || data?.list || []));
      }
    } catch (err) {
      console.error('Erro ao carregar províncias:', err);
    }
  };

  useEffect(() => { loadProvinces(); }, []);

  const loadMunicipalities = async (provinceId: string) => {
    if (!provinceId) { setMunicipalities([]); return; }
    setLoadingMuni(true);
    try {
      const response = await locationsService.getMunicipalitiesByProvince(Number(provinceId));
      if (response.success) {
        const data = response.data as any;
        setMunicipalities(Array.isArray(data) ? data : (data?.municipalities || data?.list || []));
      } else {
        setMunicipalities([]);
      }
    } catch {
      setMunicipalities([]);
    } finally {
      setLoadingMuni(false);
    }
  };

  useEffect(() => { loadMunicipalities(selectedProvinceId); }, [selectedProvinceId]);

  // --- CRIAR ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newMuniName.trim() || !modalProvinceId) {
      setCreateError('Preencha o nome e a província.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await locationsService.createMunicipality({ name: newMuniName.trim(), provinceId: Number(modalProvinceId) });
      if (res.success) {
        setIsCreateOpen(false);
        setNewMuniName('');
        if (modalProvinceId === selectedProvinceId) loadMunicipalities(selectedProvinceId);
        else setSelectedProvinceId(modalProvinceId);
        flash('Município registado com sucesso.');
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
  const openEdit = (muni: Municipality) => {
    setEditingMuni(muni);
    setEditMuniName(muni.name);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMuni?.id || !editMuniName.trim()) return;
    setEditLoading(true);
    try {
      const res = await locationsService.updateMunicipality(editingMuni.id, {
        name: editMuniName.trim(),
      });
      if (res.success) {
        setEditingMuni(null);
        loadMunicipalities(selectedProvinceId);
        flash('Município actualizado com sucesso.');
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
      const res = await locationsService.deleteMunicipality(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadMunicipalities(selectedProvinceId);
        flash('Município eliminado.');
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
          <h1 className="text-xl font-bold text-slate-800">Municípios</h1>
          <p className="text-slate-500 text-sm">Selecione uma província para gerir os seus municípios.</p>
        </div>
        <button
          onClick={() => { setModalProvinceId(selectedProvinceId); setNewMuniName(''); setCreateError(''); setIsCreateOpen(true); }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Adicionar Município
        </button>
      </div>

      {/* Filtro */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Província</label>
        <select
          value={selectedProvinceId}
          onChange={(e) => setSelectedProvinceId(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
        >
          <option value="">-- Escolha uma Província --</option>
          {provinces.map((prov) => <option key={prov.id} value={prov.id}>{prov.name}</option>)}
        </select>
      </div>

      {actionMessage && <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{actionError}</div>}

      {/* Tabela */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loadingMuni ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">A consultar base de dados territorial...</div>
        ) : !selectedProvinceId ? (
          <div className="p-12 text-center text-slate-400 text-sm">Selecione uma província acima para visualizar os municípios.</div>
        ) : municipalities.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Nenhum município localizado para esta província.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Município</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {municipalities.map((muni) => (
                <tr key={muni.id} className="hover:bg-slate-50/80 transition-all text-slate-700 text-sm">
                  <td className="p-4 font-mono text-xs text-slate-400">{muni.id}</td>
                  <td className="p-4 font-semibold text-slate-800">{muni.name}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(muni)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(muni.id!)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                      >
                        Apagar
                      </button>
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
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Novo Município</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{createError}</div>}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Município</label>
                <input type="text" required disabled={createLoading} value={newMuniName} onChange={(e) => setNewMuniName(e.target.value)}
                  placeholder="Ex: Cazenga"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Província</label>
                <select required disabled={createLoading} value={modalProvinceId} onChange={(e) => setModalProvinceId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium">
                  <option value="">-- Selecione a Província --</option>
                  {provinces.map((prov) => <option key={prov.id} value={prov.id}>{prov.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={createLoading} onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={createLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm">
                  {createLoading ? 'A gravar...' : 'Gravar Município'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingMuni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Editar Município</h3>
              <button onClick={() => setEditingMuni(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Município</label>
                <input type="text" required disabled={editLoading} value={editMuniName} onChange={(e) => setEditMuniName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" disabled={editLoading} onClick={() => setEditingMuni(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider">Cancelar</button>
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
            <p className="text-xs text-slate-500 mb-6">Os bairros associados a este município podem ser afectados.</p>
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
