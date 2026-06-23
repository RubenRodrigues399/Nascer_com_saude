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
  // Rota de listagem geral
  getAllNewborns: async () => {
    try {
      const response = await axios.get('/dnirn/child/all');
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error(error);
      return { success: false, data: [] };
    }
  },

  // Rota de criação baseada no teu Swagger 🚀
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