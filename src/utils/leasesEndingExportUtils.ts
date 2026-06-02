import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface LeaseEndingInfo {
  propertyAddress: string;
  unit: string;
  tenantName: string;
  email?: string;
  phone?: string;
  rent: number;
  nonRent: number;
  credits: number;
  leaseStart: string | null;
  leaseEnd: string | null;
  whenLeaseEnds: string;
  nextLease: string;
  leaseStatus: string;
  daysUntilExpiry: number;
}

export const generateLeasesEndingPDF = (
  leases: LeaseEndingInfo[],
  dateRange: { from: Date; to: Date }
) => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Leases Ending Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateRangeText = `${format(dateRange.from, 'M/d/yyyy')} - ${format(dateRange.to, 'M/d/yyyy')}`;
  doc.text(dateRangeText, pageWidth / 2, 28, { align: 'center' });
  
  // Summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 40);
  
  const ending30Days = leases.filter(l => l.daysUntilExpiry > 0 && l.daysUntilExpiry <= 30).length;
  const ending60Days = leases.filter(l => l.daysUntilExpiry > 30 && l.daysUntilExpiry <= 60).length;
  const ending90Plus = leases.filter(l => l.daysUntilExpiry > 60).length;
  const expired = leases.filter(l => l.daysUntilExpiry <= 0).length;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Leases: ${leases.length}`, 14, 48);
  doc.text(`Ending in 30 Days: ${ending30Days}`, 70, 48);
  doc.text(`Ending in 31-60 Days: ${ending60Days}`, 140, 48);
  doc.text(`Ending in 60+ Days: ${ending90Plus}`, 210, 48);
  doc.text(`Already Expired: ${expired}`, 14, 54);
  
  // Leases table
  const tableData = leases.map(lease => {
    const unit = lease.unit === 'N/A' || lease.unit.includes('Main') ? 'Main' : lease.unit;
    return [
      lease.propertyAddress,
      unit,
      lease.tenantName,
      `$${lease.rent.toFixed(0)}`,
      lease.leaseStart ? format(new Date(lease.leaseStart), 'MM/dd/yy') : '—',
      lease.leaseEnd ? format(new Date(lease.leaseEnd), 'MM/dd/yy') : '—',
      lease.whenLeaseEnds,
      lease.nextLease,
      lease.leaseStatus,
      lease.daysUntilExpiry <= 0 ? 'Expired' : `${lease.daysUntilExpiry}d`
    ];
  });
  
  autoTable(doc, {
    startY: 62,
    head: [['Property', 'Unit', 'Tenant', 'Rent', 'Start', 'End', 'When Ends', 'Next Lease', 'Status', 'Days Left']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 153], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 15 },
      2: { cellWidth: 35 },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 },
      8: { cellWidth: 25 },
      9: { cellWidth: 18, halign: 'center' }
    },
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      // Color-code rows by urgency
      if (data.section === 'body' && data.column.index === 9) {
        const daysText = data.cell.text[0];
        if (daysText === 'Expired' || (daysText && parseInt(daysText) <= 30)) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fillColor = [254, 226, 226]; // Light red
        } else if (daysText && parseInt(daysText) <= 60) {
          data.cell.styles.textColor = [234, 88, 12]; // Orange
          data.cell.styles.fillColor = [255, 237, 213]; // Light orange
        }
      }
    }
  });
  
  doc.save(`leases-ending-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
