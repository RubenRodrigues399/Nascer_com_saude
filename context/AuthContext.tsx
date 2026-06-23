"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { authService, LoginResponseData } from "@/app/services/auth";

// Modelo de sessão rica estruturado a partir do Swagger
interface UserSession {
  professionalId: string;
  fullName: string;
  roleProfessional: "ADMINISTRATIVE" | "TECHNICAL" | "ADMINISTRATIVE_SUPER"; // ← Atualizado aqui
  unityId: number;
  unityName: string;
  tokenAccess: string;
  tokenRefresh: string;
  loginTimestamp: number;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (
    phoneNumber: string,
    pin: string,
  ) => Promise<{ success: boolean; message: string; user?: UserSession }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Limpeza absoluta da sessão ao sair ou expirar
 const logout = useCallback(async () => {
  try {
    const savedSession = sessionStorage.getItem("dnirn_session");
    if (savedSession && navigator.onLine) {
      const { tokenAccess } = JSON.parse(savedSession);
      
      // Envia o pedido
      await authService.logout(tokenAccess);
      
      // SÓ LIMPA LOCALMENTE SE O SERVIDOR CONFIRMAR
      sessionStorage.removeItem("dnirn_session");
      setUser(null);
      router.push("/login");
    }
  } catch (e) {
    console.error('Erro crítico: O servidor recusou o logout. Sessão presa.', e);
    // Mostra um aviso ao utilizador: "Não foi possível encerrar a sessão no servidor de forma segura."
  }
}, [router]);

  // Recupera a sessão guardada ao iniciar a App e valida expiração do Refresh Token (24 horas)
  useEffect(() => {
    const savedSession = sessionStorage.getItem("dnirn_session");
    if (savedSession) {
      try {
        const sessionData: UserSession = JSON.parse(savedSession);

        // Se a sessão local ultrapassar 24 horas, força novo ciclo de login
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - sessionData.loginTimestamp > ONE_DAY) {
          logout();
        } else {
          setUser(sessionData);
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  // Função central de autenticação com contingência e contratos estritos
  const login = async (phoneNumber: string, pin: string) => {
    // 1. FLUXO EM NUVEM (ONLINE)
    if (navigator.onLine) {
      try {
        const response = await authService.login({
          phoneNumber,
          password: pin,
        });

        if (response && response.success && response.data) {
          const resData = response.data;

          // Monta a sessão reativa estruturada a partir do Swagger
          const onlineSession: UserSession = {
            professionalId: resData.professionalId,
            fullName: resData.individual?.fullName || "Profissional Civil",
            roleProfessional: resData.roleProfessional, // Vai mapear "ADMINISTRATIVE_SUPER" sem travar

            // Tratamento seguro já que a response veio "unity": null
            unityId:
              resData.unity?.id ||
              resData.individual?.professionalCreator?.unity?.id ||
              1,
            unityName:
              resData.unity?.name ||
              resData.individual?.professionalCreator?.unity?.name ||
              "Direção Nacional (DNIRN)",

            tokenAccess: resData.tokenAccess,
            tokenRefresh: resData.tokenRefresh,
            loginTimestamp: Date.now(),
          };

          sessionStorage.setItem(
            "dnirn_session",
            JSON.stringify(onlineSession),
          );
          setUser(onlineSession);

          return {
            success: true,
            message: "Autenticado via Nuvem DNIRN.",
            user: onlineSession,
          };
        }

        // Se a API retornar sucesso HTTP mas falha lógica interna
        return {
          success: false,
          message: response?.message || "Dados de acesso incorretos.",
        };
      } catch (err: any) {
        console.error("Erro detetado no authService:", err);

        // Garante que o catch devolva sempre a estrutura esperada pela UI
        return {
          success: false,
          message:
            err.response?.data?.message ||
            err.message ||
            "Senha incorreta ou falha no servidor.",
        };
      }
    }

    // 2. FLUXO DE CONTINGÊNCIA (OFFLINE)
    return {
      success: false,
      message:
        "Sem ligação à internet. O modo de contingência local requer sincronização prévia.",
    };
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
}
