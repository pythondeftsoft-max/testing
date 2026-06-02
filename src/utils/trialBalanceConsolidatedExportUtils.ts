import { ConsolidatedAccount } from '@/hooks/useTrialBalanceConsolidated';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConsolidatedTrialBalanceExportData {
  accounts: ConsolidatedAccount[];
  date_range: string;
}

export const generateTrialBalanceConsolidatedCSV = (
  data: ConsolidatedTrialBalanceExportData,
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
    [`Trial Balance Consolidated - ${data.date_range}`],
    [''],
    // Message if provided
    ...(reportMessage ? [[`Message: ${reportMessage}`], ['']] : []),
    // Account details header
    ['CONSOLIDATED ACCOUNT DETAILS'],
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
    }),
    [''],
    // Totals
    ['TOTALS'],
    ['Total Debits', `$${data.accounts.reduce((sum, acc) => sum + acc.debits, 0).toLocaleString()}`],
    ['Total Credits', `$${data.accounts.reduce((sum, acc) => sum + acc.credits, 0).toLocaleString()}`],
    ['Total Assets', `$${data.accounts.filter(acc => acc.account_type === 'ASSETS').reduce((sum, acc) => sum + acc.ending_balance, 0).toLocaleString()}`],
    ['Total Liabilities', `$${data.accounts.filter(acc => acc.account_type === 'LIABILITIES').reduce((sum, acc) => sum + acc.ending_balance, 0).toLocaleString()}`],
    ['Total Income', `$${data.accounts.filter(acc => acc.account_type === 'INCOME').reduce((sum, acc) => sum + acc.ending_balance, 0).toLocaleString()}`],
    ['Total Expenses', `$${data.accounts.filter(acc => acc.account_type === 'EXPENSES').reduce((sum, acc) => sum + acc.ending_balance, 0).toLocaleString()}`]
  ];

  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `trial-balance-consolidated-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateTrialBalanceConsolidatedPDF = async (
  data: ConsolidatedTrialBalanceExportData,
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
  doc.text('Trial Balance Consolidated Report', pageWidth / 2, 15, { align: 'center' });
  
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
  const totalDebits = data.accounts.reduce((sum, acc) => sum + acc.debits, 0);
  const totalCredits = data.accounts.reduce((sum, acc) => sum + acc.credits, 0);
  const totalAssets = data.accounts.filter(acc => acc.account_type === 'ASSETS').reduce((sum, acc) => sum + acc.ending_balance, 0);
  const totalLiabilities = data.accounts.filter(acc => acc.account_type === 'LIABILITIES').reduce((sum, acc) => sum + acc.ending_balance, 0);
  const totalIncome = data.accounts.filter(acc => acc.account_type === 'INCOME').reduce((sum, acc) => sum + acc.ending_balance, 0);
  const totalExpenses = data.accounts.filter(acc => acc.account_type === 'EXPENSES').reduce((sum, acc) => sum + acc.ending_balance, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const summaryData = [
    ['Total Debits', `$${totalDebits.toLocaleString()}`],
    ['Total Credits', `$${totalCredits.toLocaleString()}`],
    ['Total Assets', `$${totalAssets.toLocaleString()}`],
    ['Total Liabilities', `$${totalLiabilities.toLocaleString()}`],
    ['Total Income', `$${totalIncome.toLocaleString()}`],
    ['Total Expenses', `$${totalExpenses.toLocaleString()}`],
    ['Balance Status', isBalanced ? '✅ BALANCED' : '⚠️ NOT BALANCED']
  ];
  
  autoTable(doc, {
    head: [['Summary', 'Value']],
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
      if (cellData.row.index === 6) {
        cellData.cell.styles.fillColor = isBalanced ? [220, 252, 231] : [254, 242, 242];
        cellData.cell.styles.textColor = isBalanced ? [22, 163, 74] : [220, 38, 38];
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
        // Make the last row (totals) bold with gray background
        if (cellData.row.index === tableRows.length - 1) {
          cellData.cell.styles.fillColor = [226, 232, 240];
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  });
  
  // Save the PDF
  doc.save(`trial-balance-consolidated-${new Date().toISOString().split('T')[0]}.pdf`);
};
