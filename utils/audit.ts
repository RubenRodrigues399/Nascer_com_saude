import { db } from '@/lib/db';

export async function logAction(
  acao: string,
  detalhes: string,
  fullName?: string,
  roleProfessional?: string
) {
  if (typeof window === 'undefined') return;

  let userId = 'desconhecido';
  let nomeCompleto = fullName || 'Utilizador';
  let perfil = roleProfessional || '—';

  // A sessão activa é gravada em sessionStorage pelo AuthContext
  const savedSession = sessionStorage.getItem('dnirn_session');
  if (savedSession) {
    try {
      const user = JSON.parse(savedSession);
      userId = user.professionalId || userId;
      nomeCompleto = fullName || user.fullName || nomeCompleto;
      perfil = roleProfessional || user.roleProfessional || perfil;
    } catch {
      // sessão corrompida, mantém os valores por defeito
    }
  }

  await db.logs.add({
    userId,
    nomeCompleto,
    perfil,
    acao,
    detalhes,
    createdAt: Date.now()
  });
}