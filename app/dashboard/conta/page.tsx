'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/app/services/auth';

export default function ContaPage() {
  const { user } = useAuth();

  // ── Estado para alterar senha ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Handler para alterar senha ─────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('A nova palavra-passe não pode ser igual à atual.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.changePassword(user!.professionalId, {
        currentPassword,
        newPassword,
      });
      if (result?.success) {
        setSuccess('Palavra-passe alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(result?.message || 'Falha ao alterar a palavra-passe.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Conta e Segurança</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gerir a sua palavra-passe — {user?.fullName}
        </p>
      </div>

      {/* Formulário para alterar senha */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-800">Alterar Palavra-Passe</h2>
          <p className="text-xs text-slate-500 mt-1">
            Utilize esta opção se conhece a sua palavra-passe atual e deseja alterá-la.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Palavra-passe Atual *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="A sua senha atual"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nova Palavra-passe *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Confirmar Nova Palavra-passe *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="Repita a nova senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all mt-6"
          >
            {loading ? 'A guardar...' : 'Confirmar Alteração'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            ℹ️ Se não se lembra da sua palavra-passe atual, pode <a href="/recover-password" className="text-blue-600 hover:underline font-bold">recuperá-la aqui</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
