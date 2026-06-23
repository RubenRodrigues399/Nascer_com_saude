import { db } from '@/lib/db';

export async function logAction(acao: string, detalhes: string) {
  if (typeof window === 'undefined') return;
  
  const savedSession = localStorage.getItem('dnirn_session');
  if (!savedSession) return;

  const user = JSON.parse(savedSession);

  await db.logs.add({
    userId: user.username,
    nomeCompleto: user.nomeCompleto,
    perfil: user.perfil,
    acao,
    detalhes,
    createdAt: Date.now()
  });
}