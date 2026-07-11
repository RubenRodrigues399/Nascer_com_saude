import axios from 'axios';
import { authService } from './auth';
import { pingActivity } from '@/utils/activityTracker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-registro-civil-ixfv.onrender.com';
const API_KEY = process.env.NEXT_PUBLIC_DNIRN_API_KEY || 'dnirn00.@gmail.com';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// INTERCEPTOR DE REQUEST: Injeta o Token de Acesso se ele existir
api.interceptors.request.use(
  (config) => {
    pingActivity();
    
    // Log da sessão completa
    if (typeof window !== 'undefined') {
      const sessionRaw = sessionStorage.getItem('dnirn_session');
      console.log('[API] === INÍCIO DEBUG REQUEST ===');
      console.log('[API] URL:', config.url);
      console.log('[API] Method:', config.method);
      console.log('[API] Session raw:', sessionRaw ? 'existe' : 'NÃO EXISTE');
      
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          console.log('[API] Session parsed:', {
            temTokenAccess: !!session.tokenAccess,
            temTokenRefresh: !!session.tokenRefresh,
            temUser: !!session.user,
            user: session.user ? {
              id: session.user.id,
              phoneNumber: session.user.phoneNumber,
              roleProfessional: session.user.roleProfessional,
              unityId: session.user.unityId
            } : null
          });
          
          const { tokenAccess } = session;
          console.log('[API] Token access:', tokenAccess ? `${tokenAccess.substring(0, 30)}...` : 'VAZIO');
          console.log('[API] Headers atuais:', config.headers);
          
          if (tokenAccess && config.headers && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${tokenAccess}`;
            console.log('[API] ✅ Authorization ADICIONADO');
          } else {
            console.log('[API] ⚠️ Authorization NÃO foi adicionado:', {
              temToken: !!tokenAccess,
              temHeaders: !!config.headers,
              jaTemAuth: config.headers?.Authorization ? true : false
            });
          }
        } catch (e) {
          console.error('[API] ❌ ERRO ao parsear session:', e);
        }
      }
      
      console.log('[API] Headers finais:', {
        'Content-Type': config.headers['Content-Type'],
        'x-api-key': config.headers['x-api-key'] ? 'presente' : 'AUSENTE',
        'Authorization': config.headers.Authorization ? 'presente' : 'AUSENTE'
      });
      console.log('[API] === FIM DEBUG REQUEST ===\n');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR DE RESPONSE: Deteta 401 (Expirado) e renova o Token automaticamente
api.interceptors.response.use(
  (response) => {
    console.log('[API Response] ✅ SUCESSO:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error('[API Response] ❌ ERRO COMPLETO:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      headers: error.config?.headers,
      fullData: JSON.stringify(error.response?.data, null, 2),
      errorText: error.response?.statusText
    });
    
    const originalRequest = error.config;

    // Se o erro for 401 e ainda não tentámos renovar esta requisição específica
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Marca para não entrar em loop infinito

      if (typeof window !== 'undefined') {
        const session = sessionStorage.getItem('dnirn_session');
        
        if (session) {
          try {
            const currentSession = JSON.parse(session);
            const refreshToken = currentSession.tokenRefresh;

            if (refreshToken) {
              // Faz o pedido em segundo plano ao Back-End para obter um novo token
              // Nota: Usamos o URL direto ou o authService para evitar o interceptor comum
              const refreshResponse = await axios.post(
                `${API_URL}/dnirn/auth/refresh-token`, 
                { refreshToken },
                { headers: { 'x-api-key': API_KEY } }
              );

              if (refreshResponse.data && refreshResponse.data.success) {
                // Ajusta com base no nome do campo que o teu Swagger devolve: "newTokenAcess"
                const newToken = refreshResponse.data.data.newTokenAcess || refreshResponse.data.data.tokenAccess;

                // Atualiza a sessão no sessionStorage com o novo token de acesso
                currentSession.tokenAccess = newToken;
                sessionStorage.setItem('dnirn_session', JSON.stringify(currentSession));

                // Atualiza o cabeçalho da requisição original que tinha falhado e executa de novo
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest); 
              }
            }
          } catch (refreshError) {
            console.error('Falha crítica ao renovar token (Refresh expirou ou é inválido):', refreshError);
            // Se o próprio refresh token falhar (ex: passou de 24h), força a saída completa
            sessionStorage.removeItem('dnirn_session');
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);