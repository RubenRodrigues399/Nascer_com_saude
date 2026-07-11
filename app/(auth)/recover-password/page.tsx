'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/app/services/auth';

type Step = 'phone' | 'otp' | 'password' | 'done';

export default function RecoverPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (raw: string) =>
    raw.trim().replace(/\s/g, '').replace(/^\+?244/, '');

  // Passo 1: enviar OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phone = formatPhone(phoneNumber);
    if (!/^9\d{8}$/.test(phone)) {
      setError('Número inválido. Introduza 9 dígitos: Ex: 923394019');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyPhoneForRecovery(phone);
      if (res.success) {
        setStep('otp');
      } else {
        setError(res.message || 'Não foi possível enviar o código OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 2: validar OTP
  const handleValidateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Introduza o código recebido por SMS.'); return; }
    setLoading(true);
    try {
      const phone = formatPhone(phoneNumber);
      const payload = { phoneNumber: phone, type: 'RECOVER_PASSWORD' as const, code: otp.trim() };
      console.log('[DEBUG] validateOTP payload enviado:', payload);
      const res = await authService.validateOTP(payload);
      console.log('[DEBUG] validateOTP resposta completa:', res);
      console.log('[DEBUG] validateOTP data:', res.data);
      if (res.success) {
        const token = res.data?.token || '';
        console.log('[DEBUG] Token extraído:', token);
        setOtpToken(token);
        setStep('password');
      } else {
        setError(res.message || 'Código inválido ou expirado.');
      }
    } catch (err: any) {
      console.error('[DEBUG] validateOTP erro completo:', err.response?.data || err);
      setError(err.response?.data?.message || 'Erro ao validar o código OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 3: definir nova senha
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('A nova palavra-passe deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('As palavras-passe não coincidem.'); return; }
    setLoading(true);
    try {
      const phone = formatPhone(phoneNumber);
      const payload = { phoneNumber: phone, newPassword, token: otpToken };
      console.log('[DEBUG] recoverPassword payload enviado:', payload);
      const res = await authService.recoverPassword(payload);
      console.log('[DEBUG] recoverPassword resposta:', res);
      if (res.success) {
        setStep('done');
      } else {
        setError(res.message || 'Erro ao redefinir a palavra-passe.');
      }
    } catch (err: any) {
      console.error('[DEBUG] recoverPassword erro completo:', err.response?.data || err);
      setError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    phone: 'Recuperar Palavra-passe',
    otp: 'Verificar Código SMS',
    password: 'Definir Nova Palavra-passe',
    done: 'Palavra-passe Alterada',
  };

  const stepDesc: Record<Step, string> = {
    phone: 'Introduza o número de telefone registado. Receberá um código SMS.',
    otp: `Introduza o código de 6 dígitos enviado para ${phoneNumber}.`,
    password: 'Defina uma nova palavra-passe segura.',
    done: 'A sua palavra-passe foi redefinida com sucesso.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">

        {/* Indicador de passos */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {(['phone', 'otp', 'password'] as Step[]).map((s, i) => {
            const steps: Step[] = ['phone', 'otp', 'password'];
            const currentIdx = steps.indexOf(step === 'done' ? 'password' : step);
            const isDone = steps.indexOf(s) < currentIdx || step === 'done';
            const isActive = s === step || (step === 'done' && s === 'password');
            return (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-px ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-slate-800">{stepTitles[step]}</h1>
          <p className="text-slate-400 text-xs mt-1">{stepDesc[step]}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">{error}</div>
        )}

        {/* Passo 1: Telefone */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Número de Telefone</label>
              <input
                type="text" required disabled={loading}
                value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                placeholder="Ex: 923394019"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">9 dígitos, sem prefixo 244</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider">
              {loading ? 'A enviar...' : 'Enviar Código SMS'}
            </button>
            <button type="button" onClick={() => router.push('/login')}
              className="w-full border border-slate-300 text-slate-500 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
              Voltar ao Login
            </button>
          </form>
        )}

        {/* Passo 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleValidateOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Código OTP</label>
              <input
                type="text" required disabled={loading}
                value={otp} onChange={e => setOtp(e.target.value)}
                placeholder="Ex: 123456"
                maxLength={8}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-center tracking-[0.4em] focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 text-lg"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider">
              {loading ? 'A verificar...' : 'Verificar Código'}
            </button>
            <button type="button" disabled={loading} onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full border border-slate-300 text-slate-500 hover:bg-slate-50 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
              Reenviar Código
            </button>
          </form>
        )}

        {/* Passo 3: Nova senha */}
        {step === 'password' && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nova Palavra-passe</label>
              <input
                type="password" required disabled={loading}
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirmar Nova Palavra-passe</label>
              <input
                type="password" required disabled={loading}
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider">
              {loading ? 'A guardar...' : 'Confirmar Nova Palavra-passe'}
            </button>
          </form>
        )}

        {/* Concluído */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">Pode agora entrar no sistema com a nova palavra-passe.</p>
            <button onClick={() => router.push('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider">
              Ir para o Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
