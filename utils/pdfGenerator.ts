import { jsPDF } from 'jspdf';

interface PDFData {
  id: string;
  nomeCrianca: string;
  dataNascimento: string;
  horaNascimento: string;
  sexo: string;
  nomeMae: string;
  biMae: string;
  nomePai?: string;
  biPai?: string;
  naturalDe: string; // Adicionado
  municipio: string; // Adicionado
  provincia: string; // Adicionado
}

export function generateAssentoPDF(data: PDFData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cabeçalho Oficial
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('REPÚBLICA DE ANGOLA', 105, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text('MINISTÉRIO DA JUSTIÇA E DOS DIREITOS HUMANOS', 105, 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Direcção Nacional de Identificação, Registos e Notariado', 105, 32, { align: 'center' });
  doc.line(20, 36, 190, 36);

  // Título Documento
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('ASSENTO DE NASCIMENTO', 105, 48, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'oblique');
  doc.text(`Registo Nº: ${data.id}`, 105, 54, { align: 'center' });

  // Corpo de dados
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
  let y = 70;

  y += 8;
  doc.setFont('helvetica');
  doc.text(`Nome Completo: ${data.nomeCrianca}`, 20, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Gênero: ${data.sexo === 'M' ? 'Masculino' : 'Feminino'}`, 20, y);

  y += 8;
  doc.text(`Nome do pai: ${data.nomePai || 'Não Declarado'}`, 20, y);

  y += 8;
  doc.text(`BI do pai: ${data.biPai || 'N/D'}`, 20, y);

  y += 8;
  doc.text(`Nome da mãe: ${data.nomeMae}`, 20, y);

  y += 8;
  doc.text(`BI da mãe: ${data.biMae}`, 20, y);

  y += 8;
  doc.text(`Data de nascimento: ${data.dataNascimento}`, 20, y);

  y += 8;
  doc.text(`Hora do nascimento: ${data.horaNascimento}`, 20, y);

    // Bloco de Naturalidade Solicitado
    y += 8;
    doc.text(`Natural de: ${data.naturalDe}`, 20, y);
  
    y += 8;
    doc.text(`Município de: ${data.municipio}`, 20, y);
  
    y += 8;
    doc.text(`Província de: ${data.provincia}`, 20, y);

  // Assinatura Técnica
  y = 230;
  doc.line(60, y, 150, y);
  doc.text('O Conservador / Técnico de Registo', 105, y + 6, { align: 'center' });

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}