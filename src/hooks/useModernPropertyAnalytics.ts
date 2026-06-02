import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModernFinancialMetrics {
  // Core Financial KPIs
  capRate: number;
  cashOnCashReturn: number;
  debtServiceCoverageRatio: number;
  grossRentMultiplier: number;
  
  // Rent Growth Analytics
  rentGrowthYoY: number;
  marketRentVariance: number;
  rentRollGrowth: number;
  
  // Advanced Expense Ratios
  operatingExpenseRatio: number;
  maintenanceAsPercentOfRevenue: number;
  managementFeeRatio: number;
  taxBurdenRatio: number;
  
  // Performance Benchmarking
  revenuePerSqFt: number;
  expensePerSqFt: number;
  netIncomePerSqFt: number;
  costPerUnit: number;
  
  // Market Intelligence
  marketAbsorptionRate: number;
  competitivePositioning: number;
  daysOnMarket: number;
  
  // Risk Metrics
  tenantConcentrationRisk: number;
  incomeVolatility: number;
  maintenanceRiskScore: number;
}

export interface PredictiveAnalytics {
  // Vacancy Predictions
  vacancyRiskScore: number;
  predictedVacancyDays: number;
  renewalProbability: number;
  
  // Maintenance Forecasting
  predictedMaintenanceCosts: number;
  deferredMaintenanceRisk: number;
  capexRequirements: number;
  
  // Revenue Optimization
  optimalRentPrice: number;
  marketRentGap: number;
  revenueOptimizationPotential: number;
  
  // Financial Forecasting
  projectedNOI: number;
  projectedCashFlow: number;
  breakEvenOccupancy: number;
}

export interface OperationalExcellence {
  // Leasing Performance
  daysToFillVacancy: number;
  leasingVelocity: number;
  applicationToLeaseRatio: number;
  
  // Maintenance Excellence
  maintenanceResponseTime: number;
  firstCallResolutionRate: number;
  preventiveMaintenanceRatio: number;
  vendorPerformanceScore: number;
  
  // Tenant Experience
  tenantSatisfactionScore: number;
  tenantRetentionRate: number;
  renewalRate: number;
  complaintResolutionTime: number;
  
  // Compliance & Risk
  inspectionComplianceRate: number;
  safetyIncidentRate: number;
  insuranceClaimFrequency: number;
}

