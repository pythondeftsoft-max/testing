import jsPDF from 'jspdf';

interface NoticeData {
  agencyName: string;
  agencyAddress?: string;
  agencyPhone?: string;
  tenantName: string;
  templateName: string;
  subjectLine: string;
  body: string;
  date: string;
}

export function generateNoticePdf(data: NoticeData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  // Header - Agency name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.agencyName, margin, y);
  y += 7;

  if (data.agencyAddress) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.agencyAddress, margin, y);
    y += 5;
  }

  // Date
  y += 5;
  doc.setFontSize(10);
  doc.text(`Date: ${data.date}`, margin, y);
  y += 12;

  // Subject line
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`RE: ${data.subjectLine}`, margin, y);
  y += 10;

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(data.body, contentWidth);
  
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 25;
    }
    doc.text(line, margin, y);
    y += 5;
  }

  return doc;
}

export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
  }
  return result;
}
