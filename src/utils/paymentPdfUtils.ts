import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentHistoryData {
  id: string;
  date: string;
  amount: number;
  status: string;
  method: string;
  paymentStatus: 'on_time' | 'late';
  daysLate?: number;
  referenceNumber?: string;
  lateFeeAmount?: number;
}

interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  onTimePayments: number;
  latePayments: number;
  totalLateFees: number;
}

interface PropertyDetails {
  address: string;
  monthlyRent: number;
  lateFeeAmount: number;
  graceDays: number;
  rentDueDay: number;
}

export const generatePaymentHistoryPDF = (
  payments: PaymentHistoryData[], 
  summary: PaymentSummary, 
  tenantName: string = 'Tenant',
  propertyDetails?: PropertyDetails
) => {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment History Report', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tenant: ${tenantName}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
  
  let currentY = 36;
  
  // Property information if provided
  if (propertyDetails) {
    const propertyData = [
      ['Property Address', propertyDetails.address],
      ['Monthly Rent', `$${propertyDetails.monthlyRent.toLocaleString()}`],
      ['Rent Due Day', `${propertyDetails.rentDueDay}${propertyDetails.rentDueDay === 1 ? 'st' : propertyDetails.rentDueDay === 2 ? 'nd' : propertyDetails.rentDueDay === 3 ? 'rd' : 'th'} of each month`],
      ['Late Fee Amount', `$${propertyDetails.lateFeeAmount.toLocaleString()}`],
      ['Grace Period', `${propertyDetails.graceDays} days`]
    ];
    
    autoTable(doc, {
      body: propertyData,
      startY: currentY,
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Payment summary
  const summaryData = [
    ['Total Payments', summary.totalPayments.toString()],
    ['Total Amount Paid', `$${summary.totalAmount.toLocaleString()}`],
    ['On-Time Payments', summary.onTimePayments.toString()],
    ['Late Payments', summary.latePayments.toString()],
    ['Total Late Fees', `$${summary.totalLateFees.toLocaleString()}`]
  ];
  
  autoTable(doc, {
    head: [['Payment Summary', 'Value']],
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
  
  // Payment details
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 14, currentY);
  
  const tableColumns = [
    'Date',
    'Reference #',
    'Amount',
    'Late Fee',
    'Method',
    'Status',
    'Payment Status',
    'Days Late'
  ];
  
  const tableRows = payments.map(payment => [
    payment.date,
    payment.referenceNumber || 'N/A',
    `$${payment.amount.toLocaleString()}`,
    `$${(payment.lateFeeAmount || 0).toLocaleString()}`,
    payment.method,
    payment.status,
    payment.paymentStatus === 'on_time' ? 'On Time' : 'Late',
    `${payment.daysLate || 0} days`
  ]);
  
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: currentY + 5,
    theme: 'striped',
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
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: (data) => {
      // Color code payment status column
      if (data.column.index === 6 && data.section === 'body') {
        if (data.cell.text[0] === 'On Time') {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [22, 163, 74];
        } else if (data.cell.text[0] === 'Late') {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('This is an official payment history record', pageWidth / 2, finalY, { align: 'center' });
  doc.text('For questions, please contact payments@openkey.com', pageWidth / 2, finalY + 5, { align: 'center' });
  
  // Save the PDF
  doc.save(`payment-history-${new Date().toISOString().split('T')[0]}.pdf`);
};
