import { supabase } from '@/integrations/supabase/client';

export interface ReportData {
  title: string;
  generatedAt: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary?: any;
  data?: any[];
}

export const generateReportHTML = (reportData: ReportData, brandingHTML: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportData.title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 20px; 
          color: #1e293b;
          line-height: 1.6;
        }
        .branding { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, hsl(220, 100%, 25%) 0%, hsl(45, 85%, 45%) 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 51, 102, 0.3);
        }
        .branding-enhanced {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, hsl(220, 100%, 25%) 0%, hsl(220, 100%, 15%) 50%, hsl(45, 85%, 45%) 100%);
          color: white;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0, 51, 102, 0.4);
          position: relative;
          overflow: hidden;
        }
        .branding-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 0%, rgba(184, 134, 11, 0.1) 50%, transparent 100%);
          pointer-events: none;
        }
        .brand-header h1 {
          font-size: 3rem;
          font-weight: 700;
          margin: 0 0 8px 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          letter-spacing: -1px;
        }
        .brand-tagline {
          font-size: 1.2rem;
          opacity: 0.95;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .branding h1 { 
          margin: 0; 
          font-size: 2.5rem; 
          font-weight: bold;
        }
        .branding p { 
          margin: 8px 0 0 0; 
          font-size: 1.1rem; 
          opacity: 0.9;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
        }
        .header h1 {
          color: hsl(220, 100%, 25%);
          margin: 0 0 10px 0;
          font-size: 2rem;
          font-weight: 600;
        }
        .summary { 
          background: linear-gradient(135deg, hsl(220, 100%, 98%), hsl(220, 100%, 96%)); 
          padding: 24px; 
          margin: 24px 0; 
          border-radius: 12px;
          border-left: 6px solid hsl(220, 100%, 25%);
          box-shadow: 0 4px 16px rgba(0, 51, 102, 0.08);
        }
        .metrics-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 20px; 
          margin: 20px 0;
        }
        .metric-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          text-align: center;
        }
        .metric-value { 
          font-size: 2.2rem; 
          font-weight: 700; 
          background: linear-gradient(135deg, hsl(220, 100%, 25%), hsl(45, 85%, 45%));
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 5px;
        }
        .metric-label { 
          font-size: 0.875rem; 
          color: #64748b; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid #e2e8f0;
        }
        th { 
          background: linear-gradient(135deg, hsl(220, 100%, 25%), hsl(220, 100%, 20%)); 
          color: white;
          font-weight: 600;
        }
        tr:nth-child(even) { 
          background: #f8fafc; 
        }
        .report-info { 
          text-align: center; 
          color: #64748b; 
          font-size: 0.875rem; 
          margin: 20px 0;
        }
        .section-title {
          background: linear-gradient(135deg, hsl(220, 100%, 25%), hsl(45, 85%, 45%));
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 40px 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid hsl(45, 85%, 45%);
        }
        .highlights {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .highlights ul {
          margin: 0;
          padding-left: 20px;
        }
        .highlights li {
          margin-bottom: 8px;
          color: #475569;
        }
      </style>
    </head>
    <body>
      ${brandingHTML}
      
      <div class="header">
        <h1>${reportData.title}</h1>
        <div class="report-info">
          Generated on ${new Date(reportData.generatedAt).toLocaleString()}<br>
          Report Period: ${new Date(reportData.dateRange.startDate).toLocaleDateString()} - ${new Date(reportData.dateRange.endDate).toLocaleDateString()}
        </div>
      </div>

      <!-- Report content will be added here by specific report generators -->
    </body>
    </html>
  `;
};

export const getOpenKeyBrandingHTML = (): string => {
  return `
    <div class="branding">
      <h1>OpenKey</h1>
      <p>Professional Property Management Reports</p>
    </div>
  `;
};

export const getEnhancedOpenKeyBrandingHTML = (): string => {
  return `
    <div class="branding-enhanced">
      <div class="brand-header">
        <h1>OpenKey</h1>
        <div class="brand-tagline">Professional Property Management</div>
      </div>
    </div>
  `;
};

export const calculatePortfolioMetrics = (properties: any[]) => {
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
  const vacantProperties = properties.filter(p => p.status === 'vacant').length;
  const availableProperties = properties.filter(p => p.status === 'available').length;
  
  const totalUnits = properties.reduce((sum, p) => sum + (p.unit_count || 1), 0);
  const totalMonthlyRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
  
  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
  const avgRentPerUnit = totalUnits > 0 ? totalMonthlyRent / totalUnits : 0;

  return {
    totalProperties,
    occupiedProperties,
    vacantProperties,
    availableProperties,
    totalUnits,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    totalMonthlyRent,
    avgRentPerUnit: Math.round(avgRentPerUnit * 100) / 100
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100) / 100}%`;
};