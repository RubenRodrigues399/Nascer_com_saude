// Gestão de Indivíduos/Cidadãos

import { api } from './api';
import { AuditUser } from './locations';

// ============================================================================
// INTERFACES / TIPOS — INDIVÍDUOS
// ============================================================================

// Payload do PUT /dnirn/individual (request usa type/number/expirationDate)
export interface IndividualUpdateDTO {
  individualId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  identificationDocument: {
    type: 'BI' | 'PASSAPORT' | 'DNV';
    number: string;
    expirationDate: string; // YYYY-MM-DD
  };
  birthDate: string; // YYYY-MM-DD
  municipalityId: number;
  neighborhoodName: string;
  phoneNumber?: string;
}

// Resposta da API (GET usa typeDocument/identificationNumber/expirationDateDocument)
export interface IndividualRecord {
  id: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  phoneNumber?: string;
  role?: string;
  identificationDocument: {
    typeDocument: 'BI' | 'PASSAPORT' | 'DNV';
    identificationNumber: string;
    expirationDateDocument: string;
  };
  neighborhood?: {
    id: number;
    name: string;
    municipality?: {
      id: number;
      name: string;
      province?: { id: number; name: string };
    };
  };
  createdAt?: string;
  updatedAt?: string;
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
// MÉTODOS DE CONSUMO DA API — INDIVÍDUOS
// ============================================================================
export const individualsService = {

  /** Rota: GET /dnirn/individual/all */
  getAllIndividuals: async (): Promise<ApiResponse<IndividualRecord[]>> => {
    const response = await api.get('/dnirn/individual/all');
    return response.data;
  },

  /** Rota: GET /dnirn/individual/byPhoneNumber/{phonenumber} */
  getIndividualByPhone: async (phoneNumber: string): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.get(`/dnirn/individual/byPhoneNumber/${phoneNumber}`);
    return response.data;
  },

  /** Rota: GET /dnirn/individual/byIndentificationNumber/{indentificationNumber} */
  getIndividualByIdNumber: async (identificationNumber: string): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.get(`/dnirn/individual/byIndentificationNumber/${identificationNumber}`);
    return response.data;
  },

  /** Rota: PUT /dnirn/individual */
  updateIndividual: async (data: IndividualUpdateDTO): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.put('/dnirn/individual', data);
    return response.data;
  },
};
