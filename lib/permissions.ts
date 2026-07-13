// Regras de acesso por papel — DNIRN-Cidadão
//
// Super Profissional (ADMINISTRATIVE_SUPER): acesso total à plataforma,
//   incluindo permissões e eliminação de entidades.
// Administrador (ADMINISTRATIVE): gestão operacional de UMA instituição
//   (a sua própria unidade) — cria profissionais, gere a sua unidade e
//   consulta relatórios.
// Técnico (TECHNICAL): operação diária numa maternidade — regista
//   recém-nascidos e consulta registos.

export type Role = 'ADMINISTRATIVE_SUPER' | 'ADMINISTRATIVE' | 'TECHNICAL';

export const isSuper = (role?: string | null) => role === 'ADMINISTRATIVE_SUPER';
export const isAdministrative = (role?: string | null) => role === 'ADMINISTRATIVE';
export const isTechnical = (role?: string | null) => role === 'TECHNICAL';

// --- Acesso a páginas inteiras ---
// Geografia (Províncias/Municípios/Bairros) e Configurações são infraestrutura
// da plataforma — exclusivas do Super Profissional.
export const canAccessGeografia = (role?: string | null) => isSuper(role);
export const canAccessConfiguracoes = (role?: string | null) => isSuper(role);
export const canAccessProfissionais = (role?: string | null) => isSuper(role) || isAdministrative(role);
export const canAccessUnidades = (role?: string | null) => isSuper(role) || isAdministrative(role);
// Cidadãos e Recém-nascidos: leitura disponível a todos os papéis autenticados.

// --- Ações de escrita ---
// Eliminar entidades é sempre exclusivo do Super Profissional.
export const canDelete = (role?: string | null) => isSuper(role);
export const canCreateProfissional = (role?: string | null) => isSuper(role) || isAdministrative(role);
export const canCreateSuperProfissional = (role?: string | null) => isSuper(role);
export const canCreateUnidade = (role?: string | null) => isSuper(role);
// Administrador só consulta relatórios de recém-nascidos; quem regista/edita é o Técnico (e o Super).
export const canWriteRecemNascidos = (role?: string | null) => isSuper(role) || isTechnical(role);

// --- Âmbito por unidade ---
// O Super vê tudo; Administrador e Técnico só veem/atuam sobre a sua própria unidade.
// Devolve undefined quando não deve haver filtro (Super = acesso nacional).
export const scopeUnityId = (role?: string | null, unityId?: number | null): number | undefined =>
  isSuper(role) ? undefined : unityId ?? undefined;
