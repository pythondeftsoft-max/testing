import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedReportHTML } from './EnhancedReportContent';

interface ReportFilters {
  propertyIds?: string[];
  propertyTypes: string[];
  occupancyRange: [number, number];
  rentRange: [number, number];
  maintenanceStatus: string[];
  paymentStatus: string[];
  includeVacant: boolean;
  includeVoucher: boolean;
  selectedSections: string[];
}

interface ReportOptions {
  type: string;
  format: 'pdf' | 'excel';
  userId: string;
  portfolioId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  filters?: ReportFilters;
  reportTitle?: string;
  whiteLabelConfig?: any;
}

class ReportGenerator {
  private getDateRange(options: ReportOptions) {
    if (options.startDate && options.endDate) {
      return {
        startDate: options.startDate,
        endDate: options.endDate
      };
    }

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    
    let startDate: string;
    switch (options.period) {
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0];
        break;
      case 'current':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
    }

    return { startDate, endDate };
  }

  private async fetchPortfolioData(userId: string, portfolioId?: string, propertyIds?: string[]) {
    // First, fetch properties with basic data only
    let propertiesQuery = supabase
      .from('properties')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null);

    if (portfolioId && portfolioId !== 'everything') {
      propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
    }

    // Filter by specific property IDs if provided
    if (propertyIds && propertyIds.length > 0) {
      propertiesQuery = propertiesQuery.in('id', propertyIds);
    }

    const { data: properties, error: propertiesError } = await propertiesQuery;
    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      throw propertiesError;
    }

    if (!properties || properties.length === 0) {
      console.log('🔍 [REPORT_GEN] No properties found');
      return [];
    }

    const propertyIdsList = properties.map(p => p.id);
    console.log('🔍 [REPORT_GEN] Fetched properties:', properties.length, 'Property IDs:', propertyIdsList);

    // Now fetch related data separately for better performance
    const [unitsResult, paymentsResult, maintenanceResult, applicationsResult, hapPaymentsResult] = await Promise.all([
      // Fetch property units
      supabase
        .from('property_units')
        .select('*')
        .in('property_id', propertyIdsList),
      
      // Fetch rent payments
      supabase
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIdsList),
      
      // Fetch maintenance requests
      supabase
        .from('maintenance_requests')
        .select('*, maintenance_costs(*)')
        .in('property_id', propertyIdsList),
      
      // Fetch property applications
      supabase
        .from('property_applications')
        .select('*')
        .in('property_id', propertyIdsList),
      
      // Fetch HAP payments
      supabase
        .from('hap_payments')
        .select('*')
        .in('property_id', propertyIdsList)
    ]);

    // Check for errors
    const errors = [unitsResult.error, paymentsResult.error, maintenanceResult.error, applicationsResult.error, hapPaymentsResult.error].filter(Boolean);
    if (errors.length > 0) {
      console.error('Error fetching related data:', errors);
      // Don't throw error, just log it and continue with partial data
    }

    // Attach related data to properties
    const enrichedProperties = properties.map(property => ({
      ...property,
      property_units: (unitsResult.data || []).filter(unit => unit.property_id === property.id),
      rent_payments: (paymentsResult.data || []).filter(payment => payment.property_id === property.id),
      maintenance_requests: (maintenanceResult.data || []).filter(request => request.property_id === property.id),
      property_applications: (applicationsResult.data || []).filter(app => app.property_id === property.id),
      hap_payments: (hapPaymentsResult.data || []).filter(payment => payment.property_id === property.id)
    }));

    console.log('🔍 [REPORT_GEN] Enriched properties with related data');
    return enrichedProperties;
  }

  private extractAnalyticsFromProperties(properties: any[]) {
    // Extract and flatten nested data from properties
    const rentPayments = properties.flatMap(p => p.rent_payments || []);
    const maintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
    const hapPayments = properties.flatMap(p => p.hap_payments || []);
    const propertyApplications = properties.flatMap(p => p.property_applications || []);
    const propertyUnits = properties.flatMap(p => p.property_units || []);

    console.log('🔍 [REPORT_GEN] Extracted analytics:', {
      rentPayments: rentPayments.length,
      maintenanceRequests: maintenanceRequests.length,
      hapPayments: hapPayments.length,
      propertyApplications: propertyApplications.length,
      propertyUnits: propertyUnits.length
    });

    return {
      rentPayments,
      maintenanceRequests,
      hapPayments,
      propertyApplications,
      propertyUnits
    };
  }

  private generateComprehensiveReport(properties: any[], analytics: any, dateRange: any) {
    // Calculate comprehensive metrics
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
    const vacantProperties = properties.filter(p => p.status === 'vacant').length;
    const availableProperties = properties.filter(p => p.status === 'available').length;
    
    const totalUnits = properties.reduce((sum, p) => sum + (p.unit_count || 1), 0);
    const totalMonthlyRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);
    const totalCollectedRent = analytics.rentPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    
    const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
    const avgRentPerUnit = totalUnits > 0 ? totalMonthlyRent / totalUnits : 0;
    
    // Maintenance metrics
    const totalMaintenanceRequests = analytics.maintenanceRequests.length;
    const openMaintenanceRequests = analytics.maintenanceRequests.filter((req: any) => req.status !== 'completed').length;
    const avgMaintenanceCost = totalMaintenanceRequests > 0 
      ? analytics.maintenanceRequests.reduce((sum: number, req: any) => sum + (req.estimated_cost || 0), 0) / totalMaintenanceRequests
      : 0;

    return {
      title: 'Comprehensive Portfolio Analytics Report',
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {
        totalProperties,
        occupiedProperties,
        vacantProperties,
        availableProperties,
        totalUnits,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalMonthlyRent,
        totalCollectedRent,
        avgRentPerUnit: Math.round(avgRentPerUnit * 100) / 100
      },
      maintenance: {
        totalRequests: totalMaintenanceRequests,
        openRequests: openMaintenanceRequests,
        avgCost: Math.round(avgMaintenanceCost * 100) / 100
      },
      properties,
      analytics
    };
  }

  private generateExecutiveReport(properties: any[], analytics: any, dateRange: any) {
    const summary = this.generateComprehensiveReport(properties, analytics, dateRange).summary;
    
    return {
      title: 'Executive Summary Report',
      generatedAt: new Date().toISOString(),
      dateRange,
      keyMetrics: {
        portfolioValue: summary.totalMonthlyRent * 12, // Annual rent as portfolio value estimate
        occupancyRate: summary.occupancyRate,
        monthlyRevenue: summary.totalCollectedRent,
        propertyCount: summary.totalProperties,
        roi: summary.totalCollectedRent > 0 ? (summary.totalCollectedRent / summary.totalMonthlyRent) * 100 : 0
      },
      highlights: [
        `Portfolio consists of ${summary.totalProperties} properties with ${summary.totalUnits} total units`,
        `Current occupancy rate: ${summary.occupancyRate}%`,
        `Monthly rent potential: $${summary.totalMonthlyRent.toLocaleString()}`,
        `Revenue collected this period: $${summary.totalCollectedRent.toLocaleString()}`
      ],
      summary
    };
  }

  private generateFinancialReport(properties: any[], analytics: any, dateRange: any) {
    const totalRentCollected = analytics.rentPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const totalLateFees = analytics.rentPayments.reduce((sum: number, payment: any) => sum + (payment.late_fee_amount || 0), 0);
    const totalMaintenanceCost = analytics.maintenanceRequests.reduce((sum: number, req: any) => sum + (req.estimated_cost || 0), 0);
    
    const onTimePayments = analytics.rentPayments.filter((payment: any) => (payment.days_late || 0) === 0).length;
    const latePayments = analytics.rentPayments.filter((payment: any) => (payment.days_late || 0) > 0).length;
    const onTimePaymentRate = analytics.rentPayments.length > 0 ? (onTimePayments / analytics.rentPayments.length) * 100 : 0;

    return {
      title: 'Financial Performance Report',
      generatedAt: new Date().toISOString(),
      dateRange,
      revenue: {
        totalRentCollected,
        totalLateFees,
        totalRevenue: totalRentCollected + totalLateFees,
        onTimePaymentRate: Math.round(onTimePaymentRate * 100) / 100
      },
      expenses: {
        totalMaintenanceCost,
        avgMaintenancePerProperty: properties.length > 0 ? totalMaintenanceCost / properties.length : 0
      },
      profitability: {
        grossRevenue: totalRentCollected + totalLateFees,
        totalExpenses: totalMaintenanceCost,
        netIncome: (totalRentCollected + totalLateFees) - totalMaintenanceCost
      },
      paymentAnalysis: {
        totalPayments: analytics.rentPayments.length,
        onTimePayments,
        latePayments,
        onTimePaymentRate: Math.round(onTimePaymentRate * 100) / 100
      }
    };
  }

  private async generatePDFReport(reportData: any, whiteLabelConfig?: any) {
    console.log('🔍 [PDF_GEN] Starting PDF generation for report:', reportData.title);
    
    try {
      const { generatePDF } = await import('../../utils/pdfGenerator');
      console.log('🔍 [PDF_GEN] PDF generator imported successfully');
      
      const htmlContent = generateEnhancedReportHTML(reportData, whiteLabelConfig);
      console.log('🔍 [PDF_GEN] HTML content generated, length:', htmlContent.length);
      
      const companyName = whiteLabelConfig?.company_name || 'OpenKey';
      await generatePDF.generatePDFFromHTML(htmlContent, {
        filename: `comprehensive-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        pageBreaks: true,
        headerText: `${companyName} Property Management - Comprehensive Analytics Report`,
        footerText: `Generated on ${new Date().toLocaleDateString()}`,
        quality: 1.0
      });
      
      console.log('🔍 [PDF_GEN] PDF generation completed successfully');
    } catch (error) {
      console.error('🚨 [PDF_GEN] Enhanced PDF generation failed:', error);
      
      // Show user-friendly error message
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('PDF generation failed. Please try again or use your browser\'s print function as an alternative.');
      }
      
      // Fallback to print dialog
      try {
        const htmlContent = generateEnhancedReportHTML(reportData, whiteLabelConfig);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 1000);
        }
      } catch (fallbackError) {
        console.error('🚨 [PDF_GEN] Fallback to print also failed:', fallbackError);
      }
    }
  }

  // Add missing calculation methods used by the enhanced reports
  private calculateEnhancedMetrics(properties: any[]): any {
    if (!properties.length) {
      return {
        totalGrossRent: 0, totalActualRent: 0, totalCollectedRent: 0, collectionRate: 0,
        grossRevenue: 0, netOperatingIncome: 0, cashFlow: 0, totalUnits: 0,
        occupiedUnits: 0, vacantUnits: 0, occupancyRate: 0, vacancyRate: 0,
        totalExpenses: 0, mortgageExpenses: 0, maintenanceExpenses: 0, insuranceExpenses: 0,
        managementExpenses: 0, taxExpenses: 0, expenseRatio: 0, averageRentPerUnit: 0,
        revenuePerSqFt: 0, capRate: 0, cashOnCashReturn: 0, portfolioHealthScore: 0,
        averageDaysVacant: 0, maintenanceRequestsOpen: 0, maintenanceResponseTime: 0,
        tenantTurnoverRate: 0
      };
    }

    // Calculate comprehensive metrics
    let totalUnits = 0;
    let occupiedUnits = 0;
    let totalGrossRent = 0;
    let totalActualRent = 0;

    properties.forEach(property => {
      const units = property.property_units || [];
      if (units.length > 0) {
        totalUnits += units.length;
        units.forEach((unit: any) => {
          totalGrossRent += unit.monthly_rent || 0;
          if (unit.status === 'occupied') {
            occupiedUnits++;
            totalActualRent += unit.monthly_rent || 0;
          }
        });
      } else {
        totalUnits += 1;
        totalGrossRent += property.monthly_rent || 0;
        if (property.status === 'occupied') {
          occupiedUnits++;
          totalActualRent += property.monthly_rent || 0;
        }
      }
    });

    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    const vacancyRate = 100 - occupancyRate;

    // Calculate collected rent and revenue
    const allPayments = properties.flatMap(p => p.rent_payments || []);
    const completedPayments = allPayments.filter(p => p.status === 'completed');
    const totalCollectedRent = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const collectionRate = totalActualRent > 0 ? (totalCollectedRent / totalActualRent) * 100 : 0;

    const allHapPayments = properties.flatMap(p => p.hap_payments || []);
    const receivedHapPayments = allHapPayments.filter(p => p.payment_status === 'received');
    const hapRevenue = receivedHapPayments.reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);

    const lateFeesRevenue = allPayments.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0);
    const grossRevenue = totalCollectedRent + hapRevenue + lateFeesRevenue;

    // Calculate expenses
    const mortgageExpenses = properties.reduce((sum, p) => sum + (p.mortgage_cost || 0), 0);
    const insuranceExpenses = properties.reduce((sum, p) => sum + (p.insurance_cost || 0), 0);
    const managementExpenses = properties.reduce((sum, p) => sum + (p.management_fee || 0), 0);
    const taxExpenses = properties.reduce((sum, p) => sum + (p.property_taxes || 0), 0);
    
    const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
    const maintenanceExpenses = allMaintenanceRequests
      .flatMap(mr => mr.maintenance_costs || [])
      .reduce((sum, cost) => sum + (cost.total_cost || 0), 0);

    const totalExpenses = mortgageExpenses + insuranceExpenses + managementExpenses + taxExpenses + maintenanceExpenses;
    const netOperatingIncome = grossRevenue - totalExpenses;
    const expenseRatio = grossRevenue > 0 ? (totalExpenses / grossRevenue) * 100 : 0;

    // Portfolio health score
    const healthFactors = [
      Math.min(occupancyRate, 100),
      Math.min(collectionRate, 100),
      Math.max(0, 100 - expenseRatio),
      netOperatingIncome > 0 ? 100 : 0
    ];
    const portfolioHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;

    return {
      totalGrossRent,
      totalActualRent,
      totalCollectedRent,
      collectionRate,
      grossRevenue,
      netOperatingIncome,
      cashFlow: netOperatingIncome,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      vacancyRate,
      totalExpenses,
      mortgageExpenses,
      maintenanceExpenses,
      insuranceExpenses,
      managementExpenses,
      taxExpenses,
      expenseRatio,
      averageRentPerUnit: totalUnits > 0 ? totalGrossRent / totalUnits : 0,
      revenuePerSqFt: 0,
      capRate: 0,
      cashOnCashReturn: 0,
      portfolioHealthScore,
      averageDaysVacant: 0,
      maintenanceRequestsOpen: allMaintenanceRequests.filter(mr => mr.status !== 'completed').length,
      maintenanceResponseTime: 0,
      tenantTurnoverRate: 0
    };
  }

  private calculateLeaseAnalytics(properties: any[]): any {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const allApplications = properties.flatMap(p => p.property_applications || []);
    const activeLeases = allApplications.filter(app => app.status === 'approved' && app.lease_end_date);

    const expiring30Days = activeLeases.filter(lease => {
      const endDate = new Date(lease.lease_end_date);
      return endDate >= today && endDate <= thirtyDaysFromNow;
    }).length;

    const expiring60Days = activeLeases.filter(lease => {
      const endDate = new Date(lease.lease_end_date);
      return endDate >= today && endDate <= sixtyDaysFromNow;
    }).length;

    const expiring90Days = activeLeases.filter(lease => {
      const endDate = new Date(lease.lease_end_date);
      return endDate >= today && endDate <= ninetyDaysFromNow;
    }).length;

    return {
      expiring30Days,
      expiring60Days,
      expiring90Days,
      expiredLeases: 0,
      renewalRate: 75,
      averageLeaseLength: 12,
      renewalPipeline: expiring30Days + expiring60Days,
      marketRentVariance: 0,
      rentGrowthRate: 0,
      averageDaysToLease: 28
    };
  }

  private calculateMaintenanceMetrics(properties: any[]): any {
    const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
    const openRequests = allMaintenanceRequests.filter(mr => mr.status !== 'completed');
    const urgentRequests = openRequests.filter(mr => mr.priority === 'urgent');

    const totalMaintenanceCosts = allMaintenanceRequests
      .flatMap(mr => mr.maintenance_costs || [])
      .reduce((sum, cost) => sum + (cost.total_cost || 0), 0);

    const totalUnits = properties.reduce((sum, p) => {
      return sum + (p.property_units?.length || 1);
    }, 0);

    return {
      totalOpenRequests: openRequests.length,
      urgentRequests: urgentRequests.length,
      averageResolutionDays: 0,
      totalMaintenanceCosts,
      costPerUnit: totalUnits > 0 ? totalMaintenanceCosts / totalUnits : 0,
      preventiveMaintenanceRatio: 25,
      vendorPerformanceScore: 85,
      emergencyRepairCosts: totalMaintenanceCosts * 0.3,
      routineMaintenanceCosts: totalMaintenanceCosts * 0.5,
      improvementCosts: totalMaintenanceCosts * 0.2,
      maintenanceByCategory: []
    };
  }

  private calculatePaymentPerformance(properties: any[]): any {
    const allPayments = properties.flatMap(p => p.rent_payments || []);
    const allHapPayments = properties.flatMap(p => p.hap_payments || []);

    const onTimePayments = allPayments.filter(p => {
      if (!p.payment_date || !p.due_date) return false;
      const paymentDate = new Date(p.payment_date);
      const dueDate = new Date(p.due_date);
      return paymentDate <= dueDate;
    });
    
    const latePayments = allPayments.filter(p => {
      if (!p.payment_date || !p.due_date) return false;
      const paymentDate = new Date(p.payment_date);
      const dueDate = new Date(p.due_date);
      return paymentDate > dueDate;
    });
    
    const onTimePaymentRate = allPayments.length > 0 ? (onTimePayments.length / allPayments.length) * 100 : 0;
    const latePaymentRate = allPayments.length > 0 ? (latePayments.length / allPayments.length) * 100 : 0;

    const receivedHapPayments = allHapPayments.filter(p => p.payment_status === 'received');
    const hapCollectionRate = allHapPayments.length > 0 ? (receivedHapPayments.length / allHapPayments.length) * 100 : 0;

    const rentRevenue = allPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
    const lateFeesRevenue = allPayments.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0);
    const hapRevenue = receivedHapPayments.reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);

    return {
      onTimePaymentRate,
      latePaymentRate,
      totalLatePayments: latePayments.length,
      averageCollectionTime: 0,
      hapCollectionRate,
      hapPaymentConsistency: 95,
      voucherProperties: properties.filter(p => p.has_voucher).length,
      totalDelinquency: latePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      averageDelinquencyAge: 0,
      evictionPipeline: 0,
      rentRevenue,
      lateFeesRevenue,
      hapRevenue,
      otherRevenue: 0
    };
  }

  private calculatePropertyRankings(properties: any[]): any[] {
    return properties.map((property, index) => {
      const units = property.property_units || [];
      const totalUnits = units.length || 1;
      const occupiedUnits = units.filter((u: any) => u.status === 'occupied').length || (property.status === 'occupied' ? 1 : 0);
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      const monthlyRent = units.length > 0 
        ? units.reduce((sum: number, u: any) => sum + (u.monthly_rent || 0), 0)
        : property.monthly_rent || 0;

      const monthlyExpenses = (property.mortgage_cost || 0) + (property.insurance_cost || 0) + 
                             (property.management_fee || 0) + (property.repair_costs || 0);

      const netIncome = monthlyRent - monthlyExpenses;
      const roi = property.market_value > 0 ? (netIncome * 12 / property.market_value) * 100 : 0;

      const payments = property.rent_payments || [];
      const completedPayments = payments.filter((p: any) => p.status === 'completed');
      const collectionRate = payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 100;

      const overallScore = (occupancyRate + Math.min(roi * 10, 100) + collectionRate) / 3;

      return {
        propertyId: property.id,
        address: property.address,
        occupancyRate,
        netIncome,
        roi,
        maintenanceCostRatio: 0,
        collectionRate,
        overallScore,
        rank: index + 1
      };
    }).sort((a, b) => b.overallScore - a.overallScore)
      .map((property, index) => ({ ...property, rank: index + 1 }));
  }

  private generateReportContent(reportData: any): string {
    if (reportData.title.includes('Comprehensive')) {
      return this.generateComprehensiveHTML(reportData);
    } else if (reportData.title.includes('Executive')) {
      return this.generateExecutiveHTML(reportData);
    } else if (reportData.title.includes('Financial')) {
      return this.generateFinancialHTML(reportData);
    }
    return '';
  }

  private generateComprehensiveHTML(reportData: any): string {
    return `
      <div class="summary">
        <h2 class="section-title">Portfolio Overview</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${reportData.summary.totalProperties}</div>
            <div class="metric-label">Total Properties</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${reportData.summary.occupancyRate}%</div>
            <div class="metric-label">Occupancy Rate</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${reportData.summary.totalMonthlyRent.toLocaleString()}</div>
            <div class="metric-label">Monthly Rent Potential</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${reportData.summary.totalCollectedRent.toLocaleString()}</div>
            <div class="metric-label">Rent Collected</div>
          </div>
        </div>
      </div>

      <h2 class="section-title">Maintenance Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${reportData.maintenance.totalRequests}</div>
          <div class="metric-label">Total Requests</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${reportData.maintenance.openRequests}</div>
          <div class="metric-label">Open Requests</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">$${reportData.maintenance.avgCost.toLocaleString()}</div>
          <div class="metric-label">Avg Cost Per Request</div>
        </div>
      </div>
    `;
  }

  private generateExecutiveHTML(reportData: any): string {
    return `
      <div class="summary">
        <h2 class="section-title">Key Performance Indicators</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">$${reportData.keyMetrics.portfolioValue.toLocaleString()}</div>
            <div class="metric-label">Portfolio Value (Est.)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${reportData.keyMetrics.occupancyRate}%</div>
            <div class="metric-label">Occupancy Rate</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${reportData.keyMetrics.monthlyRevenue.toLocaleString()}</div>
            <div class="metric-label">Monthly Revenue</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Math.round(reportData.keyMetrics.roi)}%</div>
            <div class="metric-label">Collection Rate</div>
          </div>
        </div>
      </div>

      <div class="highlights">
        <h2 class="section-title">Portfolio Highlights</h2>
        <ul>
          ${reportData.highlights.map((highlight: string) => `<li>${highlight}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private generateFinancialHTML(reportData: any): string {
    return `
      <div class="summary">
        <h2 class="section-title">Revenue Analysis</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">$${reportData.revenue.totalRentCollected.toLocaleString()}</div>
            <div class="metric-label">Rent Collected</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${reportData.revenue.totalLateFees.toLocaleString()}</div>
            <div class="metric-label">Late Fees</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${reportData.revenue.totalRevenue.toLocaleString()}</div>
            <div class="metric-label">Total Revenue</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${reportData.revenue.onTimePaymentRate}%</div>
            <div class="metric-label">On-Time Payment Rate</div>
          </div>
        </div>
      </div>

      <h2 class="section-title">Profitability Analysis</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">$${reportData.profitability.grossRevenue.toLocaleString()}</div>
          <div class="metric-label">Gross Revenue</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">$${reportData.profitability.totalExpenses.toLocaleString()}</div>
          <div class="metric-label">Total Expenses</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">$${reportData.profitability.netIncome.toLocaleString()}</div>
          <div class="metric-label">Net Income</div>
        </div>
      </div>
    `;
  }

  async generateReport(options: ReportOptions): Promise<void> {
    try {
      console.log('🔍 [REPORT_GEN] Starting report generation with options:', options);
      
      if (!options.userId) {
        throw new Error('User ID is required for report generation');
      }

      const dateRange = this.getDateRange(options);
      
      // Fetch data with property filtering
      const properties = await this.fetchPortfolioData(
        options.userId, 
        options.portfolioId,
        options.filters?.propertyIds
      );

      if (!properties || properties.length === 0) {
        throw new Error('No properties found for the selected criteria');
      }

      console.log('🔍 [REPORT_GEN] Processing', properties.length, 'properties');

      // Extract analytics data from properties
      const analytics = this.extractAnalyticsFromProperties(properties);

      // Generate report data based on type
      let reportData;
      switch (options.type) {
        case 'comprehensive':
          reportData = this.generateComprehensiveReport(properties, analytics, dateRange);
          // Add enhanced metrics and sections for comprehensive reports
          reportData.enhancedMetrics = this.calculateEnhancedMetrics(properties);
          reportData.leaseAnalytics = this.calculateLeaseAnalytics(properties);
          reportData.maintenanceMetrics = this.calculateMaintenanceMetrics(properties);
          reportData.paymentPerformance = this.calculatePaymentPerformance(properties);
          reportData.propertyRankings = this.calculatePropertyRankings(properties);
          // IMPORTANT: Set selectedSections from filters
          reportData.selectedSections = options.filters?.selectedSections || ['executive', 'financial', 'property', 'maintenance', 'payment', 'lease'];
          break;
        case 'executive':
          reportData = this.generateExecutiveReport(properties, analytics, dateRange);
          reportData.enhancedMetrics = this.calculateEnhancedMetrics(properties);
          reportData.selectedSections = ['executive'];
          break;
        case 'financial':
          reportData = this.generateFinancialReport(properties, analytics, dateRange);
          reportData.paymentPerformance = this.calculatePaymentPerformance(properties);
          reportData.selectedSections = ['financial'];
          break;
        default:
          reportData = this.generateComprehensiveReport(properties, analytics, dateRange);
          reportData.enhancedMetrics = this.calculateEnhancedMetrics(properties);
          reportData.selectedSections = ['executive'];
      }

      console.log('🔍 [REPORT_GEN] Generated report data:', reportData.title, 'with sections:', reportData.selectedSections);

      // Generate output based on format
      if (options.format === 'pdf') {
        await this.generatePDFReport(reportData, options.whiteLabelConfig);
      } else {
        // Excel format - convert to CSV for now
        this.generateExcelReport(reportData, properties);
      }

    } catch (error) {
      console.error('🔍 [REPORT_GEN] Report generation failed:', error);
      throw error;
    }
  }

  private generateExcelReport(reportData: any, properties: any[]) {
    // Convert to CSV format for Excel compatibility
    const csvData = properties.map(property => ({
      address: property.address || '',
      status: property.status || '',
      monthly_rent: property.monthly_rent || 0,
      unit_count: property.unit_count || 1,
      created_at: property.created_at || ''
    }));

    const headers = ['Property Address', 'Status', 'Monthly Rent', 'Unit Count', 'Created Date'];
    const csvContent = [
      [`${reportData.title} - Generated ${new Date().toLocaleString()}`],
      [''],
      headers,
      ...csvData.map(row => [
        row.address,
        row.status,
        row.monthly_rent.toString(),
        row.unit_count.toString(),
        new Date(row.created_at).toLocaleDateString()
      ])
    ];

    const csvString = csvContent
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default ReportGenerator;