'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { unityService, UnityRecord } from '@/app/services/unidades'; 

export default function UnidadesListPage() {
  const router = useRouter();
  const [unidades, setUnidades] = useState<UnityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        setLoading(true);
        // Ajusta o método para o que usas no teu serviço (ex: getAllUnidades ou getUnities)
        const response = await unityService.getAllUnities();
        if (response.success) {
          setUnidades(response.data);
        }
      } catch (err) {
        console.error('Erro ao carregar unidades:', err);
        setError('Não foi possível carregar a lista de unidades hospitalares.');
      } finally {
        setLoading(false);
      }
    };

    fetchUnidades();
  }, []);

  //if (loading) return <div className="p-6 text-slate-400 text-sm animate-pulse">A carregar unidades...</div>;
  if (error) return <div className="p-6 text-rose-500 text-sm font-semibold">{error}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Unidades Hospitalares</h1>
          <p className="text-sm text-slate-500">Gestão de maternidades e hospitais integrados na DNIRN.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/unidades/create')} // Navega para o novo formulário
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          + Nova Unidade
        </button>
      </div>
      
      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="p-4">Nome da Unidade</th>
              <th className="p-4">NIF</th>
              <th className="p-4">Telemóvel</th>
              <th className="p-4">Localidade / Bairro</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {unidades.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma unidade cadastrada no sistema central.</td>
              </tr>
            ) : (
              unidades.map((uni) => (
                <tr key={uni.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-semibold text-slate-800">{uni.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-600">{uni.nif || 'N/D'}</td>
                  <td className="p-4 text-slate-600">{uni.phoneNumber || 'N/D'}</td>
                  <td className="p-4 text-slate-500">{uni.neighborhood?.name || 'N/D'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}