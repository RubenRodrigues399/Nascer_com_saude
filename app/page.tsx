'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona imediatamente para o ecrã de login
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-slate-500 font-medium animate-pulse text-sm">
        A redirecionar para o portal de acesso...
      </p>
    </div>
  );
}