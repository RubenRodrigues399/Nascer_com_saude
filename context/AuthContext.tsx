"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { authService, LoginResponseData } from "@/app/services/auth";
import { onActivity } from "@/utils/activityTracker";

// Tempo máximo sem qualquer atividade (ecrã ou pedidos ao servidor) antes do logout automático
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos

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
  mustChangePassword?: boolean;
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

  // Limpeza absoluta da sessão ao sair ou expirar.
  // A sessão local é sempre terminada, mesmo que o servidor esteja offline ou recuse o pedido —
  // a segurança do posto de trabalho não pode depender de uma confirmação de rede.
  const logout = useCallback(async () => {
    const savedSession = sessionStorage.getItem("dnirn_session");
    try {
      if (savedSession && navigator.onLine) {
        const { tokenAccess } = JSON.parse(savedSession);
        await authService.logout(tokenAccess);
      }
    } catch (e) {
      console.error('Aviso: não foi possível confirmar o logout junto do servidor. A sessão local será encerrada na mesma.', e);
    } finally {
      sessionStorage.removeItem("dnirn_session");
      setUser(null);
      router.push("/login");
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

  // Logout automático por inatividade — segurança do posto de trabalho (DNIRN)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      sessionStorage.setItem("dnirn_idle_logout", "1");
      logout();
    }, INACTIVITY_LIMIT_MS);
  }, [logout]);

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const THROTTLE_MS = 1000; // evita reiniciar o cronómetro em cada pixel de rato
    const registerActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < THROTTLE_MS) return;
      lastActivityRef.current = now;
      resetIdleTimer();
    };

    const domEvents: (keyof WindowEventMap)[] = [
      "mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel",
    ];
    domEvents.forEach((ev) => window.addEventListener(ev, registerActivity, { passive: true }));
    const unsubscribeApiActivity = onActivity(registerActivity);

    resetIdleTimer(); // arranca o cronómetro assim que a sessão fica ativa

    return () => {
      domEvents.forEach((ev) => window.removeEventListener(ev, registerActivity));
      unsubscribeApiActivity();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

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
