import { format } from 'date-fns';

const BOM = '\uFEFF';

export const exportCSV = (rows: string[][], filename: string) => {
  const csv = BOM + rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// HUD 50058 Fixed-Width Field Definitions (simplified PIC-compatible format)
// Each field: [startPos, length, label]
const FIXED_WIDTH_FIELDS: Array<[number, number, string]> = [
  [0, 3, 'record_type'],       // "058"
  [3, 10, 'pha_code'],
  [13, 9, 'family_id'],
  [22, 35, 'head_name'],
  [57, 8, 'dob'],              // MMDDYYYY
  [65, 2, 'household_size'],
  [67, 8, 'annual_income'],
  [75, 15, 'voucher_number'],
  [90, 3, 'voucher_type'],
  [93, 8, 'move_in_date'],     // MMDDYYYY
  [101, 2, 'bedroom_size'],
  [103, 8, 'gross_rent'],
  [111, 8, 'utility_allowance'],
  [119, 8, 'hap_amount'],
  [127, 8, 'tenant_rent'],
  [135, 8, 'total_rent'],
  [143, 8, 'lease_start'],     // MMDDYYYY
  [151, 8, 'lease_end'],       // MMDDYYYY
  [159, 1, 'disability'],      // Y/N
  [160, 2, 'race_ethnicity'],
  [162, 8, 'effective_date'],  // MMDDYYYY
];

const RECORD_LENGTH = 170;

function padField(value: string, length: number): string {
  return String(value || '').slice(0, length).padEnd(length, ' ');
}

function padNumeric(value: string | number, length: number): string {
  return String(value || '0').slice(0, length).padStart(length, '0');
}

function formatDateFixed(dateStr: string): string {
  if (!dateStr) return '        ';
  try {
    const d = new Date(dateStr);
    return format(d, 'MMddyyyy');
  } catch {
    return '        ';
  }
}

export interface HUD50058Record {
  pha_code: string;
  family_id: string;
  head_name: string;
  dob: string;
  household_size: string | number;
  annual_income: string | number;
  voucher_number: string;
  voucher_type: string;
  move_in_date: string;
  bedroom_size: string | number;
  gross_rent: string | number;
  utility_allowance: string | number;
  hap_amount: string | number;
  tenant_rent: string | number;
  total_rent: string | number;
  lease_start: string;
  lease_end: string;
  disability: string;
  race_ethnicity: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  familyId: string;
}

export function validate50058Records(records: HUD50058Record[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  records.forEach((r, i) => {
    const fid = r.family_id || `Row ${i + 1}`;
    if (!r.head_name) warnings.push({ field: 'Head of Household', message: 'Missing name', familyId: fid });
    if (!r.dob) warnings.push({ field: 'Date of Birth', message: 'Missing DOB', familyId: fid });
    if (!r.annual_income && r.annual_income !== 0) warnings.push({ field: 'Annual Income', message: 'Missing income', familyId: fid });
    if (!r.voucher_number) warnings.push({ field: 'Voucher Number', message: 'Missing voucher #', familyId: fid });
    if (!r.lease_start) warnings.push({ field: 'Lease Start', message: 'Missing lease start', familyId: fid });
    if (!r.hap_amount && r.hap_amount !== 0) warnings.push({ field: 'HAP Amount', message: 'Missing HAP amount', familyId: fid });
  });

  return warnings;
}

export function exportHUD50058FixedWidth(records: HUD50058Record[], filename: string): void {
  const lines = records.map(r => {
    let line = ' '.repeat(RECORD_LENGTH);
    const set = (start: number, len: number, val: string) => {
      line = line.slice(0, start) + val.slice(0, len).padEnd(len, ' ') + line.slice(start + len);
    };
    const setNum = (start: number, len: number, val: string | number) => {
      const s = String(Math.round(Number(val) * 100) || 0);
      line = line.slice(0, start) + s.padStart(len, '0').slice(0, len) + line.slice(start + len);
    };

    set(0, 3, '058');
    set(3, 10, r.pha_code);
    set(13, 9, r.family_id);
    set(22, 35, r.head_name);
    set(57, 8, formatDateFixed(r.dob));
    set(65, 2, padNumeric(r.household_size, 2));
    setNum(67, 8, r.annual_income);
    set(75, 15, r.voucher_number);
    set(90, 3, r.voucher_type);
    set(93, 8, formatDateFixed(r.move_in_date));
    set(101, 2, padNumeric(r.bedroom_size, 2));
    setNum(103, 8, r.gross_rent);
    setNum(111, 8, r.utility_allowance);
    setNum(119, 8, r.hap_amount);
    setNum(127, 8, r.tenant_rent);
    setNum(135, 8, r.total_rent);
    set(143, 8, formatDateFixed(r.lease_start));
    set(151, 8, formatDateFixed(r.lease_end));
    set(159, 1, r.disability === 'true' || r.disability === 'Y' ? 'Y' : 'N');
    set(160, 2, (r.race_ethnicity || '').slice(0, 2));
    set(162, 8, format(new Date(), 'MMddyyyy'));

    return line;
  });

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/plain;charset=ascii' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportHAPPaymentRegisterPdf = async (
  agencyName: string,
  batchNumber: string,
  periodMonth: string,
  items: Array<{ landlord_id: string | null; tenant_id: string | null; hap_amount: number; tenant_portion: number; gross_rent: number; utility_allowance: number; adjustment_amount: number; net_payment: number; status: string }>
) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const included = items.filter(i => i.status !== 'excluded');
  const totalNet = included.reduce((s, i) => s + i.net_payment, 0);

  doc.setFontSize(16);
  doc.text('HAP Payment Register', 14, 20);
  doc.setFontSize(10);
  doc.text(`Agency: ${agencyName}`, 14, 28);
  doc.text(`Batch: ${batchNumber}`, 14, 34);
  doc.text(`Period: ${format(new Date(periodMonth), 'MMMM yyyy')}`, 14, 40);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 46);
  doc.text(`Total: $${totalNet.toFixed(2)} | Units: ${included.length}`, 14, 52);

  autoTable(doc, {
    startY: 58,
    head: [['Landlord', 'Tenant', 'Gross Rent', 'UA', 'HAP', 'Adjust', 'Net Payment']],
    body: included.map(i => [
      i.landlord_id?.slice(0, 8) || 'N/A',
      i.tenant_id?.slice(0, 8) || 'N/A',
      `$${i.gross_rent.toFixed(2)}`,
      `$${i.utility_allowance.toFixed(2)}`,
      `$${i.hap_amount.toFixed(2)}`,
      `$${i.adjustment_amount.toFixed(2)}`,
      `$${i.net_payment.toFixed(2)}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 65, 122] },
  });

  doc.save(`HAP-Register-${batchNumber}-${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const exportSEMAPPdf = async (
  agencyName: string,
  period: string,
  indicators: Array<{ number: number; name: string; maxPoints: number; score: number; notes: string }>
) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  const totalMax = indicators.reduce((s, i) => s + i.maxPoints, 0);
  const totalScore = indicators.reduce((s, i) => s + i.score, 0);
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const pass = pct >= 60;

  doc.setFontSize(16);
  doc.text('SEMAP Self-Assessment Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Agency: ${agencyName}`, 14, 28);
  doc.text(`Reporting Period: ${period}`, 14, 34);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 40);
  
  doc.setFontSize(14);
  doc.setTextColor(pass ? 0 : 220, pass ? 128 : 50, pass ? 0 : 50);
  doc.text(`Overall: ${totalScore}/${totalMax} (${pct}%) — ${pass ? 'PASS' : 'FAIL'}`, 14, 50);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 56,
    head: [['#', 'Indicator', 'Max', 'Score', 'Status', 'Notes']],
    body: indicators.map(i => [
      i.number,
      i.name,
      i.maxPoints,
      i.score,
      i.score >= Math.ceil(i.maxPoints * 0.6) ? 'Pass' : 'Fail',
      i.notes || ''
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 65, 122] },
  });

  doc.save(`SEMAP-Report-${period}-${format(new Date(), 'yyyyMMdd')}.pdf`);
};
