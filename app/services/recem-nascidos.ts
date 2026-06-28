import { api } from '@/app/services/api';

export interface NewbornRecord {
  id?: string;
  nomeCrianca: string;
  sexo: string;
  dataNascimento: string;
  horaNascimento: string;
  nomeMae: string;
  biMae: string;
  nomePai?: string;
  biPai?: string;
  naturalDe: string;
  municipio: string;
  provincia: string;
  status: 'pendente' | 'sincronizado';
}

// DTOs baseados nos schemas do Swagger
export interface ChildUpdateDTO {
  id: string;
  individual: {
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    identificationNumber: string;
    birthDate: string;
  };
  height: number;
  weight: number;
  vitalStatus: 'ALIVE' | 'DECEASED';
  deathDate?: string;
  gestacionalAge: { weeks: number; days: number };
  placeOfBirth: 'HOSPITAL' | 'HOME' | 'OTHER';
  professionalSupport: boolean;
  municipalityId: number;
  neighborhoodName: string;
}

export interface AddFatherDTO {
  childId: string;
  father: {
    fullName: string;
    phoneNumber: string;
    identificationDocument: {
      type: 'BI' | 'PASSAPORT' | 'DNV';
      number: string;
      expirationDate: string;
    };
    birthDate: string;
    municipalityId: number;
    neighborhoodName: string;
  };
}

export const newbornService = {
  getAllNewborns: async () => {
    try {
      const response = await api.get('/dnirn/child/all');
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, message: error.message, data: [] };
    }
  },

  getChildById: async (childId: string) => {
    try {
      const response = await api.get(`/dnirn/child/childById/${childId}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message, data: null };
    }
  },

  getChildrenByUnity: async (unityId: number) => {
    try {
      const response = await api.get(`/dnirn/child/byUnity/${unityId}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, message: error.message, data: [] };
    }
  },

  createChild: async (payload: any) => {
    try {
      const response = await api.post('/dnirn/child', payload);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  },

  updateChild: async (payload: ChildUpdateDTO) => {
    try {
      const response = await api.put('/dnirn/child', payload);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },

  addFather: async (payload: AddFatherDTO) => {
    try {
      const response = await api.post('/dnirn/child/addFather', payload);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },

  deleteChild: async (id: string) => {
    try {
      const response = await api.delete(`/dnirn/child/${id}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }
};