'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  // Queries reativas para o resumo de métricas offline
  const totais = useLiveQuery(async () => {
    const todos = await db.records.toArray();
    return {
      total: todos.length,
      pendentes: todos.filter(r => r.status === 'pendente').length,
      sincronizados: todos.filter(r => r.status === 'sincronizado').length,
      erros: todos.filter(r => r.status === 'erro').length,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-800">
          Olá, {user?.fullName}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Bem-vindo ao sistema de Registo Civil. Maternidade Activa: <span className="font-semibold text-slate-700">{user?.unityName}</span>
        </p>
      </div>

      {/* Cartões de Estatísticas Reativas Offline (US-09) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Geral de Partos</div>
          <div className="text-3xl font-black text-slate-800 mt-2">{totais?.total ?? 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendentes de Sincronização</div>
          <div className="text-3xl font-black text-amber-600 mt-2">{totais?.pendentes ?? 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sincronizados com Sucesso</div>
          <div className="text-3xl font-black text-emerald-600 mt-2">{totais?.sincronizados ?? 0}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registos com Erro</div>
          <div className="text-3xl font-black text-rose-600 mt-2">{totais?.erros ?? 0}</div>
        </div>

      </div>

      {/* Atalhos Rápidos de Operação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <a 
          href="/dashboard/registo" 
          className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex flex-col justify-between group"
        >
          <div>
            <h3 className="font-bold text-blue-900 group-hover:text-blue-700 text-lg">Efectuar Novo Registo</h3>
            <p className="text-blue-700/70 text-sm mt-1">Abra o formulário passo a passo para registar um recém-nascido na maternidade.</p>
          </div>
          <span className="text-blue-600 font-bold text-sm mt-4 inline-block">Iniciar Fluxo ➔</span>
        </a>

        <a 
          href="/dashboard/listagem" 
          className="p-6 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors flex flex-col justify-between group"
        >
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Consultar Histórico / Reimprimir</h3>
            <p className="text-slate-500 text-sm mt-1">Pesquise assentos guardados no dispositivo e emita segundas vias do PDF.</p>
          </div>
          <span className="text-slate-700 font-bold text-sm mt-4 inline-block">Abrir Listagem ➔</span>
        </a>
      </div>
    </div>
  );
}