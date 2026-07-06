import axios from 'axios';

// 1. Definição da API Key (Em produção, deves colocar isto no teu arquivo .env.local)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-registro-civil-ixfv.onrender.com';
const API_KEY = process.env.NEXT_PUBLIC_DNIRN_API_KEY || 'dnirn_maternidades_key_prod_2026';
 
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY, // Injeta a API Key fixa para todas as chamadas
  },
});

// 2. Interceptador de REQUISIÇÃO: Injeta o tokenAccess dinâmico do profissional
api.interceptors.request.use(
  (config) => {
    const session = sessionStorage.getItem('dnirn_session');
    if (session) {
      const { tokenAccess } = JSON.parse(session);
      if (tokenAccess && config.headers) {
        // Formato padrão Bearer exigido pelo Swagger
        config.headers.Authorization = `Bearer ${tokenAccess}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptador de RESPOSTA: Gestão do Refresh Token automático (15min)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o servidor retornar 401 (Unauthorized), significa que o token de 15min expirou
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const session = sessionStorage.getItem('dnirn_session');
        if (!session) throw new Error('Sessão local em falta.');

        const sessionData = JSON.parse(session);
        const tokenRefresh = sessionData.tokenRefresh;

        if (!tokenRefresh) throw new Error('Refresh token não encontrado.');

        // Chamada de renovação. Nota que o axios puro aqui não tem os headers da instância,
        // por isso passamos a X-API-KEY manualmente para a rota de refresh não ser bloqueada!
        const response = await axios.post(
          `${api.defaults.baseURL}/dnirn/auth/refresh-token`,
          { refreshToken: tokenRefresh },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': API_KEY
            }
          }
        );

        if (response.data?.success) {
          const newTokenAcess = response.data.data.newTokenAcess;

          // Atualiza os dados da sessão na memória do navegador
          sessionData.tokenAccess = newTokenAcess;
          sessionData.loginTimestamp = Date.now();
          sessionStorage.setItem('dnirn_session', JSON.stringify(sessionData));

          // Atualiza o header da requisição que falhou e repete-a
          originalRequest.headers.Authorization = `Bearer ${newTokenAcess}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Se o refresh token de 24h também expirou, limpa tudo e força novo login
        sessionStorage.removeItem('dnirn_session');
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);