'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const navItems = [
    { name: 'Painel principal', path: '/dashboard' },
    { name: 'Províncias', path: '/dashboard/provincias' },
    { name: 'Municípios', path: '/dashboard/municipios' },
    { name: 'Bairros', path: '/dashboard/bairros' },
    { name: 'Profissionais', path: '/dashboard/profissionais' },
    { name: 'Unidades', path: '/dashboard/unidades' },
    { name: 'Recém-nascidos', path: '/dashboard/recem-nascidos' },
    { name: 'Configurações', path: '/dashboard/configuracoes' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <nav className="bg-slate-900 text-white shadow-md select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="font-black tracking-wider text-amber-500 text-lg">DNIRN-CIDADÃO</span>
              <div className="hidden lg:flex space-x-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.path) && (item.path !== '/dashboard' || pathname === '/dashboard');
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </a>
                  );
                })}
              </div>
            </div>
            
            {/* ESTÉTICA DO UTILIZADOR LOGADO RESTAURADA */}
            <div className="flex items-center gap-5">
              {user && (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-100">{user.fullName}</div>
                  <div className="text-[10px] text-amber-400 font-mono uppercase tracking-wider font-semibold">
                    {user.roleProfessional === 'administrador' ? 'Super Administrador' : user.roleProfessional}
                  </div>
                </div>
              )}
              <button onClick={logout} className="bg-slate-800 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-700">
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          </div>
        ) : (
          <div className="animate-fadeIn duration-200 flex-1">{children}</div>
        )}
      </main>
    </div>
  );
}