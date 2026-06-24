import axios from 'axios'; // ou a tua instância configurada do axios

export interface NewbornRecord {
  id?: string;
  nomeCrianca: string;
  sexo: string;
  dataNascimento: string;
  horaNascimento: string;
  nomeMae: string;
  biMae: string;
  nomePai?: string;
  biPai?: string;
  naturalDe: string;
  municipio: string;
  provincia: string;
  status: 'pendente' | 'sincronizado';
}

export const newbornService = {
  // Alterado para buscar por Unidade para evitar o 404 da rota global
  getAllNewborns: async (unityId: number = 1) => {
    try {
      // Se o back usar a rota por unidade, usamos esta. Se for outra, adaptamos o endpoint.
      const response = await axios.get(`/dnirn/child/byUnity/${unityId}`);
      return { success: true, data: response.data.data || response.data };
    } catch (error: any) {
      console.error('Erro ao buscar recém-nascidos:', error);
      return { success: false, message: error.message, data: [] };
    }
  },

  createChild: async (payload: any) => {
    try {
      const response = await axios.post('/dnirn/child', payload);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || JSON.stringify(error.response?.data) || error.message 
      };
    }
  }
};