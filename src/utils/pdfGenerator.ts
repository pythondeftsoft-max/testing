import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFOptions {
  filename?: string;
  pageBreaks?: boolean;
  headerText?: string;
  footerText?: string;
  quality?: number;
}

export class PDFGenerator {
  private static instance: PDFGenerator;

  public static getInstance(): PDFGenerator {
    if (!PDFGenerator.instance) {
      PDFGenerator.instance = new PDFGenerator();
    }
    return PDFGenerator.instance;
  }

  public async generatePDFFromHTML(
    htmlContent: string,
    options: PDFOptions = {}
  ): Promise<void> {
    const {
      filename = 'comprehensive-analytics-report.pdf',
      pageBreaks = true,
      headerText = 'OpenKey Property Management',
      footerText = `Generated on ${new Date().toLocaleDateString()}`,
      quality = 1.0
    } = options;

    try {
      // Create a temporary div to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-9999px';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '200mm'; // A4 width
      tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempDiv.style.fontSize = '11px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.color = '#1a1a1a';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '15px';
      
      document.body.appendChild(tempDiv);

      // Preload images with CORS support
      const images = tempDiv.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(img);
          } else {
            img.onload = () => resolve(img);
            img.onerror = () => {
              // Hide broken images
              img.style.display = 'none';
              resolve(img);
            };
            // Set CORS if not already set
            if (!img.crossOrigin) {
              img.crossOrigin = 'anonymous';
            }
          }
        });
      });

      await Promise.all(imagePromises);

      // Generate canvas from HTML
      const canvas = await html2canvas(tempDiv, {
        scale: quality * 1.2, // Increase scale for better quality
        useCORS: true,
        allowTaint: false, // Be strict about CORS
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false, // Reduce console noise
        onclone: (clonedDoc) => {
          // Ensure all styles are properly applied in the cloned document
          const clonedElement = clonedDoc.body.querySelector('div');
          if (clonedElement) {
            clonedElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            clonedElement.style.fontSize = '10px';
            clonedElement.style.lineHeight = '1.3';
          }
          
          // Handle images in cloned document
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach(img => {
            img.crossOrigin = 'anonymous';
            // Add fallback for broken images
            img.onerror = () => {
              img.style.display = 'none';
            };
          });
        }
      });

      // Clean up temporary element
      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate scaling to fit page width with margins
      const margin = 10; // Reduce margins for better content density
      const availableWidth = pdfWidth - (2 * margin);
      const ratio = Math.min(availableWidth / imgWidth, 1.0); // Allow full scaling for better quality
      const scaledHeight = imgHeight * ratio;
      
      // Add header
      if (headerText) {
        pdf.setFontSize(10);
        pdf.setTextColor(220, 100, 25); // OpenKey navy blue
        pdf.text(headerText, margin, 8);
      }

      let yPosition = margin + 8; // Start below header
      let remainingHeight = scaledHeight;
      const maxHeightPerPage = pdfHeight - 25; // Reduce footer space for more content

      // Handle multiple pages if content is too tall
      if (pageBreaks && remainingHeight > maxHeightPerPage) {
        let sourceY = 0;
        let pageNumber = 1;

        while (remainingHeight > 0) {
          const heightForThisPage = Math.min(remainingHeight, maxHeightPerPage);
          const sourceHeight = heightForThisPage / ratio;

          // Create a temporary canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.drawImage(
              canvas,
              0, sourceY, imgWidth, sourceHeight,
              0, 0, imgWidth, sourceHeight
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', margin, yPosition, availableWidth, heightForThisPage);
          }

          // Add footer
          if (footerText) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(footerText, margin, pdfHeight - 5);
            pdf.text(`Page ${pageNumber}`, pdfWidth - margin - 20, pdfHeight - 5);
          }

          remainingHeight -= heightForThisPage;
          sourceY += sourceHeight;
          pageNumber++;

          if (remainingHeight > 0) {
            pdf.addPage();
            yPosition = margin + 8;
          }
        }
      } else {
        // Single page
        const finalHeight = Math.min(scaledHeight, maxHeightPerPage);
        pdf.addImage(imgData, 'PNG', margin, yPosition, availableWidth, finalHeight);

        // Add footer
        if (footerText) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(footerText, margin, pdfHeight - 5);
          pdf.text('Page 1', pdfWidth - margin - 20, pdfHeight - 5);
        }
      }

      // Save the PDF
      pdf.save(filename);

    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generatePDFFromElement(
    element: HTMLElement,
    options: PDFOptions = {}
  ): Promise<void> {
    const htmlContent = element.outerHTML;
    await this.generatePDFFromHTML(htmlContent, options);
  }
}

export const generatePDF = PDFGenerator.getInstance();