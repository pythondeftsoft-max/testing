import jsPDF from 'jspdf';

export interface LeasePDFData {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  monthlyRent: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  landlordSignature?: string;
  landlordSignedAt?: string;
  tenantSignature?: string;
  tenantSignedAt?: string;
}

export const generateLeasePDF = (data: LeasePDFData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = 20;

  const startDate = data.leaseStartDate || new Date().toLocaleDateString();
  const endDate = data.leaseEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString();

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * (fontSize / 2) + 5;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESIDENTIAL LEASE AGREEMENT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Effective Date: ${startDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Parties
  addText('PARTIES', 12, true);
  addText('This Lease Agreement ("Lease") is made between:');
  addText('Landlord/Property Manager: OpenKey Property Management');
  addText(`Tenant: ${data.tenantName}`);
  yPos += 5;

  // Property
  addText('PROPERTY', 12, true);
  addText('The Landlord agrees to lease to the Tenant the following property:');
  addText(`Address: ${data.propertyAddress}`);
  if (data.unitNumber) {
    addText(`Unit: ${data.unitNumber}`);
  }
  yPos += 5;

  // Term
  addText('TERM', 12, true);
  addText('The term of this Lease shall be:');
  addText(`Start Date: ${startDate}`);
  addText(`End Date: ${endDate}`);
  yPos += 5;

  // Rent
  addText('RENT', 12, true);
  addText('The Tenant agrees to pay rent as follows:');
  addText(`Monthly Rent: $${data.monthlyRent.toFixed(2)}`);
  addText('Due Date: First day of each month');
  addText('Payment Method: Electronic payment through OpenKey platform');
  yPos += 5;

  // Check if we need a new page
  if (yPos > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Security Deposit
  addText('SECURITY DEPOSIT', 12, true);
  addText(`A security deposit in the amount of $${data.monthlyRent.toFixed(2)} shall be paid by the Tenant to the Landlord upon execution of this Lease. The security deposit will be held in accordance with applicable state laws and returned to the Tenant within the timeframe required by law, less any lawful deductions for damages beyond normal wear and tear.`);
  yPos += 5;

  // Use of Premises
  addText('USE OF PREMISES', 12, true);
  addText('The Tenant shall use the property as a residential dwelling only and shall not use or permit the property to be used for any other purpose without the prior written consent of the Landlord.');
  yPos += 5;

  // Add more sections as needed...
  if (yPos > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    yPos = 20;
  }

  // Signatures
  addText('SIGNATURES', 12, true);
  addText('This document has been electronically signed through the OpenKey platform.', 10, false);
  yPos += 10;

  // Landlord Signature
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Landlord:', margin, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + 80, yPos);
  if (data.landlordSignature) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.text(data.landlordSignature, margin + 5, yPos - 2);
  }
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.landlordSignedAt) {
    doc.text(`Date: ${new Date(data.landlordSignedAt).toLocaleDateString()}`, margin, yPos);
  }
  yPos += 15;

  // Tenant Signature
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tenant: ${data.tenantName}`, margin, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + 80, yPos);
  if (data.tenantSignature) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.text(data.tenantSignature, margin + 5, yPos - 2);
  }
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.tenantSignedAt) {
    doc.text(`Date: ${new Date(data.tenantSignedAt).toLocaleDateString()}`, margin, yPos);
  }

  // Add fully executed watermark if both signed
  if (data.landlordSignature && data.tenantSignature) {
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.text('FULLY EXECUTED', pageWidth / 2, doc.internal.pageSize.getHeight() / 2, {
      align: 'center',
      angle: 45
    });
  }

  // Save the PDF
  const fileName = `Lease_Agreement_${data.propertyAddress.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Helper function to create the PDF document (shared logic)
const createLeasePDFDocument = (data: LeasePDFData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = 20;

  const startDate = data.leaseStartDate || new Date().toLocaleDateString();
  const endDate = data.leaseEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString();

  const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * (fontSize / 2) + 5;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESIDENTIAL LEASE AGREEMENT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Effective Date: ${startDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Parties
  addText('PARTIES', 12, true);
  addText('This Lease Agreement ("Lease") is made between:');
  addText('Landlord/Property Manager: OpenKey Property Management');
  addText(`Tenant: ${data.tenantName}`);
  yPos += 5;

  // Property
  addText('PROPERTY', 12, true);
  addText('The Landlord agrees to lease to the Tenant the following property:');
  addText(`Address: ${data.propertyAddress}`);
  if (data.unitNumber) {
    addText(`Unit: ${data.unitNumber}`);
  }
  yPos += 5;

  // Term
  addText('TERM', 12, true);
  addText('The term of this Lease shall be:');
  addText(`Start Date: ${startDate}`);
  addText(`End Date: ${endDate}`);
  yPos += 5;

  // Rent
  addText('RENT', 12, true);
  addText('The Tenant agrees to pay rent as follows:');
  addText(`Monthly Rent: $${data.monthlyRent.toFixed(2)}`);
  addText('Due Date: First day of each month');
  addText('Payment Method: Electronic payment through OpenKey platform');
  yPos += 5;

  if (yPos > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Security Deposit
  addText('SECURITY DEPOSIT', 12, true);
  addText(`A security deposit in the amount of $${data.monthlyRent.toFixed(2)} shall be paid by the Tenant to the Landlord upon execution of this Lease. The security deposit will be held in accordance with applicable state laws and returned to the Tenant within the timeframe required by law, less any lawful deductions for damages beyond normal wear and tear.`);
  yPos += 5;

  // Use of Premises
  addText('USE OF PREMISES', 12, true);
  addText('The Tenant shall use the property as a residential dwelling only and shall not use or permit the property to be used for any other purpose without the prior written consent of the Landlord.');
  yPos += 5;

  if (yPos > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    yPos = 20;
  }

  // Signatures
  addText('SIGNATURES', 12, true);
  addText('This document has been electronically signed through the OpenKey platform.', 10, false);
  yPos += 10;

  // Landlord Signature
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Landlord:', margin, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + 80, yPos);
  if (data.landlordSignature) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.text(data.landlordSignature, margin + 5, yPos - 2);
  }
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.landlordSignedAt) {
    doc.text(`Date: ${new Date(data.landlordSignedAt).toLocaleDateString()}`, margin, yPos);
  }
  yPos += 15;

  // Tenant Signature
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tenant: ${data.tenantName}`, margin, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPos, margin + 80, yPos);
  if (data.tenantSignature) {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.text(data.tenantSignature, margin + 5, yPos - 2);
  }
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.tenantSignedAt) {
    doc.text(`Date: ${new Date(data.tenantSignedAt).toLocaleDateString()}`, margin, yPos);
  }

  // Add fully executed watermark if both signed
  if (data.landlordSignature && data.tenantSignature) {
    doc.setFontSize(40);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.text('FULLY EXECUTED', pageWidth / 2, doc.internal.pageSize.getHeight() / 2, {
      align: 'center',
      angle: 45
    });
  }

  return doc;
};

// Returns a Blob for uploading to storage
export const generateLeasePDFBlob = (data: LeasePDFData): Blob => {
  const doc = createLeasePDFDocument(data);
  return doc.output('blob');
};
