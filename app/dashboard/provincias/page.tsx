'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province } from '@/app/services/locations';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/utils/audit';
import { DetailsModal, DetailRow, AuditSection } from '@/components/DetailsModal';

export default function ProvinciasPage() {
  const { user } = useAuth();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Modal de edição
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detalhes / auditoria
  const [detailsProvince, setDetailsProvince] = useState<Province | null>(null);

  const loadProvinces = async () => {
    setLoading(true);
    try {
      const res = await locationsService.getAllProvinces();
      if (res.success) setProvinces(res.data);
    } catch (err) {
      console.error('Erro ao carregar províncias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProvinces(); }, []);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  // --- CRIAR ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await locationsService.createProvince({ name: newName.trim() });
      if (res.success) {
        await logAction('Configuração Geográfica', `Província "${newName}" cadastrada.`, user?.fullName, user?.roleProfessional);
        setNewName('');
        setIsCreateOpen(false);
        loadProvinces();
        flash('Província registada com sucesso.');
      } else {
        flash(res.message || 'Erro ao registar.', true);
      }
    } catch {
      flash('Erro de comunicação com o servidor.', true);
    } finally {
      setCreateLoading(false);
    }
  };

  // --- EDITAR ---
  const openEdit = (prov: Province) => {
    setEditingProvince(prov);
    setEditName(prov.name);
    setActionError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvince?.id || !editName.trim()) return;
    setEditLoading(true);
    try {
      const res = await locationsService.updateProvince(editingProvince.id, { name: editName.trim() });
      if (res.success) {
        setEditingProvince(null);
        loadProvinces();
        flash('Província actualizada com sucesso.');
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
      const res = await locationsService.deleteProvince(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadProvinces();
        flash('Província eliminada.');
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
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Províncias</h1>
          <p className="text-sm text-slate-500">Gestão de províncias.</p>
        </div>
        <button
          onClick={() => { setIsCreateOpen(true); setNewName(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
        >
          + Nova Província
        </button>
      </div>

      {actionMessage && <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">✓ {actionMessage}</div>}
      {actionError && <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{actionError}</div>}

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3 w-24">ID</th>
              <th className="px-6 py-3">Nome da Província</th>
              <th className="px-6 py-3 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400">A carregar dados do servidor...</td></tr>
            ) : provinces.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Nenhuma província introduzida.</td></tr>
            ) : (
              provinces.map((prov) => (
                <tr key={prov.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">#{prov.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{prov.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDetailsProvince(prov)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => openEdit(prov)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(prov.id!)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                      >
                        Apagar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nova Província</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Oficial</label>
                <input
                  type="text" required disabled={createLoading} value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                  placeholder="Ex: Luanda, Benguela..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Cancelar</button>
                <button type="submit" disabled={createLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold">
                  {createLoading ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingProvince && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Editar Província</h3>
              <button onClick={() => setEditingProvince(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Oficial</label>
                <input
                  type="text" required disabled={editLoading} value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setEditingProvince(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Cancelar</button>
                <button type="submit" disabled={editLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold">
                  {editLoading ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE APAGAR */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">Confirmar Eliminação</h3>
            <p className="text-xs text-slate-500 mb-6">Esta acção é irreversível. Os municípios e bairros associados podem ser afectados.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} disabled={deleteLoading} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-colors">
                {deleteLoading ? 'A eliminar...' : 'Sim, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES / AUDITORIA */}
      {detailsProvince && (
        <DetailsModal title="Detalhes da Província" onClose={() => setDetailsProvince(null)}>
          <DetailRow label="ID" value={`#${detailsProvince.id}`} />
          <DetailRow label="Nome" value={detailsProvince.name} />
          <AuditSection creator={detailsProvince.creator} updater={detailsProvince.updater} />
        </DetailsModal>
      )}
    </div>
  );
}
