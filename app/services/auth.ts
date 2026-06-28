// Métodos de login, logout, refresh token
import axios from 'axios';
import { api } from './api';

// Cliente público — sem interceptor de token, para rotas abertas (recovery, login)
const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api-registro-civil-ixfv.onrender.com',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_DNIRN_API_KEY || 'dnirn00.@gmail.com',
  },
});

// ============================================================================
// INTERFACES / TIPOS REAIS EXTRAÍDOS DO TEU SWAGGER
// ============================================================================
export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface IdentificationDocument {
  typeDocument: 'BI' | 'PASSAPORT';
  identificationNumber: string;
  expirationDateDocument: string;
}

export interface IndividualData {
  id: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  identificationDocument: IdentificationDocument;
  birthDate: string;
  phoneNumber: string;
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
  professionalCreator?: {
    unity?: {
      id: number;
      name: string;
      nif: string;
      phoneNumber: string;
      email: string;
    }
  };
}

export interface LoginResponseData {
  professionalId: string;
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  tokenAccess: string;
  tokenRefresh: string;
  individual: IndividualData;
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

interface RefreshTokenResponseData {
  newTokenAcess: string;
}

// ============================================================================
// MÉTODOS DE AUTENTICAÇÃO
// ============================================================================
export const authService = {
  
  /** * Efetua o login do profissional usando número de telefone e senha (SMS)
   * Rota: POST /dnirn/auth/login
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponseData>> => {
    const response = await api.post('/dnirn/auth/login', credentials);
    return response.data;
  },

  /** * Renova o Token de Acesso (Access Token) expirado utilizando o Refresh Token de 24h
   * Rota: POST /dnirn/auth/refresh-token
   */
  refreshToken: async (tokenRefresh: string): Promise<ApiResponse<RefreshTokenResponseData>> => {
    const response = await api.post('/dnirn/auth/refresh-token', { refreshToken: tokenRefresh });
    return response.data;
  },

  /** * Encerra de forma segura a sessão do profissional no Back-End
   * Rota: POST /dnirn/auth/logout
   */
  logout: async (tokenAccess?: string): Promise<ApiResponse<string>> => {
    const config = tokenAccess
      ? { headers: { Authorization: `Bearer ${tokenAccess}` } }
      : {};

    const response = await api.post('/dnirn/auth/logout', {}, config);
    return response.data;
  },

  /** * Alterar a palavra-passe do profissional
   * Rota: POST /dnirn/auth/changePassword/{professionalId}
   */
  changePassword: async (professionalId: string, data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> => {
    const response = await api.post(`/dnirn/auth/changePassword/${professionalId}`, data);
    return response.data;
  },

  /** * Verificar o número de telefone para iniciar a recuperação de senha (rota pública)
   * Rota: GET /dnirn/professionals/verifyPhoneNumber-recover/{phoneNumber}
   */
  verifyPhoneForRecovery: async (phoneNumber: string): Promise<ApiResponse<void>> => {
    const response = await publicApi.get(`/dnirn/professionals/verifyPhoneNumber-recover/${phoneNumber}`);
    return response.data;
  },

  /** * Validar o código OTP recebido por SMS (rota pública)
   * Rota: POST /dnirn/auth/validateOTP
   */
  validateOTP: async (data: { phoneNumber: string; type: 'RECOVER_PASSWORD'; code: string }): Promise<ApiResponse<{ token: string }>> => {
    const response = await publicApi.post('/dnirn/auth/validateOTP', data);
    return response.data;
  },

  /** * Redefinir a senha usando o token retornado pelo validateOTP (rota pública)
   * Rota: POST /dnirn/auth/recover-password
   */
  recoverPassword: async (data: { phoneNumber: string; newPassword: string; token: string }): Promise<ApiResponse<void>> => {
    const response = await publicApi.post('/dnirn/auth/recover-password', data);
    return response.data;
  }
};