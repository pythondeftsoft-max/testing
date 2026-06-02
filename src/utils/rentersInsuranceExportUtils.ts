import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InsuranceRecord {
  id: string;
  property_address: string;
  unit_number?: string;
  tenant_name: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  liability_coverage: number;
  personal_property_coverage: number;
  effective_date: string;
  expiration_date: string;
  premium_amount: number;
  is_active: boolean;
}

export const generateRentersInsurancePDF = (
  insuranceData: InsuranceRecord[],
  reportDate: string
) => {
  const doc = new jsPDF('landscape');
  
  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Renters Insurance Report', 14, 15);
  
  // Add report date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(reportDate), 'MMMM dd, yyyy')}`, 14, 22);
  
  // Calculate summary statistics
  const activeCount = insuranceData.filter(r => r.is_active).length;
  const inactiveCount = insuranceData.length - activeCount;
  const totalLiabilityCoverage = insuranceData.reduce((sum, r) => sum + r.liability_coverage, 0);
  const totalPropertyCoverage = insuranceData.reduce((sum, r) => sum + r.personal_property_coverage, 0);
  const totalPremiums = insuranceData.reduce((sum, r) => sum + r.premium_amount, 0);
  
  // Add summary section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', 14, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Policies: ${insuranceData.length}`, 14, 36);
  doc.text(`Active: ${activeCount} | Inactive: ${inactiveCount}`, 14, 41);
  doc.text(`Total Liability Coverage: ${formatCurrency(totalLiabilityCoverage)}`, 14, 46);
  doc.text(`Total Property Coverage: ${formatCurrency(totalPropertyCoverage)}`, 14, 51);
  doc.text(`Total Annual Premiums: ${formatCurrency(totalPremiums)}`, 14, 56);
  
  // Prepare table data
  const tableData = insuranceData.map(record => {
    const today = new Date();
    const expDate = new Date(record.expiration_date);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status = 'Active';
    if (!record.is_active) {
      status = 'Inactive';
    } else if (expDate < today) {
      status = 'Expired';
    } else if (daysUntilExpiration <= 30) {
      status = 'Expires Soon';
    }
    
    return [
      record.property_address + (record.unit_number ? ` - Unit ${record.unit_number}` : ''),
      record.tenant_name,
      record.provider_name,
      record.policy_number,
      record.policy_type,
      formatCurrency(record.liability_coverage),
      formatCurrency(record.personal_property_coverage),
      format(new Date(record.effective_date), 'MM/dd/yyyy'),
      format(new Date(record.expiration_date), 'MM/dd/yyyy'),
      formatCurrency(record.premium_amount),
      status
    ];
  });
  
  // Add table
  autoTable(doc, {
    head: [[
      'Property',
      'Tenant',
      'Provider',
      'Policy #',
      'Type',
      'Liability',
      'Property',
      'Effective',
      'Expiration',
      'Premium',
      'Status'
    ]],
    body: tableData,
    startY: 62,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      // Color code status column
      if (data.column.index === 10 && data.section === 'body') {
        const status = data.cell.text[0];
        if (status === 'Expired' || status === 'Inactive') {
          data.cell.styles.textColor = [220, 38, 38]; // red
        } else if (status === 'Expires Soon') {
          data.cell.styles.textColor = [234, 88, 12]; // orange
        } else if (status === 'Active') {
          data.cell.styles.textColor = [22, 163, 74]; // green
        }
      }
    },
  });
  
  // Save the PDF
  doc.save(`renters-insurance-report-${reportDate}.pdf`);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
