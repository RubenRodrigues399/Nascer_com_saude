'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/app/services/auth';

type Step = 1 | 2 | 3;

export default function RecoverPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 2) {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  // --- STEP 1: Verificar telefone ---
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const phone = phoneNumber.trim();

    try {
      const result = await authService.verifyPhoneForRecovery(phone);
      if (result.success) {
        setStep(2);
      } else {
        setError(result.message || 'Número de telefone não encontrado no sistema.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível verificar o número. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: Validar OTP ---
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length < 6) {
      setError('Introduza o código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.validateOTP({
        phoneNumber: phoneNumber.trim(),
        type: 'RECOVER_PASSWORD',
        code,
      });
      if (result.success) {
        setStep(3);
      } else {
        setError(result.message || 'Código inválido ou expirado. Verifique o SMS.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao validar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: Nova senha ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.recoverPassword({
        phoneNumber: phoneNumber.trim(),
        newPassword,
        confirmPassword,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(result.message || 'Não foi possível redefinir a palavra-passe.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Identificação', 'Código SMS', 'Nova Senha'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-blue-50 text-blue-600 px-3 py-1 rounded-xl mb-3 font-bold text-xs border border-blue-100 select-none">
            MINJUSDH — DNIRN
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Recuperar Acesso</h1>
          <p className="text-slate-400 text-xs mt-1">Siga os passos para redefinir a sua palavra-passe</p>
        </div>

        {/* Indicador de passos */}
        <div className="flex items-center justify-between mb-8">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step;
            const isActive = step === n;
            const isDone = step > n;
            return (
              <React.Fragment key={n}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                    ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {isDone ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : n}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-blue-600' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${step > n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
            Palavra-passe redefinida com sucesso! A redirecionar para o login...
          </div>
        )}

        {/* PASSO 1 — Telefone */}
        {step === 1 && (
          <form onSubmit={handleVerifyPhone} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Número de Telefone
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                placeholder="Ex: 923000000"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Introduza o número associado à sua conta. Receberá um código por SMS.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl text-sm uppercase tracking-wider flex justify-center items-center gap-2 transition-all shadow-sm active:scale-[0.99]"
            >
              {loading ? 'A verificar...' : 'Enviar Código SMS'}
            </button>
          </form>
        )}

        {/* PASSO 2 — OTP */}
        {step === 2 && (
          <form onSubmit={handleValidateOtp} className="space-y-5">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
                Código recebido em <span className="text-slate-800">{phoneNumber}</span>
              </p>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    disabled={loading}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center border border-slate-300 rounded-xl text-lg font-black text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 transition-all"
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-3 text-center">
                O código expira em 10 minutos. Não o partilhe com ninguém.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
                disabled={loading}
                className="w-1/3 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading || otp.join('').length < 6}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                {loading ? 'A validar...' : 'Confirmar Código'}
              </button>
            </div>
          </form>
        )}

        {/* PASSO 3 — Nova senha */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nova Palavra-passe
              </label>
              <input
                type="password"
                required
                disabled={loading || success}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Confirmar Nova Palavra-passe
              </label>
              <input
                type="password"
                required
                disabled={loading || success}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 transition-all"
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setStep(2); setError(''); }}
                disabled={loading || success}
                className="w-1/3 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                {loading ? 'A guardar...' : 'Confirmar Alteração'}
              </button>
            </div>
          </form>
        )}

        {/* Link de retorno ao login */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-[11px] text-slate-400 hover:text-blue-600 font-semibold transition-colors">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
