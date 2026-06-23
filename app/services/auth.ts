// Métodos de login, logout, refresh token
import { api } from './api';

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
    // Se passarmos o token manualmente (contingência), injetamos direto no cabeçalho da requisição
    const config = tokenAccess 
      ? { headers: { Authorization: `Bearer ${tokenAccess}` } }
      : {};
      
    const response = await api.post('/dnirn/auth/logout', {}, config);
    return response.data;
  }
};