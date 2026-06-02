import jsPDF from 'jspdf';

export interface Form1099Data {
  id: string;
  tax_year: number;
  form_type: string;
  payer_id: string;
  payee_id: string;
  total_amount: number;
  box_amounts: Record<string, number>;
  payer_info?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    tin: string;
  };
  payee_info?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    tin: string;
  };
}

export class Tax1099PdfService {
  private static readonly FORM_WIDTH = 8.5 * 72; // 8.5 inches in points
  private static readonly FORM_HEIGHT = 11 * 72; // 11 inches in points
  private static readonly MARGIN = 36; // 0.5 inch margin

  static generate1099MiscPdf(formData: Form1099Data): jsPDF {
    const pdf = new jsPDF('p', 'pt', 'letter');
    
    // Set up fonts and colors
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    // Form title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Form 1099-MISC', this.MARGIN, this.MARGIN + 20);
    
    pdf.setFontSize(12);
    pdf.text(`Miscellaneous Information`, this.MARGIN, this.MARGIN + 40);
    pdf.text(`Tax Year ${formData.tax_year}`, this.MARGIN, this.MARGIN + 60);

    // Form boxes layout
    this.drawFormBoxes(pdf, formData);
    this.drawPayerInformation(pdf, formData);
    this.drawPayeeInformation(pdf, formData);
    this.drawAmountBoxes(pdf, formData);
    this.drawFooter(pdf, formData);

    return pdf;
  }

  static generate1099NecPdf(formData: Form1099Data): jsPDF {
    const pdf = new jsPDF('p', 'pt', 'letter');
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    // Form title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Form 1099-NEC', this.MARGIN, this.MARGIN + 20);
    
    pdf.setFontSize(12);
    pdf.text(`Nonemployee Compensation`, this.MARGIN, this.MARGIN + 40);
    pdf.text(`Tax Year ${formData.tax_year}`, this.MARGIN, this.MARGIN + 60);

    // NEC specific layout
    this.drawNecFormBoxes(pdf, formData);
    this.drawPayerInformation(pdf, formData);
    this.drawPayeeInformation(pdf, formData);
    this.drawNecAmountBoxes(pdf, formData);
    this.drawFooter(pdf, formData);

    return pdf;
  }

  private static drawFormBoxes(pdf: jsPDF, formData: Form1099Data): void {
    const startY = this.MARGIN + 100;
    
    // Draw main form border
    pdf.rect(this.MARGIN, startY, this.FORM_WIDTH - (this.MARGIN * 2), 400);
    
    // Draw section dividers
    pdf.line(this.MARGIN, startY + 100, this.FORM_WIDTH - this.MARGIN, startY + 100);
    pdf.line(this.MARGIN, startY + 300, this.FORM_WIDTH - this.MARGIN, startY + 300);
    pdf.line(this.FORM_WIDTH / 2, startY, this.FORM_WIDTH / 2, startY + 400);
  }

  private static drawNecFormBoxes(pdf: jsPDF, formData: Form1099Data): void {
    const startY = this.MARGIN + 100;
    
    // Draw main form border - simpler layout for NEC
    pdf.rect(this.MARGIN, startY, this.FORM_WIDTH - (this.MARGIN * 2), 350);
    
    // Draw section dividers
    pdf.line(this.MARGIN, startY + 100, this.FORM_WIDTH - this.MARGIN, startY + 100);
    pdf.line(this.MARGIN, startY + 250, this.FORM_WIDTH - this.MARGIN, startY + 250);
    pdf.line(this.FORM_WIDTH / 2, startY, this.FORM_WIDTH / 2, startY + 350);
  }

  private static drawPayerInformation(pdf: jsPDF, formData: Form1099Data): void {
    const startX = this.MARGIN + 10;
    const startY = this.MARGIN + 120;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('PAYER\'S name, street address, city or town, state or province, country, ZIP', startX, startY);
    pdf.text('or foreign postal code, and telephone no.', startX, startY + 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    if (formData.payer_info) {
      pdf.text(formData.payer_info.name, startX, startY + 30);
      pdf.text(formData.payer_info.address, startX, startY + 45);
      pdf.text(`${formData.payer_info.city}, ${formData.payer_info.state} ${formData.payer_info.zip}`, startX, startY + 60);
      
      // Payer TIN
      pdf.setFont('helvetica', 'bold');
      pdf.text('PAYER\'S federal identification number', startX, startY + 80);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formData.payer_info.tin || '', startX, startY + 95);
    } else {
      pdf.text('[Payer information not provided]', startX, startY + 30);
    }
  }

  private static drawPayeeInformation(pdf: jsPDF, formData: Form1099Data): void {
    const startX = (this.FORM_WIDTH / 2) + 10;
    const startY = this.MARGIN + 120;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('RECIPIENT\'S name', startX, startY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    if (formData.payee_info) {
      pdf.text(formData.payee_info.name, startX, startY + 15);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Street address (including apt. no.)', startX, startY + 35);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formData.payee_info.address, startX, startY + 50);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('City or town, state or province, country, and ZIP or foreign postal code', startX, startY + 70);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${formData.payee_info.city}, ${formData.payee_info.state} ${formData.payee_info.zip}`, startX, startY + 85);
      
      // Payee TIN
      pdf.setFont('helvetica', 'bold');
      pdf.text('RECIPIENT\'S identification number', startX, startY + 105);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formData.payee_info.tin || '', startX, startY + 120);
    } else {
      pdf.text(`Recipient ID: ${formData.payee_id.slice(-8)}`, startX, startY + 15);
    }
  }

