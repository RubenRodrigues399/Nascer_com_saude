'use client';

import React from 'react';
import { AuditUser } from '@/app/services/locations';

interface DetailsModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function DetailsModal({ title, onClose, children }: DetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>
        <div className="p-6 space-y-1 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Uma linha simples label/valor dentro do DetailsModal. */
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right break-words">{value}</span>
    </div>
  );
}

/** Bloco de auditoria: quem criou e quem actualizou o registo pela última vez. */
export function AuditSection({ creator, updater }: { creator?: AuditUser; updater?: AuditUser }) {
  if (!creator && !updater) return null;
  return (
    <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Auditoria</p>
      {creator && (
        <div className="flex justify-between items-start gap-4 py-1">
          <span className="text-xs text-slate-500">Criado por</span>
          <span className="text-xs text-right">
            <span className="font-semibold text-slate-700">{creator.name}</span>
            <span className="block font-mono text-[10px] text-slate-400">{creator.id}</span>
          </span>
        </div>
      )}
      {updater && (
        <div className="flex justify-between items-start gap-4 py-1">
          <span className="text-xs text-slate-500">Actualizado por</span>
          <span className="text-xs text-right">
            <span className="font-semibold text-slate-700">{updater.name}</span>
            <span className="block font-mono text-[10px] text-slate-400">{updater.id}</span>
          </span>
        </div>
      )}
    </div>
  );
}
