'use client';

import React, { useState, useEffect } from 'react';
import { locationsService, Province } from '@/app/services/locations';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/utils/audit';

export default function ProvinciasPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega as províncias diretamente da API ao montar o ecrã
  const loadProvinces = async () => {
    setLoading(true);
    try {
      const res = await locationsService.getAllProvinces();
      if (res.success) {
        setProvinces(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar províncias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // Chamada limpa à API via Serviço
      const res = await locationsService.createProvince({ name: name.trim() });

      if (res.success) {
        if (logAction) {
          await logAction(
            'Configuração Geográfica', 
            `Província territorial "${name}" foi cadastrada via API.`,
            user?.fullName,
            user?.roleProfessional
          );
        }
        setName('');
        setIsModalOpen(false);
        loadProvinces(); // Recarrega a tabela de imediato
      }
    } catch (err) {
      alert('Erro ao registar província no servidor.');
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Províncias</h1>
          <p className="text-sm text-slate-500">Gestão de províncias.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
        >
          + Nova Província
        </button>
      </div>

      {/* TABELA DE REGISTOS */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3">ID Remoto</th>
              <th className="px-6 py-3">Nome da Província</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={2} className="px-6 py-10 text-center text-slate-400">A carregar dados do servidor...</td></tr>
            ) : provinces.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-10 text-center text-slate-400 italic">
                  Nenhuma província introduzida. Clique em "+ Nova Província" para começar.
                </td>
              </tr>
            ) : (
              provinces.map((prov) => (
                <tr key={prov.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">#{prov.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{prov.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">Registrar Província via API Body</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleCadastrar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Oficial da Província</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800" 
                  placeholder="Ex: Luanda, Benguela, Huambo..." 
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Salvar Província</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}