export const useModernPropertyAnalytics = (landlordId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['modernPropertyAnalytics', landlordId, portfolioId],
    queryFn: async () => {
      try {
        // Fetch comprehensive property data
        let query = supabase
          .from('properties')
          .select(`
            *,
            property_units (
              id,
              unit_number,
              monthly_rent,
              status,
              square_feet,
              tenant_id,
              lease_start_date,
              lease_end_date
            ),
            maintenance_requests (
              id,
              status,
              priority,
              created_at,
              completed_date,
              estimated_cost,
              actual_cost,
              category,
              maintenance_costs (
                total_cost,
                cost_type
              )
            ),
            rent_payments (
              id,
              amount,
              payment_date,
              due_date,
              status,
              late_fee_amount,
              days_late,
              created_at
            ),
            hap_payments (
              id,
              expected_amount,
              actual_amount,
              payment_status,
              payment_date,
              created_at
            ),
            property_applications!property_applications_property_id_fkey (
              id,
              status,
              created_at
            )
          `)
          .eq('owner_id', landlordId)
          .is('deleted_at', null);

        if (portfolioId && portfolioId !== 'everything' && portfolioId !== 'all') {
          query = query.eq('portfolio_id', portfolioId);
        }

        const { data: properties, error } = await query;
        if (error) throw error;

        const modernFinancialMetrics = calculateModernFinancialMetrics(properties || []);
        const predictiveAnalytics = calculatePredictiveAnalytics(properties || []);
        const operationalExcellence = calculateOperationalExcellence(properties || []);

        return {
          modernFinancialMetrics,
          predictiveAnalytics,
          operationalExcellence,
          properties: properties || []
        };
      } catch (error) {
        console.error('Error fetching modern analytics:', error);
        // Return default values instead of throwing to prevent dashboard crashes
        return {
          modernFinancialMetrics: {
            capRate: 0, cashOnCashReturn: 0, debtServiceCoverageRatio: 0, grossRentMultiplier: 0,
            rentGrowthYoY: 0, marketRentVariance: 0, rentRollGrowth: 0,
            operatingExpenseRatio: 0, maintenanceAsPercentOfRevenue: 0, managementFeeRatio: 0, taxBurdenRatio: 0,
            revenuePerSqFt: 0, expensePerSqFt: 0, netIncomePerSqFt: 0, costPerUnit: 0,
            marketAbsorptionRate: 0, competitivePositioning: 0, daysOnMarket: 0,
            tenantConcentrationRisk: 0, incomeVolatility: 0, maintenanceRiskScore: 0
          },
          predictiveAnalytics: {
            vacancyRiskScore: 0, predictedVacancyDays: 0, renewalProbability: 0,
            predictedMaintenanceCosts: 0, deferredMaintenanceRisk: 0, capexRequirements: 0,
            optimalRentPrice: 0, marketRentGap: 0, revenueOptimizationPotential: 0,
            projectedNOI: 0, projectedCashFlow: 0, breakEvenOccupancy: 0
          },
          operationalExcellence: {
            daysToFillVacancy: 0, leasingVelocity: 0, applicationToLeaseRatio: 0,
            maintenanceResponseTime: 0, firstCallResolutionRate: 0, preventiveMaintenanceRatio: 0, vendorPerformanceScore: 0,
            tenantSatisfactionScore: 0, tenantRetentionRate: 0, renewalRate: 0, complaintResolutionTime: 0,
            inspectionComplianceRate: 0, safetyIncidentRate: 0, insuranceClaimFrequency: 0
          },
          properties: []
        };
      }
    },
    enabled: !!landlordId,
    staleTime: 10 * 60 * 1000, // 10 minutes for better persistence
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    retry: (failureCount, error) => {
      // Don't retry on database schema errors
      if ((error as any)?.code === '42703') return false; // Column does not exist
      if ((error as any)?.code === '22P02') return false; // Invalid UUID syntax
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
};

function calculateModernFinancialMetrics(properties: any[]): ModernFinancialMetrics {
  if (!properties.length) {
    return {
      capRate: 0, cashOnCashReturn: 0, debtServiceCoverageRatio: 0, grossRentMultiplier: 0,
      rentGrowthYoY: 0, marketRentVariance: 0, rentRollGrowth: 0,
      operatingExpenseRatio: 0, maintenanceAsPercentOfRevenue: 0, managementFeeRatio: 0, taxBurdenRatio: 0,
      revenuePerSqFt: 0, expensePerSqFt: 0, netIncomePerSqFt: 0, costPerUnit: 0,
      marketAbsorptionRate: 0, competitivePositioning: 0, daysOnMarket: 0,
      tenantConcentrationRisk: 0, incomeVolatility: 0, maintenanceRiskScore: 0
    };
  }

  // Aggregate property financials
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalPropertyValue = 0;
  let totalSqFt = 0;
  let totalUnits = 0;
  let totalDebtService = 0;
  let totalCashInvested = 0;

  properties.forEach(property => {
    const units = property.property_units || [];
    const propertyUnits = units.length || 1;
    totalUnits += propertyUnits;

    // Revenue calculation
    const monthlyRent = units.length > 0 
      ? units.reduce((sum: number, unit: any) => sum + (unit.monthly_rent || 0), 0)
      : (property.monthly_rent || 0);
    
    const annualRent = monthlyRent * 12;
    
    // Add late fees and other income
    const payments = property.rent_payments || [];
    const hapPayments = property.hap_payments || [];
    const lateFees = payments.reduce((sum: number, p: any) => sum + (p.late_fee_amount || 0), 0);
    const hapRevenue = hapPayments.reduce((sum: number, p: any) => sum + (p.actual_amount || p.expected_amount || 0), 0);
    
    totalRevenue += annualRent + lateFees + hapRevenue;

    // Expenses calculation
    const annualExpenses = ((property.mortgage_cost || 0) + 
                           (property.insurance_cost || 0) + 
                           (property.management_fee || 0) + 
                           (property.repair_costs || 0) + 
                           (property.property_taxes || 0)) * 12;
    
    totalExpenses += annualExpenses;

    // Property values and metrics
    totalPropertyValue += property.market_value || (annualRent * 10); // 10x rent cap rate estimate
    totalSqFt += units.length > 0 
      ? units.reduce((sum: number, unit: any) => sum + (unit.square_feet || 1000), 0)
      : (property.square_feet || 1000);
    
    totalDebtService += (property.mortgage_cost || 0) * 12;
    totalCashInvested += (property.purchase_price || property.market_value || annualRent * 10) * 0.25; // Assume 25% down
  });

  const netOperatingIncome = totalRevenue - (totalExpenses - totalDebtService);
  
  // Core Financial KPIs
  const capRate = totalPropertyValue > 0 ? (netOperatingIncome / totalPropertyValue) * 100 : 0;
  const cashOnCashReturn = totalCashInvested > 0 ? ((netOperatingIncome - totalDebtService) / totalCashInvested) * 100 : 0;
  const debtServiceCoverageRatio = totalDebtService > 0 ? netOperatingIncome / totalDebtService : 0;
  const grossRentMultiplier = totalPropertyValue > 0 ? totalPropertyValue / totalRevenue : 0;

  // Rent Growth Analytics (using historical data simulation)
  const currentYearRent = totalRevenue / properties.length;
  const lastYearRent = currentYearRent * 0.95; // Simulate 5% growth
  const rentGrowthYoY = lastYearRent > 0 ? ((currentYearRent - lastYearRent) / lastYearRent) * 100 : 0;
  
  // Market positioning (estimate based on rent vs market averages)
  const averageMarketRent = currentYearRent * 1.05; // Assume market is 5% higher
  const marketRentVariance = ((currentYearRent - averageMarketRent) / averageMarketRent) * 100;

  // Expense Ratios
  const operatingExpenseRatio = totalRevenue > 0 ? ((totalExpenses - totalDebtService) / totalRevenue) * 100 : 0;
  const maintenanceExpenses = properties.reduce((sum, p) => sum + (p.repair_costs || 0) * 12, 0);
  const maintenanceAsPercentOfRevenue = totalRevenue > 0 ? (maintenanceExpenses / totalRevenue) * 100 : 0;
  const managementFees = properties.reduce((sum, p) => sum + (p.management_fee || 0) * 12, 0);
  const managementFeeRatio = totalRevenue > 0 ? (managementFees / totalRevenue) * 100 : 0;
  const propertyTaxes = properties.reduce((sum, p) => sum + (p.property_taxes || 0) * 12, 0);
  const taxBurdenRatio = totalRevenue > 0 ? (propertyTaxes / totalRevenue) * 100 : 0;

  // Per Unit/SqFt Metrics
  const revenuePerSqFt = totalSqFt > 0 ? totalRevenue / totalSqFt : 0;
  const expensePerSqFt = totalSqFt > 0 ? totalExpenses / totalSqFt : 0;
  const netIncomePerSqFt = totalSqFt > 0 ? netOperatingIncome / totalSqFt : 0;
  const costPerUnit = totalUnits > 0 ? totalExpenses / totalUnits : 0;

  // Risk Metrics
  const tenantConcentrationRisk = calculateTenantConcentrationRisk(properties);
  const incomeVolatility = calculateIncomeVolatility(properties);
  const maintenanceRiskScore = calculateMaintenanceRiskScore(properties);

  return {
    capRate,
    cashOnCashReturn,
    debtServiceCoverageRatio,
    grossRentMultiplier,
    rentGrowthYoY,
    marketRentVariance,
    rentRollGrowth: rentGrowthYoY * 0.8, // Estimate
    operatingExpenseRatio,
    maintenanceAsPercentOfRevenue,
    managementFeeRatio,
    taxBurdenRatio,
    revenuePerSqFt,
    expensePerSqFt,
    netIncomePerSqFt,
    costPerUnit,
    marketAbsorptionRate: 85, // Placeholder
    competitivePositioning: marketRentVariance > 0 ? 75 : 65, // Based on rent variance
    daysOnMarket: 28, // Placeholder
    tenantConcentrationRisk,
    incomeVolatility,
    maintenanceRiskScore
  };
}

function calculatePredictiveAnalytics(properties: any[]): PredictiveAnalytics {
  if (!properties.length) {
    return {
      vacancyRiskScore: 0, predictedVacancyDays: 0, renewalProbability: 0,
      predictedMaintenanceCosts: 0, deferredMaintenanceRisk: 0, capexRequirements: 0,
      optimalRentPrice: 0, marketRentGap: 0, revenueOptimizationPotential: 0,
      projectedNOI: 0, projectedCashFlow: 0, breakEvenOccupancy: 0
    };
  }

  // Vacancy Risk Analysis
  const vacancyRiskScore = calculateVacancyRiskScore(properties);
  const predictedVacancyDays = 25 + (vacancyRiskScore * 0.5); // Base 25 days plus risk factor
  
  // Lease Renewal Analysis
  const renewalProbability = calculateRenewalProbability(properties);
  
  // Maintenance Forecasting
  const currentMaintenanceCosts = properties.reduce((sum, p) => 
    sum + (p.repair_costs || 0) * 12, 0);
  const predictedMaintenanceCosts = currentMaintenanceCosts * 1.15; // 15% inflation
  
  // Revenue Optimization
  const currentRent = properties.reduce((sum, p) => {
    const units = p.property_units || [];
    return sum + (units.length > 0 
      ? units.reduce((unitSum: number, unit: any) => unitSum + (unit.monthly_rent || 0), 0)
      : (p.monthly_rent || 0));
  }, 0);
  
  const optimalRentPrice = currentRent * 1.08; // 8% optimization potential
  const marketRentGap = optimalRentPrice - currentRent;
  const revenueOptimizationPotential = (marketRentGap / currentRent) * 100;

  return {
    vacancyRiskScore,
    predictedVacancyDays,
    renewalProbability,
    predictedMaintenanceCosts,
    deferredMaintenanceRisk: 25, // Placeholder
    capexRequirements: predictedMaintenanceCosts * 0.3,
    optimalRentPrice,
    marketRentGap,
    revenueOptimizationPotential,
    projectedNOI: currentMaintenanceCosts * 1.1, // Placeholder
    projectedCashFlow: currentMaintenanceCosts * 0.8, // Placeholder
    breakEvenOccupancy: 78 // Placeholder
  };
}

function calculateOperationalExcellence(properties: any[]): OperationalExcellence {
  if (!properties.length) {
    return {
      daysToFillVacancy: 0, leasingVelocity: 0, applicationToLeaseRatio: 0,
      maintenanceResponseTime: 0, firstCallResolutionRate: 0, preventiveMaintenanceRatio: 0, vendorPerformanceScore: 0,
      tenantSatisfactionScore: 0, tenantRetentionRate: 0, renewalRate: 0, complaintResolutionTime: 0,
      inspectionComplianceRate: 0, safetyIncidentRate: 0, insuranceClaimFrequency: 0
    };
  }

  // Leasing Performance
  const daysToFillVacancy = calculateAverageDaysToFill(properties);
  const leasingVelocity = 30 / Math.max(daysToFillVacancy, 1); // Units per month
  
  const allApplications = properties.flatMap(p => p.property_applications || []);
  const approvedApplications = allApplications.filter(app => app.status === 'approved');
  const applicationToLeaseRatio = allApplications.length > 0 ? 
    (approvedApplications.length / allApplications.length) * 100 : 0;

  // Maintenance Excellence
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const maintenanceResponseTime = calculateAverageResponseTime(allMaintenanceRequests);
  
  return {
    daysToFillVacancy,
    leasingVelocity,
    applicationToLeaseRatio,
    maintenanceResponseTime,
    firstCallResolutionRate: 78, // Placeholder
    preventiveMaintenanceRatio: 35, // Placeholder
    vendorPerformanceScore: 85, // Placeholder
    tenantSatisfactionScore: 4.2, // Placeholder
    tenantRetentionRate: 85, // Placeholder
    renewalRate: 78, // Placeholder
    complaintResolutionTime: 2.5, // Placeholder
    inspectionComplianceRate: 95, // Placeholder
    safetyIncidentRate: 0.5, // Placeholder
    insuranceClaimFrequency: 0.1 // Placeholder
  };
}

// Helper functions
function calculateTenantConcentrationRisk(properties: any[]): number {
  const totalRevenue = properties.reduce((sum, p) => {
    const units = p.property_units || [];
    return sum + (units.length > 0 
      ? units.reduce((unitSum: number, unit: any) => unitSum + (unit.monthly_rent || 0), 0)
      : (p.monthly_rent || 0));
  }, 0);

  if (totalRevenue === 0) return 0;

  // Calculate largest tenant's contribution
  const largestTenantRevenue = Math.max(...properties.map(p => {
    const units = p.property_units || [];
    return units.length > 0 
      ? Math.max(...units.map((unit: any) => unit.monthly_rent || 0))
      : (p.monthly_rent || 0);
  }));

  return (largestTenantRevenue / totalRevenue) * 100;
}

function calculateIncomeVolatility(properties: any[]): number {
  // Simplified volatility calculation based on payment patterns
  const payments = properties.flatMap(p => p.rent_payments || []);
  const monthlyPayments = payments.reduce((acc: any, payment) => {
    const month = new Date(payment.payment_date).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + (payment.amount || 0);
    return acc;
  }, {});

  const amounts = Object.values(monthlyPayments) as number[];
  if (amounts.length < 2) return 0;

  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
  
  return mean > 0 ? Math.sqrt(variance) / mean * 100 : 0;
}

function calculateMaintenanceRiskScore(properties: any[]): number {
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const openRequests = allMaintenanceRequests.filter(mr => mr.status !== 'completed');
  const urgentRequests = openRequests.filter(mr => mr.priority === 'urgent');
  
  const baseScore = Math.min(openRequests.length * 10, 100);
  const urgencyMultiplier = urgentRequests.length * 15;
  
  return Math.min(baseScore + urgencyMultiplier, 100);
}

function calculateVacancyRiskScore(properties: any[]): number {
  // Factors: lease expiration dates, payment history, maintenance issues
  const today = new Date();
  const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  
  const allApplications = properties.flatMap(p => p.property_applications || []);
  const expiringSoon = allApplications.filter(app => {
    if (!app.lease_end_date) return false;
    const endDate = new Date(app.lease_end_date);
    return endDate >= today && endDate <= sixtyDaysFromNow;
  });

  const latePayments = properties.flatMap(p => p.rent_payments || [])
    .filter(payment => payment.days_late && payment.days_late > 0);

  const riskScore = (expiringSoon.length * 20) + (latePayments.length * 10);
  return Math.min(riskScore, 100);
}

function calculateRenewalProbability(properties: any[]): number {
  // Based on payment history, lease terms, and maintenance satisfaction
  const allPayments = properties.flatMap(p => p.rent_payments || []);
  const onTimePayments = allPayments.filter(p => !p.days_late || p.days_late === 0);
  const onTimeRate = allPayments.length > 0 ? (onTimePayments.length / allPayments.length) * 100 : 0;
  
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const completedMaintenance = allMaintenanceRequests.filter(mr => mr.status === 'completed');
  const maintenanceSatisfaction = allMaintenanceRequests.length > 0 ? 
    (completedMaintenance.length / allMaintenanceRequests.length) * 100 : 100;

  return (onTimeRate * 0.6) + (maintenanceSatisfaction * 0.4);
}

function calculateAverageDaysToFill(properties: any[]): number {
  // Simplified calculation based on vacant properties
  const vacantProperties = properties.filter(p => p.status === 'available');
  if (vacantProperties.length === 0) return 25; // Default

  return vacantProperties.reduce((sum, property) => {
    const daysSinceVacant = property.created_at ? 
      Math.floor((Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 30;
    return sum + daysSinceVacant;
  }, 0) / vacantProperties.length;
}

function calculateAverageResponseTime(maintenanceRequests: any[]): number {
  const completedRequests = maintenanceRequests.filter(mr => mr.status === 'completed');
  
  if (completedRequests.length === 0) return 0;

  return completedRequests.reduce((sum, mr) => {
    if (mr.completed_date && mr.created_at) {
      const diffTime = new Date(mr.completed_date).getTime() - new Date(mr.created_at).getTime();
      return sum + (diffTime / (1000 * 60 * 60 * 24));
    }
    return sum;
  }, 0) / completedRequests.length;
}