import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RentRollUnit, RentRollSummary } from '@/hooks/useRentRollData';

export const generateRentRollCSV = (
  units: RentRollUnit[], 
  summary: RentRollSummary,
  asOfDate: string
) => {
  // Create CSV headers
  const headers = [
    'Unit',
    'Property',
    'Tenants',
    'Lease Start',
    'Lease End',
    'Bed/Bath',
    'Rent Cycle',
    'Base Rent',
    'Recurring Charges',
    'Recurring Credits',
    'Deposits Held',
    'Prepayments',
    'Balance Due',
    'Total'
  ];

  // Create CSV rows
  const rows = units.map(unit => [
    unit.unit_number,
    unit.property_address,
    unit.tenant_names,
    unit.lease_start_date ? new Date(unit.lease_start_date).toLocaleDateString() : '',
    unit.lease_end_date ? new Date(unit.lease_end_date).toLocaleDateString() : '',
    `${unit.bedrooms || 0}/${unit.bathrooms || 0}`,
    unit.rent_cycle,
    unit.monthly_rent?.toFixed(2) || '0.00',
    unit.recurring_charges_total.toFixed(2),
    unit.recurring_credits_total.toFixed(2),
    unit.deposits_held.toFixed(2),
    unit.prepayments_balance.toFixed(2),
    unit.balance_due.toFixed(2),
    unit.total_amount.toFixed(2)
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['Total Market Rent', '', '', '', '', '', '', summary.total_market_rent.toFixed(2), '', '', '', '', '', '']);
  rows.push(['Total Recurring Charges', '', '', '', '', '', '', '', summary.total_recurring_charges.toFixed(2), '', '', '', '', '']);
  rows.push(['Total Recurring Credits', '', '', '', '', '', '', '', '', summary.total_recurring_credits.toFixed(2), '', '', '', '']);
  rows.push(['Total Deposits Held', '', '', '', '', '', '', '', '', '', summary.total_deposits.toFixed(2), '', '', '']);
  rows.push(['Total Prepayments', '', '', '', '', '', '', '', '', '', '', summary.total_prepayments.toFixed(2), '', '']);
  rows.push(['Total Balance Due', '', '', '', '', '', '', '', '', '', '', '', summary.total_balance_due.toFixed(2), '']);
  rows.push(['Occupancy Rate', '', '', '', '', '', '', '', '', '', '', '', '', `${summary.occupancy_rate.toFixed(1)}%`]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rent-roll-report-${asOfDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateRentRollPDF = (
  units: RentRollUnit[], 
  summary: RentRollSummary,
  asOfDate: string
) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better fit
  
  // Header
  doc.setFontSize(20);
  doc.text('Rent Roll Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`As of: ${new Date(asOfDate).toLocaleDateString()}`, 20, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  // Summary section
  doc.setFontSize(14);
  doc.text('Summary', 20, 50);
  
  const summaryData = [
    ['Total Units', summary.total_units.toString()],
    ['Occupied Units', summary.occupied_units.toString()],
    ['Occupancy Rate', `${summary.occupancy_rate.toFixed(1)}%`],
    ['Total Market Rent', `$${summary.total_market_rent.toLocaleString()}`],
    ['Total Recurring Charges', `$${summary.total_recurring_charges.toLocaleString()}`],
    ['Total Recurring Credits', `$${summary.total_recurring_credits.toLocaleString()}`],
    ['Total Deposits Held', `$${summary.total_deposits.toLocaleString()}`],
    ['Total Prepayments', `$${summary.total_prepayments.toLocaleString()}`],
    ['Total Balance Due', `$${summary.total_balance_due.toLocaleString()}`]
  ];

  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value']],
    body: summaryData,
    margin: { left: 20 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  // Unit details table
  doc.setFontSize(14);
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.text('Unit Details', 20, finalY);

  const tableColumns = [
    'Unit',
    'Property', 
    'Tenants',
    'Bed/Bath',
    'Rent Cycle',
    'Base Rent',
    'Charges',
    'Credits',
    'Deposits',
    'Prepayments',
    'Balance Due',
    'Total'
  ];

  const tableRows = units.map(unit => [
    unit.unit_number,
    unit.property_address.length > 25 ? unit.property_address.substring(0, 22) + '...' : unit.property_address,
    unit.tenant_names.length > 20 ? unit.tenant_names.substring(0, 17) + '...' : unit.tenant_names,
    `${unit.bedrooms || 0}/${unit.bathrooms || 0}`,
    unit.rent_cycle,
    `$${unit.monthly_rent?.toLocaleString() || '0'}`,
    `$${unit.recurring_charges_total.toLocaleString()}`,
    `$${unit.recurring_credits_total.toLocaleString()}`,
    `$${unit.deposits_held.toLocaleString()}`,
    `$${unit.prepayments_balance.toLocaleString()}`,
    `$${unit.balance_due.toLocaleString()}`,
    `$${unit.total_amount.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [tableColumns],
    body: tableRows,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8 },
    columnStyles: {
      5: { halign: 'right' }, // Base Rent
      6: { halign: 'right' }, // Charges
      7: { halign: 'right' }, // Credits
      8: { halign: 'right' }, // Deposits
      9: { halign: 'right' }, // Prepayments
      10: { halign: 'right' }, // Balance Due
      11: { halign: 'right' }  // Total
    },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  // Totals row
  const totalsRow = [
    'TOTALS',
    '',
    '',
    '',
    '',
    `$${summary.total_actual_rent.toLocaleString()}`,
    `$${summary.total_recurring_charges.toLocaleString()}`,
    `$${summary.total_recurring_credits.toLocaleString()}`,
    `$${summary.total_deposits.toLocaleString()}`,
    `$${summary.total_prepayments.toLocaleString()}`,
    `$${summary.total_balance_due.toLocaleString()}`,
    `$${(summary.total_actual_rent + summary.total_deposits + summary.total_prepayments).toLocaleString()}`
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY,
    body: [totalsRow],
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, fontStyle: 'bold', fillColor: [200, 200, 200] },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right' }
    }
  });

  // Save the PDF
  doc.save(`rent-roll-report-${asOfDate}.pdf`);
};