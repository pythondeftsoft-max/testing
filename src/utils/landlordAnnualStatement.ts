import jsPDF from 'jspdf';
import type { HAPStatement, HAPStatementLineItem } from '@/hooks/useHAPStatements';

const fmt = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PropertyRollup {
  property_name: string;
  unit_number: string;
  hap_total: number;
  adjustment_total: number;
  net_total: number;
  payment_count: number;
}

/**
 * Aggregate a year's worth of monthly HAP statements into a single PDF
 * suitable for tax preparation. Property-level subtotals match 1099 amounts.
 */
export function generateAnnualStatementPdf(opts: {
  year: number;
  landlordName?: string;
  statements: HAPStatement[];
}): jsPDF {
  const { year, landlordName, statements } = opts;
  const doc = new jsPDF();

  // Filter to the requested year
  const yearStatements = statements.filter(s => {
    const d = new Date(s.statement_month + 'T00:00:00');
    return d.getFullYear() === year;
  });

  // Roll up by property+unit
  const rollup = new Map<string, PropertyRollup>();
  let grandHap = 0;
  let grandAdj = 0;
  let grandNet = 0;

  yearStatements.forEach(stmt => {
    const items = (stmt.line_items as HAPStatementLineItem[]) || [];
    items.forEach(item => {
      const key = `${item.property_name || '-'}|${item.unit_number || '-'}`;
      const existing = rollup.get(key) || {
        property_name: item.property_name || '-',
        unit_number: item.unit_number || '-',
        hap_total: 0,
        adjustment_total: 0,
        net_total: 0,
        payment_count: 0,
      };
      existing.hap_total += Number(item.hap_amount || 0);
      existing.adjustment_total += Number(item.adjustment_amount || 0);
      existing.net_total += Number(item.net_payment || 0);
      existing.payment_count += 1;
      rollup.set(key, existing);

      grandHap += Number(item.hap_amount || 0);
      grandAdj += Number(item.adjustment_amount || 0);
      grandNet += Number(item.net_payment || 0);
    });
  });

  // Header
  doc.setFontSize(18);
  doc.text('Annual HAP Owner Statement', 20, 22);
  doc.setFontSize(11);
  doc.text(`Tax Year: ${year}`, 20, 32);
  if (landlordName) doc.text(`Owner: ${landlordName}`, 20, 39);
  doc.text(`Statements Included: ${yearStatements.length}`, 20, landlordName ? 46 : 39);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, landlordName ? 53 : 46);

  // Grand total summary
  const summaryY = landlordName ? 65 : 58;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Year Totals', 20, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Gross HAP Received: ${fmt(grandHap)}`, 20, summaryY + 7);
  doc.text(`Adjustments: ${fmt(grandAdj)}`, 20, summaryY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Payments (matches 1099): ${fmt(grandNet)}`, 20, summaryY + 19);
  doc.setFont('helvetica', 'normal');

  // Property breakdown table
  let y = summaryY + 32;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Property / Unit Breakdown', 20, y);
  y += 8;

  doc.setFontSize(9);
  doc.text('Property', 20, y);
  doc.text('Unit', 80, y);
  doc.text('Pmts', 105, y);
  doc.text('HAP', 125, y);
  doc.text('Adj', 150, y);
  doc.text('Net', 175, y);
  doc.setFont('helvetica', 'normal');
  y += 2;
  doc.line(20, y, 195, y);
  y += 5;

  const sorted = Array.from(rollup.values()).sort((a, b) =>
    a.property_name.localeCompare(b.property_name) || a.unit_number.localeCompare(b.unit_number)
  );

  sorted.forEach(row => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text((row.property_name || '-').slice(0, 28), 20, y);
    doc.text((row.unit_number || '-').slice(0, 10), 80, y);
    doc.text(String(row.payment_count), 105, y);
    doc.text(fmt(row.hap_total), 125, y);
    doc.text(fmt(row.adjustment_total), 150, y);
    doc.text(fmt(row.net_total), 175, y);
    y += 6;
  });

  // Totals row
  if (y > 265) { doc.addPage(); y = 20; }
  y += 2;
  doc.line(20, y, 195, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 20, y);
  doc.text(fmt(grandHap), 125, y);
  doc.text(fmt(grandAdj), 150, y);
  doc.text(fmt(grandNet), 175, y);
  doc.setFont('helvetica', 'normal');

  // Monthly index page
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Statement Index', 20, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let my = 35;
  doc.text('Month', 20, my);
  doc.text('Statement Total', 120, my);
  my += 2;
  doc.line(20, my, 195, my);
  my += 6;

  const monthly = [...yearStatements].sort((a, b) =>
    a.statement_month.localeCompare(b.statement_month)
  );
  monthly.forEach(s => {
    if (my > 270) { doc.addPage(); my = 20; }
    const label = new Date(s.statement_month + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long',
    });
    doc.text(label, 20, my);
    doc.text(fmt(Number(s.total_amount)), 120, my);
    my += 6;
  });

  // Footer disclaimer
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    'HAP amounts paid by PHA. Net Payments total reconciles to your 1099-MISC (Box 1).',
    20, 281
  );
  doc.text(
    'Tenant portion is collected directly by the landlord; the PHA does not collect or track tenant rent.',
    20, 286
  );

  return doc;
}

export function downloadAnnualStatementPdf(opts: {
  year: number;
  landlordName?: string;
  statements: HAPStatement[];
}) {
  const doc = generateAnnualStatementPdf(opts);
  doc.save(`HAP_Annual_Statement_${opts.year}.pdf`);
}
