// Shared helpers for HUD PDF generators.
import { jsPDF } from 'jspdf';

export const fmtMoney = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return '—';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

export interface HeaderOpts {
  formNumber: string;        // e.g. 'HUD-52517'
  formTitle: string;
  agencyName: string;
  subtitle?: string;
}

export function newDoc(): jsPDF {
  return new jsPDF({ unit: 'pt', format: 'letter' });
}

export function drawHeader(doc: jsPDF, opts: HeaderOpts) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text(opts.formTitle, pageW / 2, 50, { align: 'center' });
  doc.setFontSize(10).setFont('helvetica', 'normal');
  doc.text(`Form ${opts.formNumber}`, pageW / 2, 66, { align: 'center' });
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(opts.agencyName, pageW / 2, 84, { align: 'center' });
  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(opts.subtitle, pageW / 2, 98, { align: 'center' });
  }
  doc.setLineWidth(0.5);
  doc.line(40, 110, pageW - 40, 110);
}

export function drawFooter(doc: jsPDF, formNumber: string) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(7).setFont('helvetica', 'italic').setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString('en-US')} · ${formNumber} · This is an electronically generated document.`,
    pageW / 2, pageH - 24, { align: 'center' },
  );
  doc.setTextColor(0);
}

export function drawSection(doc: jsPDF, title: string, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(235, 235, 235);
  doc.rect(40, y, pageW - 80, 18, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0);
  doc.text(title, 46, y + 13);
  return y + 26;
}

/** Two-column field grid. fields: [label, value][]. Returns next y. */
export function drawFieldGrid(doc: jsPDF, fields: [string, string][], y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const colW = (pageW - 80) / 2;
  const rowH = 30;
  doc.setFontSize(9);
  fields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * colW;
    const yy = y + row * rowH;
    doc.setFont('helvetica', 'bold').setTextColor(80);
    doc.text(f[0], x + 4, yy + 10);
    doc.setFont('helvetica', 'normal').setTextColor(0);
    const wrapped = doc.splitTextToSize(f[1] || '—', colW - 8);
    doc.text(wrapped.slice(0, 2), x + 4, yy + 22);
    doc.setDrawColor(220);
    doc.line(x + 4, yy + 26, x + colW - 4, yy + 26);
  });
  const rows = Math.ceil(fields.length / 2);
  return y + rows * rowH + 8;
}

export function downloadDoc(doc: jsPDF, fileName: string) {
  doc.save(fileName);
}
