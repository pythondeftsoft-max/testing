import jsPDF from 'jspdf';

export interface ReceiptData {
  transactionId: string;
  propertyName: string;
  amount: number;
  currency: string;
  date: string;
  payerName?: string;
  payerEmail?: string;
  paymentMethod?: string;
  description?: string;
}

export const generateReceiptPDF = async (receipt: ReceiptData): Promise<void> => {
  const doc = new jsPDF();
  
  // Set up the PDF
  doc.setFontSize(20);
  doc.text('Payment Receipt', 20, 30);
  
  // Add a line
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Receipt details
  doc.setFontSize(12);
  let yPos = 50;
  
  const addLine = (label: string, value: string) => {
    doc.text(`${label}:`, 20, yPos);
    doc.text(value, 80, yPos);
    yPos += 10;
  };
  
  addLine('Transaction ID', receipt.transactionId);
  addLine('Property', receipt.propertyName);
  addLine('Amount', new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: receipt.currency
  }).format(receipt.amount));
  addLine('Date', new Date(receipt.date).toLocaleDateString());
  
  if (receipt.payerName) {
    addLine('Payer', receipt.payerName);
  }
  
  if (receipt.payerEmail) {
    addLine('Email', receipt.payerEmail);
  }
  
  if (receipt.paymentMethod) {
    addLine('Payment Method', receipt.paymentMethod);
  }
  
  if (receipt.description) {
    addLine('Description', receipt.description);
  }
  
  // Add footer
  yPos += 20;
  doc.setFontSize(10);
  doc.text('This is a computer-generated receipt.', 20, yPos);
  doc.text('Keep this for your records.', 20, yPos + 10);
  
  // Generate timestamp for filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `receipt-${receipt.transactionId}-${timestamp}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};

export const generateReceiptHTML = (receipt: ReceiptData): string => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: receipt.currency
  }).format(receipt.amount);
  
  const formattedDate = new Date(receipt.date).toLocaleDateString();
  
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">Payment Receipt</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Transaction ID:</td>
            <td style="padding: 8px 0;">${receipt.transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Property:</td>
            <td style="padding: 8px 0;">${receipt.propertyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
            <td style="padding: 8px 0; font-size: 18px; color: #2563eb;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Date:</td>
            <td style="padding: 8px 0;">${formattedDate}</td>
          </tr>
          ${receipt.payerName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Payer:</td>
            <td style="padding: 8px 0;">${receipt.payerName}</td>
          </tr>
          ` : ''}
          ${receipt.payerEmail ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0;">${receipt.payerEmail}</td>
          </tr>
          ` : ''}
          ${receipt.paymentMethod ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Payment Method:</td>
            <td style="padding: 8px 0;">${receipt.paymentMethod}</td>
          </tr>
          ` : ''}
          ${receipt.description ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Description:</td>
            <td style="padding: 8px 0;">${receipt.description}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
        <p>This is a computer-generated receipt.</p>
        <p>Keep this for your records.</p>
      </div>
    </div>
  `;
};