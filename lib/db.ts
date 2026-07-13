import Dexie, { Table } from 'dexie';

// As tabelas provinces/municipalities/neighborhoods/records/professionals/unities
// pertenciam a um motor de sincronização offline nunca ligado a nenhum ecrã real
// (o único componente que as escrevia, BirthForm.tsx, nunca chegou a ser usado).
// Mantém-se aqui apenas `logs`, que é o trilho de auditoria local realmente usado
// (ver utils/audit.ts e app/dashboard/configuracoes/page.tsx). O esquema da
// versão 1 não é alterado para não invalidar bases de dados já criadas no
// browser de utilizadores existentes.
export class MyDatabase extends Dexie {
  logs!: Table<any>;

  constructor() {
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