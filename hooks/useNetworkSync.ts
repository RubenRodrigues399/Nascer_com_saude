'use client';

import { useEffect, useState } from 'react';

/**
 * Reflecte apenas se o dispositivo tem uma interface de rede activa
 * (navigator.onLine). Isto NÃO garante que o servidor DNIRN está acessível —
 * só que o browser detecta alguma ligação (Wi-Fi/cabo).
 */
export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
