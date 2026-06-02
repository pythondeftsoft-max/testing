import { format } from 'date-fns';
import { exportCSV } from './exportHUDReport';

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  metadata: any;
  created_at: string;
  actor_name?: string;
}

export const exportAuditTrailCSV = (entries: AuditEntry[], agencyName: string) => {
  const rows = [
    ['Date/Time', 'Staff Member', 'Action', 'Entity Type', 'Entity ID', 'Details'],
    ...entries.map(e => [
      format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      e.actor_name || e.actor_id || 'System',
      e.action,
      e.entity_type,
      e.entity_id,
      e.metadata ? JSON.stringify(e.metadata) : '',
    ]),
  ];
  exportCSV(rows, `${agencyName}-Audit-Trail`);
};

export const exportAuditTrailPDF = async (entries: AuditEntry[], agencyName: string, dateRange?: { from?: Date; to?: Date }) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  let y = 20;

  doc.setFontSize(16);
  doc.text('Agency Audit Trail Report', 14, y); y += 8;
  doc.setFontSize(10);
  doc.text(`Agency: ${agencyName}`, 14, y); y += 6;
  if (dateRange?.from || dateRange?.to) {
    const from = dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start';
    const to = dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Present';
    doc.text(`Period: ${from} — ${to}`, 14, y); y += 6;
  }
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, y); y += 6;
  doc.text(`Total Entries: ${entries.length}`, 14, y); y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Date/Time', 'Staff', 'Action', 'Entity Type', 'Entity ID', 'Details']],
    body: entries.map(e => [
      format(new Date(e.created_at), 'MMM d, yyyy h:mm a'),
      e.actor_name || e.actor_id?.slice(0, 8) || 'System',
      e.action,
      e.entity_type,
      e.entity_id.slice(0, 8),
      e.metadata ? Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 60) : '',
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [41, 65, 122] },
    columnStyles: {
      5: { cellWidth: 60 },
    },
  });

  doc.save(`Audit-Trail-${agencyName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}.pdf`);
};
