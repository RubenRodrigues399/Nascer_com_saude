'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function IdleWarningModal() {
  const { idleWarningOpen, idleSecondsLeft, keepSessionAlive, logout } = useAuth();

  if (!idleWarningOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">Ainda está aí?</h3>
        <p className="text-xs text-slate-500 mb-1">
          Por segurança, a sua sessão vai terminar por inatividade em:
        </p>
        <p className="text-3xl font-black text-amber-600 my-3 tabular-nums">{idleSecondsLeft}s</p>
        <div className="flex gap-3">
          <button
            onClick={() => logout()}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Terminar sessão
          </button>
          <button
            onClick={keepSessionAlive}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Continuar sessão
          </button>
        </div>
      </div>
    </div>
  );
}
