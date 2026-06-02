interface RentalOwnerStatementExportData {
  property_address: string;
  owner_name: string;
  beginning_balance: number;
  additions_to_cash: number;
  subtractions_from_cash: number;
  ending_balance: number;
  adjustments: number;
  available_for_payment: number;
  date_range: string;
}

interface RentalOwnerSummary {
  total_properties: number;
  total_beginning_balance: number;
  total_additions: number;
  total_subtractions: number;
  total_ending_balance: number;
  total_adjustments: number;
  total_available_for_payment: number;
  generation_date: string;
}

export const generateRentalOwnerStatementCSV = (
  data: RentalOwnerStatementExportData[], 
  summary: RentalOwnerSummary,
  reportMessage?: string
) => {
  const headers = [
    'Property Address',
    'Owner Name',
    'Beginning Balance',
    'Additions to Cash',
    'Subtractions from Cash',
    'Ending Balance',
    'Adjustments',
    'Available for Payment'
  ];

  const csvContent = [
    // Report header
    [`Rental Owner Statement - ${summary.generation_date}`],
    [''],
    // Message if provided
    ...(reportMessage ? [[`Message: ${reportMessage}`], ['']] : []),
    // Summary section
    ['SUMMARY'],
    [`Total Properties: ${summary.total_properties}`],
    [`Total Beginning Balance: $${summary.total_beginning_balance.toLocaleString()}`],
    [`Total Additions to Cash: $${summary.total_additions.toLocaleString()}`],
    [`Total Subtractions from Cash: $${summary.total_subtractions.toLocaleString()}`],
    [`Total Ending Balance: $${summary.total_ending_balance.toLocaleString()}`],
    [`Total Adjustments: $${summary.total_adjustments.toLocaleString()}`],
    [`Total Available for Payment: $${summary.total_available_for_payment.toLocaleString()}`],
    [''],
    // Property details header
    ['PROPERTY DETAILS'],
    headers,
    // Property data
    ...data.map(row => [
      row.property_address,
      row.owner_name,
      `$${row.beginning_balance.toLocaleString()}`,
      `$${row.additions_to_cash.toLocaleString()}`,
      `$${row.subtractions_from_cash.toLocaleString()}`,
      `$${row.ending_balance.toLocaleString()}`,
      `$${row.adjustments.toLocaleString()}`,
      `$${row.available_for_payment.toLocaleString()}`
    ])
  ];

  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rental-owner-statement-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateRentalOwnerStatementPDF = async (
  data: RentalOwnerStatementExportData[],
  summary: RentalOwnerSummary,
  reportMessage?: string
) => {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Rental Owner Statement', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.generation_date, pageWidth / 2, 22, { align: 'center' });
  
  let currentY = 30;
  
  // Message section if provided
  if (reportMessage) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Message:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const messageLines = doc.splitTextToSize(reportMessage, pageWidth - 28);
    doc.text(messageLines, 14, currentY + 5);
    currentY += 5 + (messageLines.length * 5) + 5;
  }
  
  // Summary section
  const summaryData = [
    ['Total Properties', summary.total_properties.toString()],
    ['Total Beginning Balance', `$${summary.total_beginning_balance.toLocaleString()}`],
    ['Total Additions to Cash', `$${summary.total_additions.toLocaleString()}`],
    ['Total Subtractions from Cash', `$${summary.total_subtractions.toLocaleString()}`],
    ['Total Ending Balance', `$${summary.total_ending_balance.toLocaleString()}`],
    ['Total Adjustments', `$${summary.total_adjustments.toLocaleString()}`],
    ['Total Available for Payment', `$${summary.total_available_for_payment.toLocaleString()}`]
  ];
  
  autoTable(doc, {
    head: [['Financial Summary', 'Amount']],
    body: summaryData,
    startY: currentY,
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
  
  // Property details table
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Details', 14, currentY);
  
  const tableColumns = [
    'Property Address',
    'Owner',
    'Beginning Balance',
    'Additions',
    'Subtractions',
    'Ending Balance',
    'Adjustments',
    'Available'
  ];
  
  const tableRows = data.map(row => [
    row.property_address.length > 30 ? row.property_address.substring(0, 27) + '...' : row.property_address,
    row.owner_name.length > 20 ? row.owner_name.substring(0, 17) + '...' : row.owner_name,
    `$${row.beginning_balance.toLocaleString()}`,
    `$${row.additions_to_cash.toLocaleString()}`,
    `$${row.subtractions_from_cash.toLocaleString()}`,
    `$${row.ending_balance.toLocaleString()}`,
    `$${row.adjustments.toLocaleString()}`,
    `$${row.available_for_payment.toLocaleString()}`
  ]);
  
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: currentY + 5,
    theme: 'grid',
    headStyles: { 
      fillColor: [37, 99, 235],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' }
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
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, finalY, { align: 'center' });
  
  // Save the PDF
  doc.save(`rental-owner-statement-${new Date().toISOString().split('T')[0]}.pdf`);
};