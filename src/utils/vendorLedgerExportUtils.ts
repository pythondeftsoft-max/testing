import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface VendorTransaction {
  date: string;
  propertyAddress: string;
  referenceNumber: string;
  description: string;
  billAmount: number;
  paymentAmount: number;
}

interface VendorLedgerData {
  vendorName: string;
  totalBills: number;
  totalPayments: number;
  outstandingBalance: number;
  transactions: VendorTransaction[];
}

export const generateVendorLedgerCSV = (
  ledgerData: VendorLedgerData[],
  dateRange: { from?: Date; to?: Date }
) => {
  const headers = ['Vendor Name', 'Property', 'Date', 'Ref No', 'Description', 'Bill Amount', 'Payment Amount'];
  
  const rows: string[] = [];
  
  // Add header row
  rows.push(headers.join(','));
  
  // Add data rows grouped by vendor
  ledgerData.forEach(vendor => {
    vendor.transactions.forEach(transaction => {
      const row = [
        `"${vendor.vendorName}"`,
        `"${transaction.propertyAddress}"`,
        format(new Date(transaction.date), 'MM/dd/yyyy'),
        `"${transaction.referenceNumber}"`,
        `"${transaction.description}"`,
        transaction.billAmount.toFixed(2),
        transaction.paymentAmount.toFixed(2)
      ];
      rows.push(row.join(','));
    });
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendor-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generateVendorLedgerPDF = (
  ledgerData: VendorLedgerData[],
  dateRange: { from?: Date; to?: Date },
  totalBills: number,
  totalPayments: number,
  outstandingBalance: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor Ledger Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateRangeText = `From ${dateRange.from ? format(dateRange.from, 'M/d/yyyy') : 'All Time'} to ${dateRange.to ? format(dateRange.to, 'M/d/yyyy') : 'Present'}`;
  doc.text(dateRangeText, pageWidth / 2, 28, { align: 'center' });
  
  // Summary section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 40);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Bills: $${totalBills.toFixed(2)}`, 14, 48);
  doc.text(`Total Payments: $${totalPayments.toFixed(2)}`, 14, 54);
  doc.text(`Outstanding Balance: $${Math.abs(outstandingBalance).toFixed(2)}`, 14, 60);
  
  let yPos = 70;
  
  // Vendor details
  ledgerData.forEach((vendor, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Vendor header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(vendor.vendorName, 14, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bills: $${vendor.totalBills.toFixed(2)} | Payments: $${vendor.totalPayments.toFixed(2)} | Balance: $${vendor.outstandingBalance.toFixed(2)}`, 14, yPos);
    yPos += 4;
    
    // Transactions table
    const tableData = vendor.transactions.map(t => [
      format(new Date(t.date), 'MM/dd/yyyy'),
      t.propertyAddress,
      t.referenceNumber,
      t.description,
      t.billAmount > 0 ? `$${t.billAmount.toFixed(2)}` : '',
      t.paymentAmount > 0 ? `$${t.paymentAmount.toFixed(2)}` : ''
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Property', 'Ref No', 'Description', 'Bill', 'Payment']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 45 },
        2: { cellWidth: 20 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  });
  
  doc.save(`vendor-ledger-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
