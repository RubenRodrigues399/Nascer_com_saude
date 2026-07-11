// Serviço para recuperação de senha por SMS/OTP

import { api } from './api';

interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

interface ProfessionalRecord {
  id: string;
  phoneNumber: string;
  individual: {
    fullName: string;
    gender: string;
  };
}

interface ValidateOTPRequest {
  phoneNumber: string;
  type: 'RECOVER_PASSWORD';
  code: string;
}

interface ValidateOTPResponse {
  token: string; // Token necessário para a próxima etapa
  phoneNumber: string;
}

interface RecoverPasswordRequest {
  phoneNumber: string;
  newPassword: string;
  token: string;
}

export const passwordRecoveryService = {
  /**
   * Passo 1: Verifica o número de telefone e envia OTP por SMS
   * Rota: GET /dnirn/professionals/verifyPhoneNumber-recover/{phoneNumber}
   */
  verifyPhoneNumber: async (phoneNumber: string): Promise<ApiResponse<ProfessionalRecord>> => {
    console.log('[Recovery] Verificando número de telefone:', phoneNumber);
    try {
      // Normalizar número: remover +244, espaços, etc
      const normalizedPhone = phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
      
      const response = await api.get(`/dnirn/professionals/verifyPhoneNumber-recover/${normalizedPhone}`);
      console.log('[Recovery] ✅ Número verificado. OTP enviado para:', normalizedPhone);
      return response.data;
    } catch (error: any) {
      console.error('[Recovery] ❌ Erro ao verificar número:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Passo 2: Valida o código OTP recebido no SMS
   * Rota: POST /dnirn/auth/validateOTP
   */
  validateOTP: async (phoneNumber: string, code: string): Promise<ApiResponse<ValidateOTPResponse>> => {
    console.log('[Recovery] Validando OTP para:', phoneNumber);
    try {
      const normalizedPhone = phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
      
      const payload = {
        phoneNumber: normalizedPhone,
        type: 'RECOVER_PASSWORD',
        code: code.trim(),
      };
      
      console.log('[Recovery] Enviando:', payload);
      const response = await api.post('/dnirn/auth/validateOTP', payload);
      console.log('[Recovery] ✅ OTP validado. Token recebido.');
      return response.data;
    } catch (error: any) {
      console.error('[Recovery] ❌ Erro ao validar OTP:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Passo 3: Define a nova senha após validação do OTP
   * Rota: POST /dnirn/auth/recover-password
   */
  recoverPassword: async (
    phoneNumber: string,
    newPassword: string,
    token: string
  ): Promise<ApiResponse<any>> => {
    console.log('[Recovery] Redefinindo senha para:', phoneNumber);
    try {
      const normalizedPhone = phoneNumber.trim().replace(/\s/g, '').replace(/^\+?244/, '');
      
      const payload = {
        phoneNumber: normalizedPhone,
        newPassword: newPassword,
        token: token,
      };
      
      const response = await api.post('/dnirn/auth/recover-password', payload);
      console.log('[Recovery] ✅ Senha redefinida com sucesso!');
      return response.data;
    } catch (error: any) {
      console.error('[Recovery] ❌ Erro ao redefinir senha:', error.response?.data || error.message);
      throw error;
    }
  },
};
