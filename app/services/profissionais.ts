//Gestão de funcionários/profissionais

import { api } from './api';
import { IndividualData } from './auth';
import { AuditUser } from './locations';

// ============================================================================
// INTERFACES / TIPOS PARA GESTÃO DE PROFISSIONAIS
// ============================================================================

export interface IdentificationDocumentInput {
  type: 'BI' | 'PASSAPORT' | 'DNV';
  number: string;
  expirationDate: string; // YYYY-MM-DD
}

export interface ProfessionalIndividualInput {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  identificationDocument: IdentificationDocumentInput;
  birthDate: string; // YYYY-MM-DD
  municipalityId: number;
  neighborhoodName: string;
  role: 'PROFESSIONAL' | 'FAMILY'; // Pode ser PROFESSIONAL ou FAMILY
}

// POST /dnirn/professionals
export interface CreateProfessionalDto {
  individual: ProfessionalIndividualInput;
  phoneNumber: string;
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  municipalityId: number; // obrigatório também na raiz
  idUnity: number;
}

// POST /dnirn/professionals/super
export interface CreateSuperProfessionalDto {
  individual: ProfessionalIndividualInput;
  phoneNumber: string;
}

// Modelo estrutural de como o profissional é retornado pela API
export interface ProfessionalRecord {
  id: string;
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  individual: IndividualData;
  unity?: {
    id: number;
    name: string;
    nif?: string;
    phoneNumber?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  creator?: AuditUser;
  updater?: AuditUser;
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

  /** Rota: POST /dnirn/professionals (ou /super para ADMINISTRATIVE_SUPER) */
 createProfessional: async (data: CreateProfessionalDto): Promise<ApiResponse<ProfessionalRecord>> => {
    let isSuperUser = false;
    let userUnityId = 1;

    if (typeof window !== 'undefined') {
      const session = sessionStorage.getItem('dnirn_session');
      if (session) {
        const parsed = JSON.parse(session);

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

    const payload: CreateProfessionalDto = {
      ...data,
      idUnity: data.idUnity || userUnityId, // data.idUnity sobrepõe; cai para a sessão só se vier vazio
    };

    // DEFINIÇÃO DINÂMICA DA ROTA: Se for super, aponta para /super, senão vai para a rota comum
    // Nota: A barra final é IMPORTANTE para a API (RESTful)
    const targetRoute = isSuperUser ? '/dnirn/professionals/super' : '/dnirn/professionals/';

    // O interceptor do api já adiciona Authorization automaticamente via sessionStorage
    const response = await api.post(targetRoute, payload);
    return response.data;
  },

  /** * Registar um Super Profissional com privilégios administrativos globais no sistema
   * Rota: POST /dnirn/professionals/super
   */
  createSuperProfessional: async (data: CreateSuperProfessionalDto): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.post('/dnirn/professionals/super', data);
    return response.data;
  },

  /** Rota: GET /dnirn/professionals/all */
  getAllProfessionals: async (): Promise<ApiResponse<ProfessionalRecord[]>> => {
    const response = await api.get('/dnirn/professionals/all');
    return response.data;
  },

  /** Rota: GET /dnirn/professionals/{professionalId} */
  getProfessionalById: async (professionalId: string): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.get(`/dnirn/professionals/${professionalId}`);
    return response.data;
  },

  /** Rota: GET /dnirn/professionals/byPhoneNumber/{phoneNumber} */
  getProfessionalByPhone: async (phoneNumber: string): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.get(`/dnirn/professionals/byPhoneNumber/${phoneNumber}`);
    return response.data;
  },

  /** Rota: GET /dnirn/professionals/verifyPhoneNumber-recover/{phoneNumber} */
  verifyPhoneNumberRecover: async (phoneNumber: string): Promise<ApiResponse<ProfessionalRecord>> => {
    const response = await api.get(`/dnirn/professionals/verifyPhoneNumber-recover/${phoneNumber}`);
    return response.data;
  },

  /** Rota: DELETE /dnirn/professionals/{professionalId} */
  deleteProfessional: async (professionalId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/professionals/${professionalId}`);
    return response.data;
  }
};