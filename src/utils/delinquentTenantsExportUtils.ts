import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface DelinquentTenant {
  propertyAddress: string;
  unit: string;
  tenantName: string;
  totalBalance: number;
  breakdown: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
  lastPayment: string | null;
  phone?: string;
  email?: string;
}

interface DelinquentSummary {
  totalOutstanding: number;
  agingBreakdown: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
}

export const generateDelinquentTenantsCSV = (
  tenants: DelinquentTenant[],
  summary: DelinquentSummary,
  dateRange: { from?: Date; to?: Date },
  showPhone: boolean,
  showEmail: boolean
) => {
  const headers = [
    'Property',
    'Unit',
    'Tenant',
    'Total Balance',
    '0-30 Days',
    '31-60 Days',
    '61-90 Days',
    '90+ Days',
    'Last Payment'
  ];
  
  if (showPhone) headers.push('Phone');
  if (showEmail) headers.push('Email');
  
  const rows: string[] = [];
  rows.push(headers.join(','));
  
  tenants.forEach(tenant => {
    const row = [
      `"${tenant.propertyAddress}"`,
      `"${tenant.unit}"`,
      `"${tenant.tenantName}"`,
      tenant.totalBalance.toFixed(2),
      tenant.breakdown.current.toFixed(2),
      tenant.breakdown.days30.toFixed(2),
      tenant.breakdown.days60.toFixed(2),
      tenant.breakdown.days90Plus.toFixed(2),
      tenant.lastPayment ? format(new Date(tenant.lastPayment), 'MM/dd/yyyy') : 'Never'
    ];
    
    if (showPhone) row.push(`"${tenant.phone || ''}"`);
    if (showEmail) row.push(`"${tenant.email || ''}"`);
    
    rows.push(row.join(','));
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `delinquent-tenants-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generateDelinquentTenantsPDF = (
  tenants: DelinquentTenant[],
  summary: DelinquentSummary,
  dateRange: { from?: Date; to?: Date },
  showPhone: boolean,
  showEmail: boolean
) => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Current Delinquent Tenants Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const reportDate = dateRange.to ? format(dateRange.to, 'M/d/yyyy') : format(new Date(), 'M/d/yyyy');
  doc.text(`As of ${reportDate}`, pageWidth / 2, 28, { align: 'center' });
  
  // Summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 40);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Delinquent: ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}`, 14, 48);
  doc.text(`Total Outstanding: $${summary.totalOutstanding.toFixed(2)}`, 14, 54);
  doc.text(`0-30 Days: $${summary.agingBreakdown.current.toFixed(2)}`, 100, 48);
  doc.text(`31-60 Days: $${summary.agingBreakdown.days30.toFixed(2)}`, 100, 54);
  doc.text(`61-90 Days: $${summary.agingBreakdown.days60.toFixed(2)}`, 180, 48);
  doc.text(`90+ Days: $${summary.agingBreakdown.days90Plus.toFixed(2)}`, 180, 54);
  
  // Group tenants by property
  const groupedTenants = new Map<string, DelinquentTenant[]>();
  tenants.forEach(tenant => {
    if (!groupedTenants.has(tenant.propertyAddress)) {
      groupedTenants.set(tenant.propertyAddress, []);
    }
    groupedTenants.get(tenant.propertyAddress)!.push(tenant);
  });
  
  let yPos = 65;
  
  // Delinquent tenants by property
  groupedTenants.forEach((propertyTenants, propertyAddress) => {
    // Check if we need a new page
    if (yPos > 170) {
      doc.addPage();
      yPos = 20;
    }
    
    // Property header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(propertyAddress, 14, yPos);
    yPos += 6;
    
    // Tenants table
    const tableData = propertyTenants.map(t => {
      const row = [
        t.unit,
        t.tenantName,
        t.lastPayment ? format(new Date(t.lastPayment), 'MM/dd/yy') : 'Never',
        `$${t.totalBalance.toFixed(2)}`,
        t.breakdown.current > 0 ? `$${t.breakdown.current.toFixed(2)}` : '—',
        t.breakdown.days30 > 0 ? `$${t.breakdown.days30.toFixed(2)}` : '—',
        t.breakdown.days60 > 0 ? `$${t.breakdown.days60.toFixed(2)}` : '—',
        t.breakdown.days90Plus > 0 ? `$${t.breakdown.days90Plus.toFixed(2)}` : '—'
      ];
      
      if (showPhone) row.push(t.phone || '—');
      if (showEmail) row.push(t.email || '—');
      
      return row;
    });
    
    const headers = ['Unit', 'Tenant', 'Last Payment', 'Total', '0-30', '31-60', '61-90', '90+'];
    if (showPhone) headers.push('Phone');
    if (showEmail) headers.push('Email');
    
    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 20, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  });
  
  doc.save(`delinquent-tenants-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
