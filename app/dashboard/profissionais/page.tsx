'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService, ProfessionalRecord } from '@/app/services/profissionais';

export default function ProfessionalsListPage() {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Confirmação de apagar
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = (msg: string, isError = false) => {
    isError ? setActionError(msg) : setActionMessage(msg);
    setTimeout(() => isError ? setActionError('') : setActionMessage(''), 3500);
  };

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const response = await professionalsService.getAllProfessionals();
      if (response.success) setProfessionals(response.data);
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
      setError('Não foi possível carregar a lista de profissionais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfessionals(); }, []);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    try {
      const res = await professionalsService.deleteProfessional(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        loadProfessionals();
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

  const roleLabel: Record<string, string> = {
    ADMINISTRATIVE: 'Administrativo',
    TECHNICAL: 'Técnico',
    ADMINISTRATIVE_SUPER: 'Super Admin',
  };

  const roleBadge: Record<string, string> = {
    ADMINISTRATIVE: 'bg-amber-50 text-amber-700 border-amber-200',
    TECHNICAL: 'bg-blue-50 text-blue-700 border-blue-200',
    ADMINISTRATIVE_SUPER: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  if (error) return <div className="p-6 text-rose-500 text-sm font-semibold">{error}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Profissionais</h1>
          <p className="text-sm text-slate-500">Gestão de profissionais integrados na plataforma.</p>
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

      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Nome Completo</th>
              <th className="p-4">Cargo / Função</th>
              <th className="p-4">Nº de Documento</th>
              <th className="p-4">Telemóvel</th>
              <th className="p-4 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 animate-pulse">A carregar profissionais...</td></tr>
            ) : professionals.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum profissional localizado na base central.</td></tr>
            ) : (
              professionals.map((pro) => (
                <tr key={pro.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-semibold text-slate-800">{pro.individual?.fullName}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge[pro.roleProfessional] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {roleLabel[pro.roleProfessional] || pro.roleProfessional}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600">{pro.individual?.identificationDocument?.identificationNumber || 'N/D'}</td>
                  <td className="p-4 text-slate-600">{pro.individual?.phoneNumber || 'N/D'}</td>
                  <td className="p-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setConfirmDeleteId(pro.id)}
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
    </div>
  );
}
