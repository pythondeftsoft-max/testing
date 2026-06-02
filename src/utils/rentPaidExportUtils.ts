import { format } from 'date-fns';
import { RentPaidData, RentPaidDataItem } from '@/hooks/useRentPaidData';
import { formatCurrency } from '@/lib/formatters';

export const generateRentPaidCSV = (
  data: RentPaidData,
  dateRange: { from: Date | undefined; to: Date | undefined },
  portfolioName: string = 'All Portfolios'
) => {
  const timestamp = new Date().toISOString();
  const dateRangeStr = dateRange.from && dateRange.to 
    ? `${format(dateRange.from, 'MM/dd/yyyy')} - ${format(dateRange.to, 'MM/dd/yyyy')}`
    : 'All Time';

  const headers = [
    'Property',
    'Unit',
    'Tenant',
    'Lease Start',
    'Lease End',
    'Recurring Charges - Rent',
    'Recurring Charges - Non-Rent',
    'Recurring Charges - Total',
    'Amount Paid - Rent',
    'Amount Paid - Non-Rent',
    'Amount Paid - Total',
    'Previous Balance',
    'Balance Due'
  ];

  const csvContent = [
    // Report header
    [`Rent Paid Report - Generated on ${new Date(timestamp).toLocaleString()}`],
    [`Portfolio: ${portfolioName}`],
    [`Date Range: ${dateRangeStr}`],
    [''],
    // Summary section
    ['SUMMARY'],
    [`Total Recurring Charges (Rent): ${formatCurrency(data.totals.recurringChargesRent)}`],
    [`Total Recurring Charges (Non-Rent): ${formatCurrency(data.totals.recurringChargesNonRent)}`],
    [`Total Recurring Charges: ${formatCurrency(data.totals.recurringChargesTotal)}`],
    [`Total Amount Paid (Rent): ${formatCurrency(data.totals.amountPaidRent)}`],
    [`Total Amount Paid (Non-Rent): ${formatCurrency(data.totals.amountPaidNonRent)}`],
    [`Total Amount Paid: ${formatCurrency(data.totals.amountPaidTotal)}`],
    [`Total Previous Balance: ${formatCurrency(data.totals.previousBalance)}`],
    [`Total Balance Due: ${formatCurrency(data.totals.balanceDue)}`],
    [''],
    // Data headers
    headers,
    // Data rows
    ...data.details.map(row => [
      row.property,
      row.unit.split(' - Unit ')[1] || '1',
      row.tenant,
      row.leaseStart ? format(new Date(row.leaseStart), 'MM/dd/yyyy') : '',
      row.leaseEnd ? format(new Date(row.leaseEnd), 'MM/dd/yyyy') : '',
      row.recurringChargesRent.toString(),
      row.recurringChargesNonRent.toString(),
      row.recurringChargesTotal.toString(),
      row.amountPaidRent.toString(),
      row.amountPaidNonRent.toString(),
      row.amountPaidTotal.toString(),
      row.previousBalance.toString(),
      row.balanceDue.toString()
    ]),
    // Grand total row
    [
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      data.totals.recurringChargesRent.toString(),
      data.totals.recurringChargesNonRent.toString(),
      data.totals.recurringChargesTotal.toString(),
      data.totals.amountPaidRent.toString(),
      data.totals.amountPaidNonRent.toString(),
      data.totals.amountPaidTotal.toString(),
      data.totals.previousBalance.toString(),
      data.totals.balanceDue.toString()
    ]
  ];

  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rent-paid-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateRentPaidPDF = async (
  data: RentPaidData,
  dateRange: { from: Date | undefined; to: Date | undefined },
  portfolioName: string = 'All Portfolios'
) => {
  const timestamp = new Date().toISOString();
  const dateRangeStr = dateRange.from && dateRange.to 
    ? `${format(dateRange.from, 'MM/dd/yyyy')} - ${format(dateRange.to, 'MM/dd/yyyy')}`
    : 'All Time';

  const doc = new jsPDF('l', 'mm', 'letter'); // Landscape for wide data
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Rent Paid Report', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Portfolio: ${portfolioName}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Date Range: ${dateRangeStr}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Generated: ${new Date(timestamp).toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });
  
  // Summary section
  const summaryData = [
    ['Total Recurring Charges (Rent)', formatCurrency(data.totals.recurringChargesRent)],
    ['Total Recurring Charges (Non-Rent)', formatCurrency(data.totals.recurringChargesNonRent)],
    ['Total Recurring Charges', formatCurrency(data.totals.recurringChargesTotal)],
    ['Total Amount Paid', formatCurrency(data.totals.amountPaidTotal)],
    ['Total Previous Balance', formatCurrency(data.totals.previousBalance)],
    ['Total Balance Due', formatCurrency(data.totals.balanceDue)]
  ];
  
  autoTable(doc, {
    head: [['Financial Summary', 'Amount']],
    body: summaryData,
    startY: 40,
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
  
  // Detailed payment records
  const currentY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Payment Records', 14, currentY);
  
  const tableColumns = [
    'Property',
    'Unit',
    'Tenant',
    'Lease Start',
    'Lease End',
    'Recurring (Rent)',
    'Recurring (Non)',
    'Recurring (Total)',
    'Paid (Rent)',
    'Paid (Non)',
    'Paid (Total)',
    'Prev Bal',
    'Bal Due'
  ];
  
  const tableRows = data.details.map(row => [
    row.property.length > 25 ? row.property.substring(0, 22) + '...' : row.property,
    row.unit.split(' - Unit ')[1] || '1',
    row.tenant.length > 15 ? row.tenant.substring(0, 12) + '...' : row.tenant,
    row.leaseStart ? format(new Date(row.leaseStart), 'MM/dd/yy') : 'N/A',
    row.leaseEnd ? format(new Date(row.leaseEnd), 'MM/dd/yy') : 'N/A',
    formatCurrency(row.recurringChargesRent),
    formatCurrency(row.recurringChargesNonRent),
    formatCurrency(row.recurringChargesTotal),
    formatCurrency(row.amountPaidRent),
    formatCurrency(row.amountPaidNonRent),
    formatCurrency(row.amountPaidTotal),
    formatCurrency(row.previousBalance),
    formatCurrency(row.balanceDue)
  ]);
  
  // Add grand total row
  tableRows.push([
    { content: 'GRAND TOTAL', colSpan: 5, styles: { fontStyle: 'bold', halign: 'center' } } as any,
    formatCurrency(data.totals.recurringChargesRent),
    formatCurrency(data.totals.recurringChargesNonRent),
    formatCurrency(data.totals.recurringChargesTotal),
    formatCurrency(data.totals.amountPaidRent),
    formatCurrency(data.totals.amountPaidNonRent),
    formatCurrency(data.totals.amountPaidTotal),
    formatCurrency(data.totals.previousBalance),
    formatCurrency(data.totals.balanceDue)
  ]);
  
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: currentY + 5,
    theme: 'grid',
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
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right' },
      12: { halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: (data) => {
      // Make the last row (totals) bold with blue background
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fillColor = [219, 234, 254];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });
  
  // Save the PDF
  doc.save(`rent-paid-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};