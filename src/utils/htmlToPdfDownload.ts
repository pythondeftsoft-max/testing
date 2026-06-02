import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Renders an HTML document string into a multi-page PDF and triggers a download.
 * Used for HUD-compliant agency documents (notices, letters, contracts).
 */
export async function downloadHtmlAsPdf(html: string, fileName: string): Promise<void> {
  // Render the HTML in an offscreen container so html2canvas can capture it.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px'; // ~A4 width @ 96dpi
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Wait a tick for fonts/styles to settle
    await new Promise((r) => setTimeout(r, 50));

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeName = fileName.replace(/\.html?$/i, '').replace(/[^a-z0-9_-]+/gi, '_');
    pdf.save(`${safeName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
