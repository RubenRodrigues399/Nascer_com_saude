'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Redireciona para /dashboard assim que a sessão carregar, caso o papel do
 * utilizador não passe em `allowed`. Usar em conjunto com um retorno antecipado
 * na página (ver `blocked` abaixo) para evitar mostrar o conteúdo restrito
 * durante o instante entre o carregamento da sessão e o redireccionamento.
 */
export function useRequireAccess(allowed: boolean) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowed) router.replace('/dashboard');
  }, [loading, user, allowed, router]);

  return { blocked: loading || !user || !allowed };
}
