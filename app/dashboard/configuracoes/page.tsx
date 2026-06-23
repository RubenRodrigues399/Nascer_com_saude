'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';

export default function ConfiguracoesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Parâmetros de simulação de rede
  const [syncInterval, setSyncInterval] = useState('30');
  const [encryptionActive, setEncryptionActive] = useState(true);

  // US-15: Trazer os logs de auditoria locais
  const logsAuditoria = useLiveQuery(
    () => db.logs.orderBy('createdAt').reverse().limit(30).toArray(),
    []
  ) || [];

  useEffect(() => {
    if (!loading && user && user.roleProfessional !== 'ADMINISTRATIVE_SUPER' && 'ADMINISTRATIVE') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || (user && user.roleProfessional !== 'ADMINISTRATIVE_SUPER' && 'ADMINISTRATIVE')) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        A verificar permissões de segurança...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configurações Avançadas</h1>
        <p className="text-sm text-slate-500">Gestão de segurança física, infraestrutura local e trilhos de fiscalização.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: PARÂMETROS DO MOTOR OFFLINE */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">Motor de Sincronização</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Intervalo de Verificação de Rede</label>
              <select 
                value={syncInterval} 
                onChange={e => setSyncInterval(e.target.value)}
                className="w-full border p-2 rounded-lg bg-white text-sm"
              >
                <option value="15">A cada 15 segundos</option>
                <option value="30">A cada 30 segundos</option>
                <option value="60">A cada 1 minuto</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={encryptionActive} 
                  onChange={e => setEncryptionActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <p className="font-bold text-slate-700">Criptografia Local Ativa</p>
                  <p className="text-xs text-slate-400">Protege os dados em repouso (AES-256 no IndexedDB).</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 space-y-1">
            <p className="font-bold">▲ Atenção ao Operador</p>
            <p>Estas configurações afetam diretamente o consumo de hardware do posto informático local da maternidade.</p>
          </div>
        </div>

        {/* COLUNA DIREITA: TRILHO DE AUDITORIA EXPANDIDO */}
        <div className="lg:col-span-2">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[60vh]">
            <div className="border-b pb-3 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Trilho de Auditoria Interna (Logs)</h3>
                <p className="text-xs text-slate-400">Registo cronológico imutável de todas as ações executadas neste terminal.</p>
              </div>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold font-mono px-2 py-0.5 rounded">
                {logsAuditoria.length} registos
              </span>
            </div>

            {/* Contentor com scroll dedicado para os logs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {logsAuditoria.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-10">Nenhuma ação registada até ao momento.</p>
              ) : (
                logsAuditoria.map((log: any) => (
                  <div key={log.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-1 hover:bg-slate-100/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                        {log.acao}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString('pt-AO')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs pl-0.5">{log.detalhes}</p>
                    <div className="text-[10px] text-slate-400 font-medium pt-1 flex justify-between">
                      <span>Executado por: <strong className="text-blue-600">{log.nomeCompleto || 'Sistema'}</strong></span>
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-bold uppercase text-[9px]">{log.perfil}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}