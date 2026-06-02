import { TrialBalanceAccount, TrialBalanceData } from '@/hooks/useTrialBalance';

interface TrialBalanceExportData {
  accounts: TrialBalanceAccount[];
  summary: TrialBalanceData['summary'];
  date_range: string;
}

export const generateTrialBalanceCSV = (
  data: TrialBalanceExportData,
  reportMessage?: string
) => {
  const headers = [
    'Account Code',
    'Account Name',
    'Account Type',
    'Beginning Balance',
    'Debits',
    'Credits',
    'Net Activity',
    'Ending Balance'
  ];

  const csvContent = [
    // Report header
    [`Trial Balance - ${data.date_range}`],
    [''],
    // Message if provided
    ...(reportMessage ? [[`Message: ${reportMessage}`], ['']] : []),
    // Summary section
    ['SUMMARY'],
    [`Properties Count: ${data.summary.properties_count}`],
    [`Total Debits: $${data.summary.total_debits.toLocaleString()}`],
    [`Total Credits: $${data.summary.total_credits.toLocaleString()}`],
    [`Total Assets: $${data.summary.total_assets.toLocaleString()}`],
    [`Total Liabilities: $${data.summary.total_liabilities.toLocaleString()}`],
    [`Total Income: $${data.summary.total_income.toLocaleString()}`],
    [`Total Expenses: $${data.summary.total_expenses.toLocaleString()}`],
    [`Balance Status: ${data.summary.is_balanced ? 'BALANCED' : 'NOT BALANCED'}`],
    [''],
    // Account details header
    ['ACCOUNT DETAILS'],
    headers,
    // Account data grouped by type
    ...['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES'].flatMap(accountType => {
      const typeAccounts = data.accounts.filter(acc => acc.account_type === accountType);
      if (typeAccounts.length === 0) return [];
      
      return [
        [`--- ${accountType} ---`],
        ...typeAccounts.map(account => [
          account.account_code,
          account.account_name,
          account.account_type,
          `$${account.beginning_balance.toLocaleString()}`,
          `$${account.debits.toLocaleString()}`,
          `$${account.credits.toLocaleString()}`,
          `$${account.net_activity.toLocaleString()}`,
          `$${account.ending_balance.toLocaleString()}`
        ]),
        [''] // Empty row between account types
      ];
    })
  ];

  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `trial-balance-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateTrialBalancePDF = async (
  data: TrialBalanceExportData,
  reportMessage?: string
) => {
  const accountsByType = {
    ASSETS: data.accounts.filter(acc => acc.account_type === 'ASSETS'),
    LIABILITIES: data.accounts.filter(acc => acc.account_type === 'LIABILITIES'),
    INCOME: data.accounts.filter(acc => acc.account_type === 'INCOME'),
    EXPENSES: data.accounts.filter(acc => acc.account_type === 'EXPENSES')
  };

  const doc = new jsPDF('l', 'mm', 'letter'); // Landscape for wide data
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Trial Balance Report', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date_range, pageWidth / 2, 22, { align: 'center' });
  
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
    ['Total Properties', data.summary.properties_count.toString()],
    ['Total Debits', `$${data.summary.total_debits.toLocaleString()}`],
    ['Total Credits', `$${data.summary.total_credits.toLocaleString()}`],
    ['Total Assets', `$${data.summary.total_assets.toLocaleString()}`],
    ['Total Liabilities', `$${data.summary.total_liabilities.toLocaleString()}`],
    ['Total Income', `$${data.summary.total_income.toLocaleString()}`],
    ['Total Expenses', `$${data.summary.total_expenses.toLocaleString()}`],
    ['Balance Status', data.summary.is_balanced ? '✅ BALANCED' : '⚠️ NOT BALANCED']
  ];
  
  autoTable(doc, {
    head: [['Trial Balance Summary', 'Value']],
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
    },
    didParseCell: (cellData) => {
      // Color the balance status row
      if (cellData.row.index === 7) {
        cellData.cell.styles.fillColor = data.summary.is_balanced ? [220, 252, 231] : [254, 242, 242];
        cellData.cell.styles.textColor = data.summary.is_balanced ? [22, 163, 74] : [220, 38, 38];
        cellData.cell.styles.fontStyle = 'bold';
      }
    }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Account details by type
  Object.entries(accountsByType).forEach(([type, accounts]) => {
    if (accounts.length === 0) return;
    
    // Check if we need a new page
    if (currentY > 170) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(type, 14, currentY);
    
    const tableColumns = [
      'Code',
      'Account Name',
      'Beginning Balance',
      'Debits',
      'Credits',
      'Net Activity',
      'Ending Balance'
    ];
    
    const tableRows = accounts.map(account => [
      account.account_code,
      account.account_name.length > 30 ? account.account_name.substring(0, 27) + '...' : account.account_name,
      `$${account.beginning_balance.toLocaleString()}`,
      account.debits > 0 ? `$${account.debits.toLocaleString()}` : '-',
      account.credits > 0 ? `$${account.credits.toLocaleString()}` : '-',
      `$${account.net_activity.toLocaleString()}`,
      `$${account.ending_balance.toLocaleString()}`
    ]);
    
    // Add type total row
    const typeTotal = accounts.reduce((sum, acc) => sum + acc.ending_balance, 0);
    tableRows.push([
      { content: `${type} TOTAL`, colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } } as any,
      `$${typeTotal.toLocaleString()}`
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
        6: { halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (cellData) => {
        // Make the last row (totals) bold with blue background
        if (cellData.row.index === tableRows.length - 1) {
          cellData.cell.styles.fillColor = [226, 232, 240];
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  });
  
  // Save the PDF
  doc.save(`trial-balance-${new Date().toISOString().split('T')[0]}.pdf`);
};