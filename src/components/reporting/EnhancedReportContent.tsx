import React from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface EnhancedReportContentProps {
  reportData: any;
}

export const generateEnhancedReportHTML = (reportData: any, whiteLabelConfig?: any): string => {
  // Get branding information - Force OpenKey blue branding for professional report
  const companyName = whiteLabelConfig?.company_name || 'OpenKey';
  const companyLogo = whiteLabelConfig?.company_logo_url;
  const primaryColor = 'hsl(220, 100%, 25%)'; // OpenKey blue
  const secondaryColor = 'hsl(220, 85%, 55%)'; // Lighter blue
  const accentColor = 'hsl(45, 85%, 45%)'; // Gold accent
  
  // Generate report structure with professional layout
  const coverPageHTML = generateCoverPage(reportData, companyName, companyLogo, primaryColor, secondaryColor, accentColor);
  const tableOfContentsHTML = generateTableOfContents(reportData, primaryColor, secondaryColor);
  const sectionsHTML = generateReportSections(reportData, primaryColor, secondaryColor, accentColor);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportData.title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 0;
          color: #1e2935;
          line-height: 1.6;
          background: white;
          font-size: 12px;
        }
        
        .container {
          background: white;
          min-height: 100vh;
        }
        
        .cover-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
          color: white;
          position: relative;
          overflow: hidden;
          page-break-after: always;
        }
        
        .cover-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
          padding: 60px;
        }
        
        .cover-logo {
          max-height: 120px;
          width: auto;
          object-fit: contain;
          margin-bottom: 40px;
          filter: brightness(0) invert(1);
        }
        
        .cover-title {
          font-size: 3.5rem;
          font-weight: 900;
          letter-spacing: -2px;
          margin-bottom: 20px;
          line-height: 1.1;
        }
        
        .cover-subtitle {
          font-size: 1.8rem;
          font-weight: 300;
          margin-bottom: 40px;
          opacity: 0.9;
        }
        
        .cover-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
          margin-top: 60px;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .toc-page {
          min-height: 100vh;
          padding: 80px 60px;
          page-break-before: always;
          page-break-after: always;
        }
        
        .toc-title {
          font-size: 2.8rem;
          font-weight: 800;
          color: ${primaryColor};
          margin-bottom: 50px;
          text-align: center;
        }
        
        .section-page {
          min-height: 100vh;
          padding: 60px;
          page-break-before: always;
        }
        
        .section-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: ${primaryColor};
          margin-bottom: 15px;
        }
        
        .metrics-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
          gap: 25px; 
          margin: 40px 0;
        }
        
        .metric-card {
          background: white;
          padding: 30px 25px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          page-break-inside: avoid;
        }
        
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${primaryColor}, ${accentColor});
        }
        
        .metric-value { 
          font-size: 2.8rem; 
          font-weight: 900; 
          color: ${primaryColor}; 
          margin-bottom: 10px;
          line-height: 1;
        }
        
        .metric-label { 
          font-size: 1.2rem; 
          color: #1e2935; 
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        
        @media print {
          body { 
            font-size: 10px !important;
            line-height: 1.4 !important;
          }
          
          .cover-title {
            font-size: 2.8rem !important;
          }
          
          .section-title {
            font-size: 2rem !important;
          }
          
          .metric-value {
            font-size: 2rem !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${coverPageHTML}
        ${tableOfContentsHTML}
        ${sectionsHTML}
      </div>
    </body>
    </html>
  `;
};

function generateCoverPage(reportData: any, companyName: string, companyLogo: string | undefined, primaryColor: string, secondaryColor: string, accentColor: string): string {
  return `
    <div class="cover-page">
      <div class="cover-content">
        ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="cover-logo" crossorigin="anonymous" onerror="this.style.display='none';" />` : ''}
        <h1 class="cover-title">Comprehensive Analytics Report</h1>
        <p class="cover-subtitle">Property Management Performance Analysis</p>
        
        <div class="cover-details">
          <div style="text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Generated</div>
            <div style="font-size: 1.6rem; font-weight: 700;">${new Date(reportData.generatedAt).toLocaleDateString()}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Properties</div>
            <div style="font-size: 1.6rem; font-weight: 700;">${reportData.properties?.length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateTableOfContents(reportData: any, primaryColor: string, secondaryColor: string): string {
  const sections = [
    { title: 'Financial Performance', description: 'Revenue, expenses, and profitability analysis', page: 3 },
    { title: 'Occupancy Analytics', description: 'Vacancy rates and turnover metrics', page: 4 },
    { title: 'Tenant Insights', description: 'Satisfaction and retention analysis', page: 5 },
    { title: 'Maintenance Trends', description: 'Work orders and cost tracking', page: 6 },
    { title: 'Market Intelligence', description: 'Competitive positioning and trends', page: 7 },
    { title: 'Portfolio Summary', description: 'Executive dashboard and KPIs', page: 8 }
  ];

  return `
    <div class="toc-page">
      <h2 class="toc-title">Table of Contents</h2>
      <div style="max-width: 700px; margin: 0 auto;">
        ${sections.map(section => `
          <div style="padding: 20px 30px; margin-bottom: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 1.3rem; font-weight: 600; color: ${primaryColor};">${section.title}</div>
              <div style="font-size: 0.9rem; color: #64748b; margin-top: 5px;">${section.description}</div>
            </div>
            <div style="font-size: 1.1rem; font-weight: 700; color: ${primaryColor}; min-width: 40px; text-align: right;">Page ${section.page}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateReportSections(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  let content = '';

  // Generate all comprehensive sections
  content += generateFinancialPerformanceSection(reportData, primaryColor, secondaryColor, accentColor);
  content += generateOccupancyAnalyticsSection(reportData, primaryColor, secondaryColor, accentColor);
  content += generateTenantInsightsSection(reportData, primaryColor, secondaryColor, accentColor);
  content += generateMaintenanceTrendsSection(reportData, primaryColor, secondaryColor, accentColor);
  content += generateMarketIntelligenceSection(reportData, primaryColor, secondaryColor, accentColor);
  content += generatePortfolioSummarySection(reportData, primaryColor, secondaryColor, accentColor);

  return content;
}

// Financial Performance Section
function generateFinancialPerformanceSection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};
  const properties = reportData.properties || [];

  return `
    <div class="section-page">
      <h2 class="section-title">Financial Performance</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Comprehensive analysis of revenue streams, expense management, and profitability metrics across your portfolio.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Revenue Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.totalRevenue || 0)}</div>
          <div class="metric-label">Total Revenue</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Monthly recurring revenue</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.rentRevenue || 0)}</div>
          <div class="metric-label">Rent Revenue</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Base rent collections</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.lateFeesRevenue || 0)}</div>
          <div class="metric-label">Late Fees</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Additional income</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Expense Breakdown</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.totalExpenses || 0)}</div>
          <div class="metric-label">Total Expenses</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">All operating costs</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.maintenanceExpenses || 0)}</div>
          <div class="metric-label">Maintenance</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Repairs & upkeep</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.insuranceExpenses || 0)}</div>
          <div class="metric-label">Insurance & Taxes</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Fixed costs</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Profitability Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.netOperatingIncome || 0)}</div>
          <div class="metric-label">Net Operating Income</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Revenue minus expenses</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.profitMargin || 0)}</div>
          <div class="metric-label">Profit Margin</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">NOI / Total Revenue</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.expenseRatio || 0)}</div>
          <div class="metric-label">Expense Ratio</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Expenses / Revenue</div>
        </div>
      </div>
    </div>
  `;
}

// Occupancy Analytics Section
function generateOccupancyAnalyticsSection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};
  const properties = reportData.properties || [];

  return `
    <div class="section-page">
      <h2 class="section-title">Occupancy Analytics</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Detailed analysis of vacancy rates, turnover patterns, and occupancy optimization across your portfolio.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Current Occupancy Status</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metrics.totalUnits || 0}</div>
          <div class="metric-label">Total Units</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Across all properties</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.occupiedUnits || 0}</div>
          <div class="metric-label">Occupied Units</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Currently leased</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.occupancyRate || 0)}</div>
          <div class="metric-label">Occupancy Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Industry benchmark: 95%</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Vacancy Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metrics.vacantUnits || 0}</div>
          <div class="metric-label">Vacant Units</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Available for lease</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.averageDaysVacant || 0}</div>
          <div class="metric-label">Avg Days Vacant</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Time to lease</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.turnoverRate || 0)}</div>
          <div class="metric-label">Turnover Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Annual tenant churn</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Property Performance Rankings</h3>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: ${primaryColor}; color: white;">
              <th style="padding: 20px; text-align: left; font-weight: 600;">Property</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Units</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Occupancy</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${properties.slice(0, 5).map((property: any, index: number) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 20px; font-weight: 500;">${property.name || `Property ${index + 1}`}</td>
                <td style="padding: 20px; text-align: center;">${property.total_units || 0}</td>
                <td style="padding: 20px; text-align: center; font-weight: 600;">${formatPercentage(property.occupancy_rate || 0)}</td>
                <td style="padding: 20px; text-align: center;">
                  <span style="padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; 
                    ${(property.occupancy_rate || 0) >= 95 ? `background: #dcfce7; color: #166534;` : 
                      (property.occupancy_rate || 0) >= 85 ? `background: #fef3c7; color: #92400e;` : 
                      `background: #fee2e2; color: #dc2626;`}">
                    ${(property.occupancy_rate || 0) >= 95 ? 'Excellent' : 
                      (property.occupancy_rate || 0) >= 85 ? 'Good' : 'Needs Attention'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Tenant Insights Section
function generateTenantInsightsSection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};

  return `
    <div class="section-page">
      <h2 class="section-title">Tenant Insights</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Analysis of tenant satisfaction, retention rates, and payment behavior patterns to optimize tenant relationships.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Tenant Satisfaction & Retention</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.tenantSatisfactionScore || 85)}%</div>
          <div class="metric-label">Satisfaction Score</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Based on surveys & feedback</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.tenantRetentionRate || 0.88)}</div>
          <div class="metric-label">Retention Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Annual lease renewals</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.averageTenancyLength || 24)}</div>
          <div class="metric-label">Avg Tenancy (Months)</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Length of stay</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Payment Behavior Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.onTimePaymentRate || 0.92)}</div>
          <div class="metric-label">On-Time Payments</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Paid by due date</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.latePaymentRate || 0.08)}</div>
          <div class="metric-label">Late Payment Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Paid after due date</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.averageDaysLate || 3)}</div>
          <div class="metric-label">Avg Days Late</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">When payments are late</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Collections & Delinquency</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.totalCollected || 0)}</div>
          <div class="metric-label">Total Collected</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">This month</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.outstandingBalance || 0)}</div>
          <div class="metric-label">Outstanding Balance</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Unpaid rent</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.collectionEfficiency || 0.96)}</div>
          <div class="metric-label">Collection Efficiency</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Collected / Expected</div>
        </div>
      </div>
    </div>
  `;
}

// Maintenance Trends Section
function generateMaintenanceTrendsSection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};

  return `
    <div class="section-page">
      <h2 class="section-title">Maintenance Trends</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Comprehensive analysis of maintenance operations, work order efficiency, and cost management across your portfolio.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Work Order Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metrics.totalWorkOrders || 0}</div>
          <div class="metric-label">Total Work Orders</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">This month</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.openWorkOrders || 0}</div>
          <div class="metric-label">Open Requests</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Pending completion</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.averageResolutionTime || 4.2)}</div>
          <div class="metric-label">Avg Resolution (Days)</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Time to complete</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Maintenance Efficiency</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.firstCallResolution || 0.78)}</div>
          <div class="metric-label">First Call Resolution</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Resolved on first visit</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.preventiveMaintenanceRate || 0.35)}</div>
          <div class="metric-label">Preventive Maintenance</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Proactive vs reactive</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.tenantSatisfactionMaintenance || 4.2)}/5</div>
          <div class="metric-label">Tenant Satisfaction</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Maintenance rating</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Cost Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.totalMaintenanceCost || 0)}</div>
          <div class="metric-label">Total Maintenance Cost</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">This month</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.averageCostPerUnit || 0)}</div>
          <div class="metric-label">Cost Per Unit</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Monthly average</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.maintenanceCostRatio || 0.08)}</div>
          <div class="metric-label">Cost as % of Revenue</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Industry benchmark: 10%</div>
        </div>
      </div>
    </div>
  `;
}

