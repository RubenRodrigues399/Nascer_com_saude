'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/app/services/auth';

export default function ContaPage() {
  const { user } = useAuth();

  // ── Estado para alterar senha ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Handler para alterar senha ─────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('A nova palavra-passe não pode ser igual à atual.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.changePassword(user!.professionalId, {
        currentPassword,
        newPassword,
      });
      if (result?.success) {
        setSuccess('Palavra-passe alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(result?.message || 'Falha ao alterar a palavra-passe.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Conta e Segurança</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gerir a sua palavra-passe — {user?.fullName}
        </p>
      </div>

      {/* Formulário para alterar senha */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-black text-slate-800">Alterar Palavra-Passe</h2>
          <p className="text-xs text-slate-500 mt-1">
            Utilize esta opção se conhece a sua palavra-passe atual e deseja alterá-la.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Palavra-passe Atual *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="A sua senha atual"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nova Palavra-passe *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Confirmar Nova Palavra-passe *
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
              placeholder="Repita a nova senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all mt-6"
          >
            {loading ? 'A guardar...' : 'Confirmar Alteração'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            ℹ️ Se não se lembra da sua palavra-passe atual, pode <a href="/recover-password" className="text-blue-600 hover:underline font-bold">recuperá-la aqui</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

  // ── Alterar senha (conhece a senha atual) ──────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // ── Redefinir por OTP (não sabe a senha atual) ─────────────────────────────
  const [otpStep, setOtpStep] = useState<OtpStep>(1);
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (otpStep === 2) otpRefs.current[0]?.focus();
  }, [otpStep]);

  // ── Handlers — Alterar Senha ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (newPassword.length < 6) {
      setChangeError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }
    if (newPassword === currentPassword) {
      setChangeError('A nova palavra-passe não pode ser igual à atual.');
      return;
    }

    setChangeLoading(true);
    try {
      const result = await authService.changePassword(user!.professionalId, {
        currentPassword,
        newPassword,
      });
      if (result?.success) {
        setChangeSuccess('Palavra-passe alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setChangeSuccess(''), 4000);
      } else {
        setChangeError(result?.message || 'Falha ao alterar a palavra-passe.');
      }
    } catch (err: any) {
      setChangeError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setChangeLoading(false);
    }
  };

  // ── Handlers — Redefinir por OTP ───────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const phone = otpPhone.trim();
    if (phone.length < 9) {
      setOtpError('Introduza um número de telefone válido.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await authService.verifyPhoneForRecovery(phone);
      if (result?.success) {
        setOtpStep(2);
      } else {
        setOtpError(result?.message || 'Número não encontrado no sistema.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Erro ao enviar o código. Tente novamente.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleValidateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Introduza o código completo de 6 dígitos.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await authService.validateOTP({
        phoneNumber: otpPhone.trim(),
        type: 'RECOVER_PASSWORD',
        code,
      });
      if (result?.success) {
        setOtpToken(result.data?.token ?? '');
        setOtpStep(3);
      } else {
        setOtpError(result?.message || 'Código inválido ou expirado.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Erro ao validar o código.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (otpNewPassword.length < 6) {
      setOtpError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (otpNewPassword !== otpConfirmPassword) {
      setOtpError('A confirmação não coincide com a nova palavra-passe.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await authService.recoverPassword({
        phoneNumber: otpPhone.trim(),
        newPassword: otpNewPassword,
        token: otpToken,
      });
      if (result?.success) {
        setOtpSuccess('Palavra-passe redefinida com sucesso.');
        setOtpStep(1);
        setOtp(['', '', '', '', '', '']);
        setOtpPhone('');
        setOtpNewPassword('');
        setOtpConfirmPassword('');
        setOtpToken('');
        setTimeout(() => setOtpSuccess(''), 4000);
      } else {
        setOtpError(result?.message || 'Não foi possível redefinir a palavra-passe.');
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Erro de comunicação com o servidor.');
    } finally {
      setOtpLoading(false);
    }
  };

  const resetOtpFlow = () => {
    setOtpStep(1);
    setOtp(['', '', '', '', '', '']);
    setOtpPhone('');
    setOtpNewPassword('');
    setOtpConfirmPassword('');
    setOtpToken('');
    setOtpError('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Conta e Segurança</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gerir a sua palavra-passe — {user?.fullName}
        </p>
      </div>

      {/* Tabs — OTP só visível para ADMINISTRATIVE e ADMINISTRATIVE_SUPER */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('change')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'change'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Alterar Palavra-Passe
        </button>
        {isAdmin && (
        <button
          onClick={() => { setActiveTab('otp'); resetOtpFlow(); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'otp'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Redefinir por Código SMS
        </button>
        )}
      </div>

      {/* ── TAB A: Alterar Senha ──────────────────────────────────────────── */}
      {activeTab === 'change' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs text-slate-500 mb-5">
            Utilize esta opção se conhece a sua palavra-passe atual e deseja alterá-la.
          </p>

          {changeError && (
            <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
              {changeError}
            </div>
          )}
          {changeSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
              {changeSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Palavra-passe Atual
              </label>
              <input
                type="password"
                required
                disabled={changeLoading}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
                placeholder="A sua senha atual"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nova Palavra-passe
              </label>
              <input
                type="password"
                required
                disabled={changeLoading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
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
                disabled={changeLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
                placeholder="Repita a nova senha"
              />
            </div>
            <button
              type="submit"
              disabled={changeLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all mt-2"
            >
              {changeLoading ? 'A guardar...' : 'Confirmar Alteração'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB B: Redefinir por OTP — apenas ADMINISTRATIVE e ADMINISTRATIVE_SUPER ── */}
      {activeTab === 'otp' && isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs text-slate-500 mb-5">
            Utilize esta opção se não sabe a palavra-passe atual. Um código será enviado por SMS para verificar a sua identidade.
          </p>

          {/* Indicador de passos */}
          <div className="flex items-center justify-between mb-6">
            {(['Verificar Telefone', 'Código SMS', 'Nova Senha'] as const).map((label, i) => {
              const n = (i + 1) as OtpStep;
              const isActive = otpStep === n;
              const isDone = otpStep > n;
              return (
                <React.Fragment key={n}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                      ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isDone ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : n}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? 'text-blue-600' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${otpStep > n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {otpError && (
            <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold">
              {otpError}
            </div>
          )}
          {otpSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs rounded-lg font-bold">
              {otpSuccess}
            </div>
          )}

          {/* Passo 1 — Verificar telefone */}
          {otpStep === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Número de Telefone Registado
                </label>
                <input
                  type="text"
                  required
                  disabled={otpLoading}
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
                  placeholder="Ex: 923000000"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Introduza o número associado à sua conta. Será enviado um código OTP por SMS.
                </p>
              </div>
              <button
                type="submit"
                disabled={otpLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-sm uppercase tracking-wider transition-all"
              >
                {otpLoading ? 'A enviar...' : 'Enviar Código SMS'}
              </button>
            </form>
          )}

          {/* Passo 2 — Validar OTP */}
          {otpStep === 2 && (
            <form onSubmit={handleValidateOtp} className="space-y-5">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
                  Código recebido em <span className="text-slate-800">{otpPhone}</span>
                </p>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      disabled={otpLoading}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-10 h-11 text-center border border-slate-300 rounded-xl text-lg font-black text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 transition-all"
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
                  onClick={() => { setOtpStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                  disabled={otpLoading}
                  className="w-1/3 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs uppercase"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otp.join('').length < 6}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  {otpLoading ? 'A validar...' : 'Confirmar Código'}
                </button>
              </div>
            </form>
          )}

          {/* Passo 3 — Nova senha */}
          {otpStep === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nova Palavra-passe
                </label>
                <input
                  type="password"
                  required
                  disabled={otpLoading}
                  value={otpNewPassword}
                  onChange={(e) => setOtpNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
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
                  disabled={otpLoading}
                  value={otpConfirmPassword}
                  onChange={(e) => setOtpConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
                  placeholder="Repita a nova senha"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setOtpStep(2); setOtpError(''); }}
                  disabled={otpLoading}
                  className="w-1/3 border border-slate-300 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs uppercase"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  {otpLoading ? 'A guardar...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
