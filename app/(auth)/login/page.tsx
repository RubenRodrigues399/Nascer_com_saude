'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { logAction } from '@/utils/audit';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Proteção de Rota: Se o utilizador já estiver autenticado, desvia direto para o Dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setIsSubmitting(true);

    // Captura os valores reais digitados pelo utilizador, removendo espaços extras
    const finalPhone = phoneNumber.trim();
    const finalPassword = password.trim();

    try {
      // Executa a chamada à API Real via Contexto
      const result = await login(finalPhone, finalPassword);

    // Segurança: Se a API ou o contexto retornarem algo inválido
    if (!result) {
      throw new Error('A API de autenticação retornou uma resposta vazia.');
    }

    if (result.success) {
      setStatusMessage(result.message || 'Acesso autorizado!');
      
      // 2. Tenta gravar a auditoria, mas NÃO bloqueia o login se a auditoria falhar
      try {
        if (logAction) {
          await logAction(
            'Login Sucesso', 
            `Profissional entrou no sistema via terminal móvel.`,
            result.user?.fullName || 'Utilizador Autónomo',
            result.user?.roleProfessional || 'Professional'
          );
        }
      } catch (auditError) {
        console.error('Erro (Não-Bloqueante) ao gravar log de auditoria:', auditError);
      }
      
      // 3. Redireciona o utilizador
      setTimeout(() => { 
        router.push('/dashboard'); 
      }, 800);

    } else {
      // Se as credenciais estiverem erradas, liberta o botão e mostra o erro
      setError(result.message || 'Credenciais incorretas.');
      setIsSubmitting(false);
    }

  } catch (err: any) {
    // SE CAIR AQUI: Erro de rede, CORS, API offline ou crash de código
    console.error('Erro crítico capturado no LoginPage:', err);
    
    setError(
      err.message && err.message.includes('Failed to fetch') 
        ? 'Não foi possível conectar ao servidor. Verifique a sua ligação à internet ou se a API está online.'
        : `Erro de comunicação: ${err.message || 'Falha inesperada.'}`
    );
    
    // CRUCIAL: Liberta sempre o estado para o utilizador poder tentar novamente
    setIsSubmitting(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-50 text-blue-600 px-3 py-1 rounded-xl mb-3 font-bold text-xs border border-blue-100 select-none">
            MINJUSDH — DNIRN
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Acesso ao Sistema</h1>
          <p className="text-slate-400 text-xs mt-1">Insira o número de telefone e a senha recebida por SMS</p>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold animate-fadeIn">{error}</div>}
        {statusMessage && <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold animate-fadeIn">{statusMessage}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Telefone</label>
            <input
              type="text" 
              required 
              disabled={isSubmitting} 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
              placeholder="Ex: 923000000 ou 'admin'"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Palavra-passe (SMS)</label>
            <input
              type="password" 
              required 
              disabled={isSubmitting} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
              placeholder="Ex: 123456"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl text-sm uppercase tracking-wider flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.99]"
          >
            {isSubmitting ? 'A verificar...' : 'Entrar no Sistema'}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => router.push('/recover-password')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
            >
              Esqueceu a palavra-passe?
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}