import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  propertyAddress: string;
  unitIdentifier: string;
  occupancy: string;
  bedrooms: number | null;
  bathrooms: number | null;
  totalRent: number;
  voucherPayment: number;
  tenantPayment: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: string;
  forSaleStatus: string;
  marketingPrice: number | null;
}

interface Summary {
  totalProperties: number;
  totalRent: number;
  totalVoucherPayments: number;
  totalTenantPayments: number;
  activeLeases: number;
}

export const generateCSV = (data: ExportData[], summary: Summary, timestamp: string) => {
  const headers = [
    'Property Address',
    'Unit Identifier',
    'Occupancy',
    'Bedrooms',
    'Bathrooms',
    'Total Rent Amount',
    'Voucher Payment',
    'Tenant Payment',
    'Lease Start Date',
    'Lease End Date',
    'Status',
    'For Sale Status',
    'Marketing Price'
  ];

  const csvContent = [
    // Add export info
    [`Portfolio Export - Generated on ${new Date(timestamp).toLocaleString()}`],
    [''],
    // Add summary
    ['SUMMARY'],
    [`Total Properties: ${summary.totalProperties}`],
    [`Total Rent: $${summary.totalRent.toLocaleString()}`],
    [`Total Voucher Payments: $${summary.totalVoucherPayments.toLocaleString()}`],
    [`Total Tenant Payments: $${summary.totalTenantPayments.toLocaleString()}`],
    [`Active Leases: ${summary.activeLeases}`],
    [''],
    // Add headers
    headers,
    // Add data rows
    ...data.map(row => [
      row.propertyAddress,
      row.unitIdentifier,
      row.occupancy,
      row.bedrooms?.toString() || '',
      row.bathrooms?.toString() || '',
      row.totalRent.toString(),
      row.voucherPayment.toString(),
      row.tenantPayment.toString(),
      row.leaseStartDate,
      row.leaseEndDate,
      row.status,
      row.forSaleStatus,
      row.marketingPrice?.toString() || ''
    ])
  ];

  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `portfolio-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generatePDF = async (data: ExportData[], summary: Summary, timestamp: string) => {
  const doc = new jsPDF('l', 'mm', 'letter'); // Landscape for wide data
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Export Report', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exported on ${new Date(timestamp).toLocaleString()} UTC`, pageWidth / 2, 22, { align: 'center' });
  
  // Summary section
  const summaryData = [
    ['Total Properties', summary.totalProperties.toString()],
    ['Total Rent', `$${summary.totalRent.toLocaleString()}`],
    ['Voucher Payments', `$${summary.totalVoucherPayments.toLocaleString()}`],
    ['Tenant Payments', `$${summary.totalTenantPayments.toLocaleString()}`],
    ['Active Leases', summary.activeLeases.toString()]
  ];
  
  autoTable(doc, {
    head: [['Portfolio Summary', 'Value']],
    body: summaryData,
    startY: 30,
    theme: 'grid',
    headStyles: { 
      fillColor: [37, 99, 235],
      fontSize: 11,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' }
    }
  });
  
  // Property details
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Details', 14, currentY);
  
  const tableColumns = [
    'Address',
    'Units',
    'Occupancy',
    'Bed',
    'Bath',
    'Total Rent',
    'Voucher',
    'Tenant',
    'Lease Start',
    'Lease End',
    'Status',
    'For Sale',
    'Marketing Price'
  ];
  
  const tableRows = data.map(row => [
    row.propertyAddress.length > 30 ? row.propertyAddress.substring(0, 27) + '...' : row.propertyAddress,
    row.unitIdentifier,
    row.occupancy,
    row.bedrooms?.toString() || '-',
    row.bathrooms?.toString() || '-',
    `$${row.totalRent.toLocaleString()}`,
    `$${row.voucherPayment.toLocaleString()}`,
    `$${row.tenantPayment.toLocaleString()}`,
    row.leaseStartDate || '-',
    row.leaseEndDate || '-',
    row.status,
    row.forSaleStatus,
    row.marketingPrice ? `$${row.marketingPrice.toLocaleString()}` : '-'
  ]);
  
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: currentY + 5,
    theme: 'striped',
    headStyles: { 
      fillColor: [37, 99, 235],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      12: { halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Portfolio Management System Report', pageWidth / 2, finalY, { align: 'center' });
  
  // Save the PDF
  doc.save(`portfolio-export-${new Date().toISOString().split('T')[0]}.pdf`);
};
