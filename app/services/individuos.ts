// Gestão de Indivíduos/Cidadãos

import { api } from './api';

// ============================================================================
// INTERFACES / TIPOS — INDIVÍDUOS
// ============================================================================

export interface IdentificationDocumentRequest {
  type: 'BI' | 'PASSAPORT' | 'DNV';
  number: string;
  expirationDate: string; // YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
}

export interface IndividualUpdateDTO {
  individualId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  identificationDocument: IdentificationDocumentRequest;
  birthDate: string; // YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  municipalityId: number;
  neighborhoodName: string;
  phoneNumber?: string; // ^(?:\+?244)?(9\d{8})$
}

export interface IndividualRecord {
  id: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  phoneNumber: string;
  identificationDocument: {
    type: 'BI' | 'PASSAPORT' | 'DNV';
    number: string;
    expirationDate: string;
  };
  municipality?: {
    id: number;
    name: string;
  };
  neighborhood?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
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

  /**
   * Carregar todos os indivíduos/cidadãos registados
   * Rota: GET /dnirn/individual/all
   */
  getAllIndividuals: async (): Promise<ApiResponse<IndividualRecord[]>> => {
    const response = await api.get('/dnirn/individual/all');
    return response.data;
  },

  /**
   * Carregar informações de um indivíduo pelo número de telefone
   * Rota: GET /dnirn/individual/byPhoneNumber/{phonenumber}
   */
  getIndividualByPhone: async (phoneNumber: string): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.get(`/dnirn/individual/byPhoneNumber/${phoneNumber}`);
    return response.data;
  },

  /**
   * Carregar informações de um indivíduo pelo número de identificação (BI/Passaporte/DNV)
   * Rota: GET /dnirn/individual/byIndentificationNumber/{indentificationNumber}
   */
  getIndividualByIdNumber: async (identificationNumber: string): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.get(`/dnirn/individual/byIndentificationNumber/${identificationNumber}`);
    return response.data;
  },

  /**
   * Actualizar informações de um cidadão
   * Rota: PUT /dnirn/individual
   */
  updateIndividual: async (data: IndividualUpdateDTO): Promise<ApiResponse<IndividualRecord>> => {
    const response = await api.put('/dnirn/individual', data);
    return response.data;
  },
};
