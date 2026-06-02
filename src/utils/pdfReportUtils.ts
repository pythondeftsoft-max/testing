import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PortfolioOverview, LeasePipeline, RentDelinquency, MaintenanceEfficiency, TopLatePayer } from '@/hooks/useLandlordAnalytics';

interface ReportData {
  portfolioOverview: PortfolioOverview | null;
  leasePipeline: LeasePipeline | null;
  rentDelinquency: RentDelinquency | null;
  maintenanceEfficiency: MaintenanceEfficiency | null;
  topLatePayers: TopLatePayer[];
  landlordName: string;
  reportDate: string;
}

export const generateAnalyticsReport = async (data: ReportData): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  // OpenKey Brand Colors
  const primaryColor = [59, 130, 246]; // Blue-600
  const secondaryColor = [107, 114, 128]; // Gray-500
  const accentColor = [16, 185, 129]; // Green-500

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  let yPosition = margin;

  // Header with OpenKey Branding
  const addHeader = () => {
    // OpenKey Logo Area (placeholder)
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(margin, yPosition, contentWidth, 25, 'F');
    
    // Company Name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OpenKey', margin + 5, yPosition + 15);
    
    // Report Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Property Analytics Report', pageWidth - margin - 60, yPosition + 10);
    pdf.text(data.reportDate, pageWidth - margin - 60, yPosition + 18);
    
    yPosition += 35;
  };

  // Executive Summary
  const addExecutiveSummary = () => {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Executive Summary', margin, yPosition);
    yPosition += 10;

    if (data.portfolioOverview) {
      const summary = [
        `Landlord: ${data.landlordName}`,
        `Total Portfolio Units: ${data.portfolioOverview.total_units}`,
        `Vacancy Rate: ${formatPercentage(data.portfolioOverview.vacancy_rate)}`,
        `Collection Rate: ${formatPercentage(data.portfolioOverview.collection_rate)}`,
        `Net Operating Income: ${formatCurrency(data.portfolioOverview.net_operating_income)}`,
      ];

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      summary.forEach((line, index) => {
        pdf.text(line, margin, yPosition + (index * 6));
      });
      yPosition += 40;
    }
  };

  // Section headers
  const addSectionHeader = (title: string) => {
    pdf.setFillColor(247, 250, 252); // Gray-50
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 2, yPosition + 5);
    yPosition += 15;
  };

  // Portfolio Overview Section
  const addPortfolioOverview = () => {
    if (!data.portfolioOverview) return;

    addSectionHeader('1. Portfolio Overview');

    const metrics = [
      ['Total Units', data.portfolioOverview.total_units.toString()],
      ['Vacant Units', data.portfolioOverview.vacant_units.toString()],
      ['Vacancy Rate', formatPercentage(data.portfolioOverview.vacancy_rate)],
      ['Gross Monthly Rent', formatCurrency(data.portfolioOverview.gross_rent)],
      ['Collected Rent', formatCurrency(data.portfolioOverview.collected_rent)],
      ['Collection Rate', formatPercentage(data.portfolioOverview.collection_rate)],
      ['Net Operating Income', formatCurrency(data.portfolioOverview.net_operating_income)],
      ['Avg. Time on Market', `${Math.round(data.portfolioOverview.avg_time_on_market)} days`],
    ];

    // Create a simple table
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    const colWidth = contentWidth / 2;
    metrics.forEach((metric, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = margin + (col * colWidth);
      const y = yPosition + (row * 8);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric[0] + ':', x, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric[1], x + 50, y);
    });

    yPosition += Math.ceil(metrics.length / 2) * 8 + 10;
  };

  // Lease Pipeline Section
  const addLeasePipeline = () => {
    if (!data.leasePipeline) return;

    addSectionHeader('2. Lease Pipeline & Expirations');

    const metrics = [
      ['Expiring in 30 Days', data.leasePipeline.expiring_30_days.toString()],
      ['Expiring in 60 Days', data.leasePipeline.expiring_60_days.toString()],
      ['Expiring in 90 Days', data.leasePipeline.expiring_90_days.toString()],
      ['Renewal Rate', formatPercentage(data.leasePipeline.renewal_rate)],
      ['Avg. Days to Lease', `${Math.round(data.leasePipeline.avg_days_to_lease)} days`],
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    metrics.forEach((metric, index) => {
      const y = yPosition + (index * 6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric[0] + ':', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric[1], margin + 70, y);
    });

    yPosition += metrics.length * 6 + 10;
  };

  // Rent & Delinquency Section
  const addRentDelinquency = () => {
    if (!data.rentDelinquency) return;

    addSectionHeader('3. Rent Collection & Delinquency');

    const metrics = [
      ['On-Time Payment Rate', formatPercentage(data.rentDelinquency.on_time_payment_rate)],
      ['Late Payment Rate', formatPercentage(data.rentDelinquency.late_payment_rate)],
      ['Total Delinquency Balance', formatCurrency(data.rentDelinquency.total_delinquency_balance)],
      ['Late Payment Count', data.rentDelinquency.late_payment_count.toString()],
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    metrics.forEach((metric, index) => {
      const y = yPosition + (index * 6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric[0] + ':', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric[1], margin + 70, y);
    });

    yPosition += metrics.length * 6 + 10;

    // Top Late Payers
    if (data.topLatePayers.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top Late Payers:', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      data.topLatePayers.slice(0, 5).forEach((payer, index) => {
        const line = `${payer.tenant_name || 'Unknown'} - ${formatCurrency(payer.overdue_amount)} (${payer.days_late} days late)`;
        pdf.text(line, margin + 5, yPosition + (index * 5));
      });
      yPosition += data.topLatePayers.slice(0, 5).length * 5 + 10;
    }
  };

  // Maintenance Section
  const addMaintenanceEfficiency = () => {
    if (!data.maintenanceEfficiency) return;

    addSectionHeader('4. Maintenance & Operations Efficiency');

    const metrics = [
      ['Open Requests', data.maintenanceEfficiency.open_requests_count.toString()],
      ['Avg. Resolution Time', `${Math.round(data.maintenanceEfficiency.avg_resolution_days)} days`],
      ['Cost per Unit', formatCurrency(data.maintenanceEfficiency.maintenance_cost_per_unit)],
      ['Avg. Request Age', `${Math.round(data.maintenanceEfficiency.avg_request_age_days)} days`],
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    metrics.forEach((metric, index) => {
      const y = yPosition + (index * 6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric[0] + ':', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric[1], margin + 70, y);
    });

    yPosition += metrics.length * 6 + 10;
  };

  // Footer
  const addFooter = () => {
    const footerY = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('Generated by OpenKey Property Management Platform', margin, footerY);
    pdf.text(`Report Date: ${data.reportDate}`, pageWidth - margin - 50, footerY);
  };

  // Generate the PDF
  addHeader();
  addExecutiveSummary();
  
  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }
  
  addPortfolioOverview();
  
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }
  
  addLeasePipeline();
  
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }
  
  addRentDelinquency();
  
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }
  
  addMaintenanceEfficiency();
  addFooter();

  // Save the PDF
  const fileName = `OpenKey-Analytics-Report-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export const generatePropertyReport = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  const imgY = 30;

  // Add OpenKey header
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pdfWidth, 25, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('OpenKey Property Analytics', 10, 15);

  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
  pdf.save(fileName);
};