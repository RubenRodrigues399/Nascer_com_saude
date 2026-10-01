import { jsPDF } from 'jspdf';

interface PDFData {
  id: string;
  dnv?: string;
  nomeCrianca: string;
  dataNascimento: string;
  horaNascimento: string;
  sexo: string;
  nomeMae: string;
  biMae: string;
  nomePai?: string;
  biPai?: string;
  naturalDe: string; 
  municipio: string; 
  provincia: string; 
}

export function generateAssentoPDF(data: PDFData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Moldura Externa
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277); // Moldura principal
  doc.setLineWidth(0.2);
  doc.rect(11.5, 11.5, 187, 274); // Linha dupla fina interior

  // Cabeçalho Oficial da República de Angola
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(12);
  doc.text('REPÚBLICA DE ANGOLA', 105, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('MINISTÉRIO DA JUSTIÇA E DOS DIREITOS HUMANOS', 105, 27, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Direcção Nacional de Identificação, Registos e Notariado', 105, 32, { align: 'center' });
  doc.text('POSTO DE REGISTO CIVIL / MATERNIDADE', 105, 37, { align: 'center' });
  

  // Título do Documento e Identificação (DNV)
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(14);
  doc.text('ASSENTO DE NASCIMENTO', 105, 49, { align: 'center' });
  
  // Utilização prioritária do DNV
  const numeroDocumento = data.dnv || data.id || 'N/D';
  doc.setFontSize(10); 
  doc.setFont('helvetica', 'bold');
  doc.text(`DECLARAÇÃO DE NASCIDO VIVO (DNV) Nº: ${numeroDocumento}`, 105, 55, { align: 'center' });

  let y = 68;
  const colEsquerda = 22;
  const colDireita = 110;

  // Bloco I: Dados do Registado (A Criança)
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(10);
  doc.text('DADOS PESSOAIS', colEsquerda, y);
  doc.line(colEsquerda, y + 1.5, 188, y + 1.5);

  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Nome Completo:', colEsquerda, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(data.nomeCrianca.toUpperCase(), colEsquerda + 30, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Data de Nascimento:', colDireita, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.dataNascimento} às ${data.horaNascimento}h`, colDireita + 35, y);

  y += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Gênero:', colEsquerda, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.sexo === 'M' || data.sexo === 'Masculino' ? 'Masculino' : 'Feminino', colEsquerda + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Município:', colDireita, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.municipio || '—', colDireita + 27, y);
  
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Naturalidade:', colEsquerda, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.naturalDe || '—', colEsquerda + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Província:', colDireita, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.provincia || '—', colDireita + 27, y);

  // Filiação (Pais)
  y += 14;
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(10);
  doc.text('FILIAÇÃO', colEsquerda, y);
  doc.line(colEsquerda, y + 1.5, 188, y + 1.5);

  // Mãe
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Mãe:', colEsquerda, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(data.nomeMae.toUpperCase(), colEsquerda + 12, y);

  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Nº Doc. Mãe (BI):', colEsquerda, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.biMae || 'N/D', colEsquerda + 32, y);

  // Pai
  y += 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Pai:', colEsquerda, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(data.nomePai ? data.nomePai.toUpperCase() : 'DECLARAÇÃO OMISSA (NÃO DECLARADO)', colEsquerda + 10, y);

  if (data.nomePai) {
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Nº Doc. Pai (BI):', colEsquerda, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.biPai || 'N/D', colEsquerda + 30, y);
  }

  // Rodapé e Validação do Conservador
  y = 225;
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(8);
  const dataAtual = new Date().toLocaleDateString('pt-AO');
  doc.text(`Documento emitido aos ${dataAtual}. Processado por computador via SIRC.`, 105, y, { align: 'center' });

  y += 20;
  doc.line(65, y, 145, y);
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9);
  doc.text('O Conservador / Técnico de Registo', 105, y + 5, { align: 'center' });

  // Emissão do documento
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}