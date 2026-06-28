//Gestão de funcionários/profissionais

import { api } from './api';
import { IndividualData, IdentificationDocument } from './auth';

// ============================================================================
// INTERFACES / TIPOS PARA GESTÃO DE PROFISSIONAIS
// ============================================================================

// Payload necessário para registar um profissional comum
export interface CreateProfessionalDto {
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  unityId: number;
  individual: {
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    birthDate: string; // Formato YYYY-MM-DD
    phoneNumber: string;
    neighborhoodId: number;
    identificationDocument: IdentificationDocument;
  };
}

// Payload necessário para registar um Super Profissional
export interface CreateSuperProfessionalDto extends Omit<CreateProfessionalDto, 'roleProfessional'> {
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER'; 
}

// Modelo estrutural de como o profissional é retornado na listagem da API
export interface ProfessionalRecord {
  id: string;
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  unityId: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  individual: IndividualData; 
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

// ============================================================================
              // MÉTODOS DE CONSUMO DA API — PROFISSIONAIS
// ============================================================================
export const professionalsService = {

  /** * Registar um novo profissional associado a uma unidade/maternidade específica
   * Rota: POST /dnirn/professionals
   */
  /** * Registar um novo profissional associado a uma unidade/maternidade específica
   * Rota: POST /dnirn/professionals
   */
 createProfessional: async (data: CreateProfessionalDto): Promise<ApiResponse<ProfessionalRecord>> => {
    let token = '';
    let isSuperUser = false;
    let userUnityId = 1;

    if (typeof window !== 'undefined') {
      const session = sessionStorage.getItem('dnirn_session');
      if (session) {
        const parsed = JSON.parse(session);
        token = parsed.tokenAccess;
        
        // Descobrir se quem está a operar o sistema é um Super Administrador
        // Ajusta os campos 'role' ou 'roleProfessional' conforme vier guardado no objeto de user logado
        const userRole = parsed.user?.role || parsed.user?.roleProfessional;
        if (userRole === 'ADMINISTRATIVE_SUPER') {
          isSuperUser = true;
        }

        // Extrair a unidade real dele se houver
        if (parsed.user?.unityId) {
          userUnityId = Number(parsed.user.unityId);
        }
      }
    }

    const API_KEY = process.env.NEXT_PUBLIC_DNIRN_API_KEY || 'dnirn00.@gmail.com';

    const payload = {
      ...data,
      unityId: userUnityId
    };

    // DEFINIÇÃO DINÂMICA DA ROTA: Se for super, aponta para /super, senão vai para a rota comum
    const targetRoute = isSuperUser ? '/dnirn/professionals/super' : '/dnirn/professionals';
    
    console.log(`[DNIRN Auth] Operador detetado como Super? ${isSuperUser}. Encaminhando para: ${targetRoute}`);

    const response = await api.post(targetRoute, payload, {
      headers: {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  /** * Registar um Super Profissional com privilégios administrativos globais no sistema
   * Rota: POST /dnirn/professionals/super
   */
  createSuperProfessional: async (data: CreateSuperProfessionalDto): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.post('/dnirn/professionals/super', data);
    return response.data;
  },

  /** * Listar todos os profissionais registados na base central da DNIRN
   * Rota: GET /dnirn/professionals/all
   */
  getAllProfessionals: async (): Promise<ApiResponse<ProfessionalRecord[]>> => {
    const response = await api.get('/dnirn/professionals/all');
    return response.data;
  },

  /** * Obter o perfil detalhado de um funcionário específico através do seu ID
   * Rota: GET /dnirn/professionals/{professionalId}
   */
  getProfessionalById: async (professionalId: string): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.get(`/dnirn/professionals/${professionalId}`);
    return response.data;
  },

  /** * Consultar profissional pelo número de telefone
   * Rota: GET /dnirn/professionals/byPhoneNumber/{phoneNumber}
   */
  getProfessionalByPhone: async (phoneNumber: string): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.get(`/dnirn/professionals/byPhoneNumber/${phoneNumber}`);
    return response.data;
  },

  /** * Eliminar um profissional pelo ID
   * Rota: DELETE /dnirn/professionals/{professionalId}
   */
  deleteProfessional: async (professionalId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/professionals/${professionalId}`);
    return response.data;
  }
};