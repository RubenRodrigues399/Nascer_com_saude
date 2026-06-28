'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateAssentoPDF } from '@/utils/pdfGenerator';
import { logAction } from '@/utils/audit';
import { newbornService } from '@/app/services/recem-nascidos';

export default function RecemNascidosPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [apiRecords, setApiRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Consulta local IndexedDB
  const localRecords = useLiveQuery(() => db.records.orderBy('createdAt').reverse().toArray()) || [];

  // Carrega dados da API ao iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await newbornService.getAllNewborns();
        if (response.success) {
          setApiRecords(response.data);
        }
      } catch (err) {
        console.error('Erro ao buscar da API, usando dados locais:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Junta ou prioriza os registos para exibição
  const recordsToDisplay = apiRecords.length > 0 ? apiRecords : localRecords;

  // Filtro Reativo
  const filteredRecords = recordsToDisplay.filter(record => {
    const nomeBaby = record.nomeCrianca || record.individualChild?.fullName || '';
    const nomeMother = record.nomeMae || record.mother?.fullName || '';
    return nomeBaby.toLowerCase().includes(searchTerm.toLowerCase()) ||
           nomeMother.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Registo de Recém-nascidos</h1>
          <p className="text-sm text-slate-500">Consulte o histórico central ou emita novos assentos de nascimento.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/recem-nascidos/create')} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap"
        >
          + Registar Nascimento
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <input 
          type="text"
          placeholder="Pesquisar por nome da criança ou da mãe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-800"
        />
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">Cód. Registo</th>
                <th className="px-6 py-3">Criança / Género</th>
                <th className="px-6 py-3">Progenitores & Origem</th>
                <th className="px-6 py-3">Data / Hora</th>
                <th className="px-6 py-3">Sinc.</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse">A carregar registos da rede DNIRN...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/50">
                    Nenhum assento de nascimento localizado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const id = record.id || record.code || 'N/D';
                  const nomeCrianca = record.nomeCrianca || record.individualChild?.fullName;
                  const sexo = record.sexo || (record.individualChild?.gender === 'MALE' ? 'M' : 'F');
                  const nomeMae = record.nomeMae || record.mother?.fullName;
                  const nomePai = record.nomePai || record.father?.fullName || 'Não Declarado';
                  const local = record.naturalDe || record.placeOfBirth || 'Hospital';
                  const dataNasc = record.dataNascimento || record.individualChild?.birthDate?.split('T')[0];
                  const horaNasc = record.horaNascimento || record.individualChild?.birthDate?.split('T')[1]?.substring(0,5) || '00:00';

                  return (
                    <tr key={id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-600 text-xs">{id.substring(0, 15)}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{nomeCrianca}</div>
                        <div className="text-xs text-slate-400 font-medium">{sexo === 'M' ? 'Masculino' : 'Feminino'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        <div><span className="font-semibold text-slate-400">Mãe:</span> {nomeMae}</div>
                        <div><span className="font-semibold text-slate-400">Pai:</span> {nomePai}</div>
                        <div className="text-[11px] text-blue-600 italic font-medium">{local}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                        <div>{dataNasc}</div>
                        <div className="text-slate-400 font-mono mt-0.5">{horaNasc}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          record.status === 'pendente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {record.status === 'pendente' ? 'Pendente' : 'Sinc'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/recem-nascidos/${id}`)}
                            className="text-slate-600 hover:text-slate-800 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Ver
                          </button>
                          <button
                            onClick={async () => {
                              await logAction('Reimpressão de PDF', `Segunda via emitida para ID: ${id}`);
                              generateAssentoPDF({ id, nomeCrianca, dataNascimento: dataNasc, horaNascimento: horaNasc, sexo, nomeMae, nomePai, naturalDe: local, municipio: '', provincia: '' });
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Reimprimir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}