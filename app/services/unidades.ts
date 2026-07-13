//Métodos para o registo e listagem de maternidades

import { api } from './api';
import { AuditUser } from './locations';

// ============================================================================
// INTERFACES / TIPOS PARA GESTÃO DE UNIDADES (MATERNIDADES)
// ============================================================================

// Payload necessário para registar uma nova maternidade/unidade hospitalar
export interface CreateUnityDto {
  name: string;
  nif: string;
  phoneNumber: string;
  email: string;
  neighborhoodId: number; // Vínculo territorial obrigatório (Bairro)
}

// Modelo estrutural real — baseado na resposta do Swagger
export interface UnityRecord {
  id: number;
  name: string;
  nif: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  creator?: AuditUser;
  updater?: AuditUser;
  neighborhood?: {
    id: number;
    name: string;
    municipality?: {
      id: number;
      name: string;
      province?: {
        id: number;
        name: string;
      };
    };
  };
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

// ============================================================================
// MÉTODOS DE CONSUMO DA API — UNIDADES
// ============================================================================
export const unityService = {

  /**
   * Registar uma nova Maternidade / Unidade Hospitalar no sistema integrado
   * Rota: POST /dnirn/unity
   */
  createUnity: async (data: CreateUnityDto): Promise<ApiResponse<UnityRecord>> => {
    const response = await api.post('/dnirn/unity', data);
    return response.data;
  },

  /**
   * Listar todas as maternidades e unidades integradas na rede nacional da DNIRN
   * Rota: GET /dnirn/unity/all
   */
  getAllUnities: async (): Promise<ApiResponse<UnityRecord[]>> => {
    const response = await api.get('/dnirn/unity/all');
    return response.data;
  },

  /**
   * Obter os detalhes de uma Unidade pelo seu ID
   * Rota: GET /dnirn/unity/getById/{id}
   */
  getUnityById: async (id: number): Promise<ApiResponse<UnityRecord>> => {
    const response = await api.get(`/dnirn/unity/getById/${id}`);
    return response.data;
  },

  /**
   * Obter os detalhes de uma Unidade pelo seu NIF
   * Rota: GET /dnirn/unity/getByNif/{nif}
   */
  getUnityByNif: async (nif: string): Promise<ApiResponse<UnityRecord>> => {
    const response = await api.get(`/dnirn/unity/getByNif/${nif}`);
    return response.data;
  },

  /**
   * Actualizar os dados de uma Unidade existente
   * Rota: PUT /dnirn/unity/{unityId}
   */
  updateUnity: async (unityId: number, data: {
    name: string;
    nif: string;
    phoneNumber: string;
    email: string;
    municipalityId: number;
    neighborhoodName: string;
  }): Promise<ApiResponse<UnityRecord>> => {
    const response = await api.put(`/dnirn/unity/${unityId}`, data);
    return response.data;
  },

  /**
   * Apagar uma Unidade pelo seu ID
   * Rota: DELETE /dnirn/unity/{id}
   */
  deleteUnity: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/unity/${id}`);
    return response.data;
  }
};