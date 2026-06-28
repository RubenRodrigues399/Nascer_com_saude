//Métodos de Províncias, Municípios e Bairros

import { api } from './api';

// ============================================================================
// INTERFACES / TIPOS (Garante autocomplete perfeito para o teu grupo)
// ============================================================================
export interface Province {
  id?: number;
  name: string;
}

export interface Municipality {
  id?: number;
  name: string;
  provinceId: number;
}

export interface Neighborhood {
  id: number;
  name: string;
  municipality?: {
    id: number;
    name: string;
  };
}

// ApiResponse genérica baseada no padrão do teu Back-End
interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

// ============================================================================
// MÉTODOS DE CONSUMO DA API
// ============================================================================
export const locationsService = {

  // --- PROVÍNCIAS ---

  /** Registrar uma nova Província */
  createProvince: async (data: Province): Promise<ApiResponse<Province>> => {
    const response = await api.post('/dnirn/provinces', data);
    return response.data;
  },

  /** Listar todas as Províncias cadastradas */
  getAllProvinces: async (): Promise<ApiResponse<Province[]>> => {
    const response = await api.get('/dnirn/provinces/all');
    return response.data;
  },

  /** Editar dados de uma Província */
  updateProvince: async (provinceId: number, data: { name: string }): Promise<ApiResponse<Province>> => {
    const response = await api.put(`/dnirn/provinces/${provinceId}`, data);
    return response.data;
  },

  /** Apagar uma Província pelo ID */
  deleteProvince: async (provinceId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/provinces/${provinceId}`);
    return response.data;
  },

  // --- MUNICÍPIOS ---

  /** Registrar um novo Município */
  createMunicipality: async (data: Municipality): Promise<ApiResponse<Municipality>> => {
    const response = await api.post('/dnirn/municipalities', data);
    return response.data;
  },

  /** Listar todas as Províncias com os seus Municípios */
  getAllMunicipalities: async (): Promise<ApiResponse<Province[]>> => {
    const response = await api.get('/dnirn/provinces');
    return response.data;
  },

  /** Obter detalhes de um Município específico por ID */
  getMunicipalityById: async (id: number): Promise<ApiResponse<Municipality>> => {
    const response = await api.get(`/dnirn/municipalities/${id}`);
    return response.data;
  },

  /** Listar todos os Municípios vinculados a uma determinada Província */
  getMunicipalitiesByProvince: async (provinceId: number): Promise<ApiResponse<Municipality[]>> => {
    const response = await api.get(`/dnirn/municipalities/byProvinceId/${provinceId}`);
    return response.data;
  },

  /** Editar dados de um Município */
  updateMunicipality: async (municipalityId: number, data: { name: string; provinceId: number }): Promise<ApiResponse<Municipality>> => {
    const response = await api.put(`/dnirn/municipalities/${municipalityId}`, data);
    return response.data;
  },

  /** Eliminar um Município pelo ID */
  deleteMunicipality: async (municipalityId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/municipalities/${municipalityId}`);
    return response.data;
  },

  // --- BAIRROS ---

  /** Registrar um novo Bairro */
  createBairro: async (data: Neighborhood): Promise<ApiResponse<Neighborhood>> => {
    const response = await api.post('/dnirn/neighborhoods', data);
    return response.data;
  },

  /** Obter detalhes de um Bairro específico por ID */
  getBairroById: async (id: number): Promise<ApiResponse<Neighborhood>> => {
    const response = await api.get(`/dnirn/neighborhoods/${id}`);
    return response.data;
  },

  /** Listar todos os Bairros vinculados a um determinado Município */
  getBairrosByMunicipality: async (municipalityId: number): Promise<ApiResponse<Neighborhood[]>> => {
    const response = await api.get(`/dnirn/neighborhoods/byMunicipalityId/${municipalityId}`);
    return response.data;
  },

  /** Listar todos os Bairros do sistema */
  getAllBairros: async (): Promise<ApiResponse<Neighborhood[]>> => {
    const response = await api.get('/dnirn/neighborhoods/all');
    return response.data;
  },

  /** Actualizar dados de um Bairro */
  updateBairro: async (id: number, data: { name: string; municipalityId: number }): Promise<ApiResponse<Neighborhood>> => {
    const response = await api.put(`/dnirn/neighborhoods/${id}`, data);
    return response.data;
  },

  /** Apagar um Bairro pelo ID */
  deleteBairro: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/neighborhoods/${id}`);
    return response.data;
  },
};
