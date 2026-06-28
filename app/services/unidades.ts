//Métodos para o registo e listagem de maternidades

import { api } from './api';

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

// Modelo estrutural de como a Unidade é retornada na API
export interface UnityRecord {
  id: number;
  name: string;
  nif: string;
  phoneNumber: string;
  email: string;
  neighborhoodId: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  // Caso o teu Back-End traga o objeto do bairro aninhado, 
  // o teu grupo pode expandir esta propriedade mais tarde.
  neighborhood?: {
    id: number;
    name: string;
    municipalityId: number;
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
  updateUnity: async (unityId: number, data: Partial<CreateUnityDto> & { unityId: number }): Promise<ApiResponse<UnityRecord>> => {
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