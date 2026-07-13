import { api } from '@/app/services/api';
import { AuditUser, Neighborhood } from '@/app/services/locations';

// ============================================================================
// INTERFACES / TIPOS — CRIANÇAS
// ============================================================================

// Payload do filho para POST /dnirn/child
export interface ChildIndividualInput {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string; // YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
}

// Payload do progenitor (mãe / pai) para criação
export interface ParentInput {
  fullName: string;
  phoneNumber: string;
  identificationDocument: {
    type: 'BI' | 'PASSAPORT' | 'DNV';
    number: string;
    expirationDate: string; // YYYY-MM-DD
  };
  birthDate: string; // YYYY-MM-DD
  municipalityId: number;
  neighborhoodName: string;
}

export interface WitnessInput {
  parent: ParentInput;
  gender: 'MALE' | 'FEMALE';
}

// POST /dnirn/child
export interface CreateChildDto {
  individualChild: ChildIndividualInput;
  height: number;
  weight: number;
  vitalStatus: 'ALIVE' | 'DECEASED';
  deathDate?: string; // YYYY-MM-DD — só quando DECEASED
  gestacionalAge: { weeks: number; days: number };
  placeOfBirth: 'HOSPITAL' | 'HOME' | 'OTHER';
  professionalSupport: boolean;
  unityId: number;
  mother: ParentInput;
  father?: ParentInput;
  witness?: WitnessInput[];
}

// PUT /dnirn/child
export interface UpdateChildDto {
  id: string;
  individual: {
    fullName: string;
    gender: 'MALE' | 'FEMALE';
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

// POST /dnirn/child/addFather
export interface AddFatherDto {
  childId: string;
  father: ParentInput;
}

// ============================================================================
// TIPOS DE RESPOSTA — o que a API devolve
// ============================================================================

export interface FamilyMemberSummary {
  id: string;
  familyEnum: string;
  individual: {
    id: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    identificationDocument: {
      typeDocument: 'BI' | 'PASSAPORT' | 'DNV';
      identificationNumber: string;
      expirationDateDocument: string;
    };
  };
}

export interface ChildRecord {
  id: string;
  individual: {
    id: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    identificationDocument: {
      typeDocument: 'BI' | 'PASSAPORT' | 'DNV';
      identificationNumber: string;
      expirationDateDocument: string;
    };
    birthDate: string;
    neighborhood?: Neighborhood;
    creator?: AuditUser;
    updater?: AuditUser;
    createdAt: string;
    updatedAt: string;
  };
  height: number;
  weight: number;
  vitalStatus: 'ALIVE' | 'DECEASED';
  deathDate?: string;
  gestacionalAge: { weeks: number; days: number };
  placeOfBirth: 'HOSPITAL' | 'HOME' | 'OTHER';
  professionalSupport: boolean;
  unity?: { id: number; name: string; nif?: string; neighborhood?: Neighborhood };
  mother?: FamilyMemberSummary;
  father?: FamilyMemberSummary;
  witness?: FamilyMemberSummary[];
}

interface ApiResponse<T> {
  status: number;
  success: boolean;
  error: string | null;
  message: string;
  data: T;
}

// ============================================================================
// MÉTODOS DE CONSUMO DA API — CRIANÇAS
// ============================================================================
export const newbornService = {

  /** Rota: GET /dnirn/child/all */
  getAllNewborns: async (): Promise<ApiResponse<ChildRecord[]>> => {
    const response = await api.get('/dnirn/child/all');
    return response.data;
  },

  /** Rota: GET /dnirn/child/childById/{childId} */
  getChildById: async (childId: string): Promise<ApiResponse<ChildRecord>> => {
    const response = await api.get(`/dnirn/child/childById/${childId}`);
    return response.data;
  },

  /** Rota: GET /dnirn/child/byUnity/{unityId} */
  getChildrenByUnity: async (unityId: number): Promise<ApiResponse<ChildRecord[]>> => {
    const response = await api.get(`/dnirn/child/byUnity/${unityId}`);
    return response.data;
  },

  /** Rota: POST /dnirn/child */
  createChild: async (payload: CreateChildDto): Promise<ApiResponse<ChildRecord>> => {
    const response = await api.post('/dnirn/child', payload);
    return response.data;
  },

  /** Rota: PUT /dnirn/child */
  updateChild: async (payload: UpdateChildDto): Promise<ApiResponse<ChildRecord>> => {
    const response = await api.put('/dnirn/child', payload);
    return response.data;
  },

  /** Rota: POST /dnirn/child/addFather */
  addFather: async (payload: AddFatherDto): Promise<ApiResponse<ChildRecord>> => {
    const response = await api.post('/dnirn/child/addFather', payload);
    return response.data;
  },

  /** Rota: GET /dnirn/child/childByDNV/{dnv} */
  getChildByDNV: async (dnv: string): Promise<ApiResponse<ChildRecord>> => {
    const response = await api.get(`/dnirn/child/childByDNV/${dnv}`);
    return response.data;
  },

  /** Rota: DELETE /dnirn/child/{id} */
  deleteChild: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/dnirn/child/${id}`);
    return response.data;
  },
};