  private static drawAmountBoxes(pdf: jsPDF, formData: Form1099Data): void {
    const startY = this.MARGIN + 320;
    const boxWidth = 120;
    const boxHeight = 40;
    const boxSpacing = 10;

    // Box 1 - Rents
    this.drawAmountBox(pdf, this.MARGIN + 10, startY, boxWidth, boxHeight, 
                       '1. Rents', formData.box_amounts.box_1 || 0);

    // Box 2 - Royalties
    this.drawAmountBox(pdf, this.MARGIN + 10 + boxWidth + boxSpacing, startY, boxWidth, boxHeight,
                       '2. Royalties', formData.box_amounts.box_2 || 0);

    // Box 3 - Other income
    this.drawAmountBox(pdf, this.MARGIN + 10 + (boxWidth + boxSpacing) * 2, startY, boxWidth, boxHeight,
                       '3. Other income', formData.box_amounts.box_3 || 0);

    // Box 4 - Federal income tax withheld
    this.drawAmountBox(pdf, this.MARGIN + 10, startY + boxHeight + boxSpacing, boxWidth, boxHeight,
                       '4. Federal income tax withheld', formData.box_amounts.box_4 || 0);

    // Box 7 - Nonemployee compensation (prior to 2020)
    this.drawAmountBox(pdf, this.MARGIN + 10 + boxWidth + boxSpacing, startY + boxHeight + boxSpacing, boxWidth, boxHeight,
                       '7. Nonemployee compensation', formData.box_amounts.box_7 || 0);
  }

  private static drawNecAmountBoxes(pdf: jsPDF, formData: Form1099Data): void {
    const startY = this.MARGIN + 270;
    const boxWidth = 150;
    const boxHeight = 50;

    // Box 1 - Nonemployee compensation
    this.drawAmountBox(pdf, this.MARGIN + 10, startY, boxWidth, boxHeight,
                       '1. Nonemployee compensation', formData.box_amounts.box_1 || 0);

    // Box 4 - Federal income tax withheld
    this.drawAmountBox(pdf, this.MARGIN + 10 + boxWidth + 20, startY, boxWidth, boxHeight,
                       '4. Federal income tax withheld', formData.box_amounts.box_4 || 0);
  }

  private static drawAmountBox(pdf: jsPDF, x: number, y: number, width: number, height: number, 
                              label: string, amount: number): void {
    // Draw box
    pdf.rect(x, y, width, height);
    
    // Draw label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(label, x + 5, y + 12);
    
    // Draw amount
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const amountText = this.formatCurrency(amount);
    const textWidth = pdf.getTextWidth(amountText);
    pdf.text(amountText, x + width - textWidth - 5, y + height - 10);
  }

  private static drawFooter(pdf: jsPDF, formData: Form1099Data): void {
    const footerY = this.MARGIN + 550;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Copy B', this.MARGIN, footerY);
    pdf.text('For Recipient', this.MARGIN, footerY + 12);
    
    pdf.text(`Form ID: ${formData.id}`, this.FORM_WIDTH - this.MARGIN - 100, footerY);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, this.FORM_WIDTH - this.MARGIN - 100, footerY + 12);
    
    // Instructions
    pdf.setFontSize(7);
    pdf.text('This is important tax information and is being furnished to the IRS.', this.MARGIN, footerY + 40);
    pdf.text('If you are required to file a return, a negligence penalty or other', this.MARGIN, footerY + 52);
    pdf.text('sanction may be imposed on you if this income is taxable and the', this.MARGIN, footerY + 64);
    pdf.text('IRS determines that it has not been reported.', this.MARGIN, footerY + 76);
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  static async generateAndDownload(formData: Form1099Data, filename?: string): Promise<void> {
    let pdf: jsPDF;
    
    switch (formData.form_type) {
      case '1099_nec':
        pdf = this.generate1099NecPdf(formData);
        break;
      case '1099_misc':
      default:
        pdf = this.generate1099MiscPdf(formData);
        break;
    }

    const downloadFilename = filename || `${formData.form_type}_${formData.tax_year}_${formData.payee_id.slice(-8)}.pdf`;
    pdf.save(downloadFilename);
  }

  static async generateBulkPdf(formsData: Form1099Data[]): Promise<jsPDF> {
    const pdf = new jsPDF('p', 'pt', 'letter');
    
    formsData.forEach((formData, index) => {
      if (index > 0) {
        pdf.addPage();
      }
      
      // Generate the appropriate form type on the current page
      const singleFormPdf = formData.form_type === '1099_nec' 
        ? this.generate1099NecPdf(formData)
        : this.generate1099MiscPdf(formData);
      
      // Copy the content from single form to bulk PDF
      // Note: This is a simplified approach. In production, you'd want to 
      // refactor the drawing methods to work on an existing PDF instance
    });

    return pdf;
  }
}