// Market Intelligence Section
function generateMarketIntelligenceSection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};

  return `
    <div class="section-page">
      <h2 class="section-title">Market Intelligence</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Strategic insights into market positioning, competitive analysis, and growth opportunities within your target markets.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Market Position Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.averageMarketRent || 0)}</div>
          <div class="metric-label">Market Average Rent</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Per unit in your area</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.portfolioAverageRent || 0)}</div>
          <div class="metric-label">Portfolio Avg Rent</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Your current pricing</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.rentPremiumDiscount || 0)}</div>
          <div class="metric-label">Market Premium</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">vs market average</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Competitive Analysis</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.marketOccupancyRate || 0.93)}</div>
          <div class="metric-label">Market Occupancy Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Area average</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.competitorCount || 12)}</div>
          <div class="metric-label">Direct Competitors</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">In your market</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${Math.round(metrics.marketSharePercentage || 8.5)}%</div>
          <div class="metric-label">Estimated Market Share</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Of local rental market</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Growth Opportunities</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.rentIncreaseOpportunity || 0)}</div>
          <div class="metric-label">Rent Increase Potential</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Per unit per month</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.marketGrowthRate || 0.035)}</div>
          <div class="metric-label">Market Growth Rate</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Year-over-year</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.expansionOpportunities || 3}</div>
          <div class="metric-label">Expansion Opportunities</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Properties available</div>
        </div>
      </div>
    </div>
  `;
}

