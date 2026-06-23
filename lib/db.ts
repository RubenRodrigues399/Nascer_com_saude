import Dexie, { Table } from 'dexie';

export interface Neighborhood {
  id?: number;
  name: string;
  municipalityId: number; 
  createdAt: number;
}

export interface Municipality {
  id?: number;
  name: string;
  provinceId: number; 
  createdAt: number;
}

export interface Province {
  id?: number; 
  name: string;
  createdAt: number;
}

export interface Professional {
  id?: string | number; // 
  roleProfessional: 'ADMINISTRATIVE' | 'TECHNICAL' | 'ADMINISTRATIVE_SUPER';
  individual: {
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    identificationDocument: {
      typeDocument: 'BI' | 'PASSAPORT';
      identificationNumber: string;
      expirationDateDocument: string;
    };
    birthDate: string;
    neighborhoodId: number; 
    phoneNumber: string;
  };
  unityId: number; 
  createdAt: number;
}

export interface Unity {
  id?: number;
  name: string;
  nif: string;
  phoneNumber: string;
  email: string;
  neighborhoodId: number;
  createdAt: number;
}

export interface BirthRecord {
  id?: string;
  nomeMae: string;
  biMae: string;
  nomePai?: string;
  biPai?: string;
  nomeCrianca: string;
  dataNascimento: string;
  horaNascimento: string;
  sexo: string;
  naturalDe: string;
  municipio: string;
  provincia: string;
  status: 'pendente' | 'sincronizado' | 'erro';
  createdAt: number;
}

export class MyDatabase extends Dexie {
  neighborhoods!: Table<Neighborhood>;
  municipalities!: Table<Municipality>;
  provinces!: Table<Province>;
  records!: Table<BirthRecord>;
  professionals!: Table<Professional>;
  unities!: Table<Unity>;
  logs!: Table<any>;

  constructor() {
    // Mudamos para v3. Isto força o browser a ignorar totalmente o passado corrompido
    super('DNIRN_Maternidade');
    
    this.version(1).stores({
      provinces: '++id, name',
      municipalities: '++id, name, provinceId',
      neighborhoods: '++id, name, municipalityId',
      records: '++id, biMae, status, createdAt',
      professionals: '++id, unityId',
      unities: '++id, name, nif, neighborhoodId',
      logs: '++id, createdAt'
    });
  }
}

export const db = new MyDatabase();