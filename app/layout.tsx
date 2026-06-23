import { AuthProvider } from '@/context/AuthContext';
import NetworkStatus from '@/components/NetworkStatus';
import '@/app/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <AuthProvider>
          <NetworkStatus />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}