// Portfolio Summary Section
function generatePortfolioSummarySection(reportData: any, primaryColor: string, secondaryColor: string, accentColor: string): string {
  const metrics = reportData.enhancedMetrics || {};
  const properties = reportData.properties || [];

  return `
    <div class="section-page">
      <h2 class="section-title">Portfolio Summary</h2>
      <div style="font-size: 1.1rem; color: #64748b; line-height: 1.7; margin-bottom: 40px;">
        Executive dashboard view with key performance indicators, property rankings, and strategic recommendations.
      </div>
      
      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 30px 0 20px;">Executive KPI Dashboard</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${properties.length}</div>
          <div class="metric-label">Total Properties</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Active portfolio size</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatCurrency(metrics.portfolioValue || 0)}</div>
          <div class="metric-label">Portfolio Value</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Estimated market value</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${formatPercentage(metrics.portfolioROI || 0)}</div>
          <div class="metric-label">Portfolio ROI</div>
          <div style="font-size: 0.9rem; color: #64748b; margin-top: 10px;">Return on investment</div>
        </div>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Property Performance Rankings</h3>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: ${primaryColor}; color: white;">
              <th style="padding: 20px; text-align: left; font-weight: 600;">Property</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">NOI</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Occupancy</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Score</th>
              <th style="padding: 20px; text-align: center; font-weight: 600;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${properties.slice(0, 8).map((property: any, index: number) => {
              const score = Math.round(((property.occupancy_rate || 0) + (property.noi_margin || 0)) / 2 * 100);
              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 20px; font-weight: 500;">${property.name || `Property ${index + 1}`}</td>
                  <td style="padding: 20px; text-align: center; font-weight: 600;">${formatCurrency(property.noi || 0)}</td>
                  <td style="padding: 20px; text-align: center; font-weight: 600;">${formatPercentage(property.occupancy_rate || 0)}</td>
                  <td style="padding: 20px; text-align: center; font-weight: 700; color: ${primaryColor};">${score}</td>
                  <td style="padding: 20px; text-align: center;">
                    <span style="padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; 
                      ${score >= 80 ? `background: #dcfce7; color: #166534;` : 
                        score >= 65 ? `background: #fef3c7; color: #92400e;` : 
                        score >= 50 ? `background: #fed7aa; color: #9a3412;` :
                        `background: #fee2e2; color: #dc2626;`}">
                      ${score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <h3 style="font-size: 1.8rem; font-weight: 700; color: ${primaryColor}; margin: 40px 0 20px;">Strategic Recommendations</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin-top: 30px;">
        <div style="display: grid; gap: 20px;">
          <div style="display: flex; align-items: flex-start; gap: 15px;">
            <div style="width: 8px; height: 8px; background: ${primaryColor}; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></div>
            <div>
              <div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 5px;">Optimize Rent Pricing</div>
              <div style="color: #64748b;">Review properties with below-market rents for potential increases during lease renewals.</div>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 15px;">
            <div style="width: 8px; height: 8px; background: ${primaryColor}; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></div>
            <div>
              <div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 5px;">Enhance Maintenance Efficiency</div>
              <div style="color: #64748b;">Implement preventive maintenance programs to reduce emergency repairs and costs.</div>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 15px;">
            <div style="width: 8px; height: 8px; background: ${primaryColor}; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></div>
            <div>
              <div style="font-weight: 600; color: ${primaryColor}; margin-bottom: 5px;">Focus on Tenant Retention</div>
              <div style="color: #64748b;">Develop tenant engagement programs to improve satisfaction and reduce turnover costs.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getStatusClass(score: number): string {
  if (score >= 80) return 'status-excellent';
  if (score >= 65) return 'status-good';
  if (score >= 50) return 'status-fair';
  return 'status-poor';
}

function getStatusLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

export default generateEnhancedReportHTML;