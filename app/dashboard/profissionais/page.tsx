'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { professionalsService, ProfessionalRecord } from '@/app/services/profissionais';

export default function ProfessionalsListPage() {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchElements = async () => {
      try {
        setLoading(true);
        const response = await professionalsService.getAllProfessionals();
        if (response.success) {
          setProfessionals(response.data);
        }
      } catch (err) {
        console.error('Erro ao carregar profissionais:', err);
        setError('Não foi possível carregar a lista de profissionais.');
      } finally {
        setLoading(false);
      }
    };

    fetchElements();
  }, []);

  if (loading) return <div className="p-6 text-slate-400 text-sm animate-pulse">A carregar profissionais...</div>;
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
          onClick={() => router.push('/dashboard/profissionais/create')} // 🚀 Redireciona de forma nativa
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          + Novo Profissional
        </button>
      </div>
      
      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Nome Completo</th>
              <th className="p-4">Cargo / Função</th>
              <th className="p-4">Nº de Documento</th>
              <th className="p-4">Telemóvel</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {professionals.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum profissional localizado na base central.</td>
              </tr>
            ) : (
              professionals.map((pro) => (
                <tr key={pro.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-semibold text-slate-800">{pro.individual?.fullName}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      pro.roleProfessional === 'ADMINISTRATIVE' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {pro.roleProfessional}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-600">{pro.individual?.identificationDocument?.identificationNumber || 'N/D'}</td>
                  <td className="p-4 text-slate-600">{pro.individual?.phoneNumber || 'N/D'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}