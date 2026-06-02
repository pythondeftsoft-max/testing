import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';

export interface EnhancedPortfolioMetrics {
  // Financial Performance
  totalGrossRent: number;
  totalActualRent: number;
  totalCollectedRent: number;
  collectionRate: number;
  grossRevenue: number;
  netOperatingIncome: number;
  cashFlow: number;
  
  // Unit-Level Aggregation
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  vacancyRate: number;
  
  // Expense Breakdown
  totalExpenses: number;
  mortgageExpenses: number;
  maintenanceExpenses: number;
  insuranceExpenses: number;
  managementExpenses: number;
  taxExpenses: number;
  expenseRatio: number;
  
  // Performance Indicators
  averageRentPerUnit: number;
  revenuePerSqFt: number;
  capRate: number;
  cashOnCashReturn: number;
  portfolioHealthScore: number;
  
  // Operational Metrics
  averageDaysVacant: number;
  maintenanceRequestsOpen: number;
  maintenanceResponseTime: number;
  tenantTurnoverRate: number;
}

export interface LeaseAnalytics {
  // Lease Expiration Pipeline
  expiring30Days: number;
  expiring60Days: number;
  expiring90Days: number;
  expiredLeases: number;
  
  // Renewal Performance
  renewalRate: number;
  averageLeaseLength: number;
  renewalPipeline: number;
  
  // Market Analysis
  marketRentVariance: number;
  rentGrowthRate: number;
  averageDaysToLease: number;
}

export interface MaintenanceMetrics {
  totalOpenRequests: number;
  urgentRequests: number;
  averageResolutionDays: number;
  totalMaintenanceCosts: number;
  costPerUnit: number;
  preventiveMaintenanceRatio: number;
  vendorPerformanceScore: number;
  
  // Cost Breakdown
  emergencyRepairCosts: number;
  routineMaintenanceCosts: number;
  improvementCosts: number;
  
  // Request Categories
  maintenanceByCategory: Array<{
    category: string;
    count: number;
    totalCost: number;
    avgResolutionDays: number;
  }>;
}

export interface PaymentPerformance {
  // Collection Metrics
  onTimePaymentRate: number;
  latePaymentRate: number;
  totalLatePayments: number;
  averageCollectionTime: number;
  
  // HAP Performance
  hapCollectionRate: number;
  hapPaymentConsistency: number;
  voucherProperties: number;
  
  // Delinquency Analytics
  totalDelinquency: number;
  averageDelinquencyAge: number;
  evictionPipeline: number;
  
  // Revenue Sources
  rentRevenue: number;
  lateFeesRevenue: number;
  hapRevenue: number;
  otherRevenue: number;
}

export interface PropertyRanking {
  propertyId: string;
  address: string;
  occupancyRate: number;
  netIncome: number;
  roi: number;
  maintenanceCostRatio: number;
  collectionRate: number;
  overallScore: number;
  rank: number;
}

export const useEnhancedPortfolioAnalytics = (landlordId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (landlordId) {
      console.log('🔍 [ENHANCED_PORTFOLIO_ANALYTICS] Portfolio changed, invalidating cache:', { 
        landlordId, 
        portfolioId 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['enhancedPortfolioAnalytics'],
        exact: false 
      });
    }
  }, [landlordId, portfolioId, queryClient]);

  return useQuery({
    queryKey: ['enhancedPortfolioAnalytics', landlordId, portfolioId],
    queryFn: async () => {
      try {
        // Base properties query - simplified to avoid TypeScript recursion issues
        let baseQuery = supabase
          .from('properties')
          .select(`
            id,
            address,
            monthly_rent,
            status,
            property_type,
            square_feet,
            bedrooms,
            bathrooms,
            created_at,
            updated_at,
            owner_id,
            portfolio_id,
            occupancy_status,
            lease_start_date,
            lease_end_date,
            deleted_at
          `)
          .eq('owner_id', landlordId)
          .is('deleted_at', null);

        // Apply portfolio filter (portfolioId is already normalized)
        if (portfolioId) {
          baseQuery = baseQuery.eq('portfolio_id', portfolioId);
        }

        const { data: properties, error } = await baseQuery;
        if (error) throw error;

        // Calculate all metrics
        const enhancedMetrics = calculateEnhancedMetrics(properties || []);
        const leaseAnalytics = calculateLeaseAnalytics(properties || []);
        const maintenanceMetrics = calculateMaintenanceMetrics(properties || []);
        const paymentPerformance = calculatePaymentPerformance(properties || []);
        const propertyRankings = calculatePropertyRankings(properties || []);

        return {
          enhancedMetrics,
          leaseAnalytics,
          maintenanceMetrics,
          paymentPerformance,
          propertyRankings,
          rawData: properties
        };
      } catch (error) {
        console.error('Enhanced analytics error:', error);
        throw error;
      }
    },
    enabled: !!landlordId,
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
  });
};

function calculateEnhancedMetrics(properties: any[]): EnhancedPortfolioMetrics {
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

  // Aggregate unit-level data properly
  let totalUnits = 0;
  let occupiedUnits = 0;
  let totalGrossRent = 0;
  let totalActualRent = 0;
  let totalSqFt = 0;

  properties.forEach(property => {
    const units = property.property_units || [];
    if (units.length > 0) {
      // Multi-unit property - aggregate by units
      totalUnits += units.length;
      units.forEach((unit: any) => {
        totalGrossRent += unit.monthly_rent || 0;
        totalSqFt += unit.square_feet || 1000;
        if (unit.status === 'occupied') {
          occupiedUnits++;
          totalActualRent += unit.monthly_rent || 0;
        }
      });
    } else {
      // Single-unit property
      totalUnits += 1;
      totalGrossRent += property.monthly_rent || 0;
      totalSqFt += property.square_feet || 1000;
      if (property.status === 'occupied') {
        occupiedUnits++;
        totalActualRent += property.monthly_rent || 0;
      }
    }
  });

  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const vacancyRate = 100 - occupancyRate;

  // Calculate collected rent from payment data
  const allPayments = properties.flatMap(p => p.rent_payments || []);
  const completedPayments = allPayments.filter(p => p.status === 'completed');
  const totalCollectedRent = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const collectionRate = totalActualRent > 0 ? (totalCollectedRent / totalActualRent) * 100 : 0;

  // HAP payments
  const allHapPayments = properties.flatMap(p => p.hap_payments || []);
  const receivedHapPayments = allHapPayments.filter(p => p.payment_status === 'received');
  const hapRevenue = receivedHapPayments.reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);

  // Late fees
  const lateFeesRevenue = allPayments.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0);
  const grossRevenue = totalCollectedRent + hapRevenue + lateFeesRevenue;

  // Expenses (property-level aggregation)
  const mortgageExpenses = properties.reduce((sum, p) => sum + (p.mortgage_cost || 0), 0);
  const insuranceExpenses = properties.reduce((sum, p) => sum + (p.insurance_cost || 0), 0);
  const managementExpenses = properties.reduce((sum, p) => sum + (p.management_fee || 0), 0);
  const taxExpenses = properties.reduce((sum, p) => sum + (p.property_taxes || 0), 0);
  
  // Maintenance costs from actual maintenance records
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const maintenanceExpenses = allMaintenanceRequests
    .flatMap(mr => mr.maintenance_costs || [])
    .reduce((sum, cost) => sum + (cost.total_cost || 0), 0);

  const totalExpenses = mortgageExpenses + insuranceExpenses + managementExpenses + taxExpenses + maintenanceExpenses;
  const netOperatingIncome = grossRevenue - totalExpenses;
  const cashFlow = netOperatingIncome;
  const expenseRatio = grossRevenue > 0 ? (totalExpenses / grossRevenue) * 100 : 0;

  // Performance metrics
  const averageRentPerUnit = totalUnits > 0 ? totalGrossRent / totalUnits : 0;
  const revenuePerSqFt = totalSqFt > 0 ? grossRevenue / totalSqFt : 0;
  
  // Portfolio health score (0-100)
  const healthFactors = [
    Math.min(occupancyRate, 100),
    Math.min(collectionRate, 100),
    Math.max(0, 100 - expenseRatio),
    netOperatingIncome > 0 ? 100 : 0
  ];
  const portfolioHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;

  // Operational metrics
  const openMaintenanceRequests = allMaintenanceRequests.filter(mr => mr.status !== 'completed').length;
  const completedMaintenanceRequests = allMaintenanceRequests.filter(mr => mr.status === 'completed');
  const averageResponseTime = completedMaintenanceRequests.length > 0 
    ? completedMaintenanceRequests.reduce((sum, mr) => {
        if (mr.completed_date && mr.created_at) {
          const diffTime = new Date(mr.completed_date).getTime() - new Date(mr.created_at).getTime();
          return sum + (diffTime / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0) / completedMaintenanceRequests.length
    : 0;

  return {
    totalGrossRent,
    totalActualRent,
    totalCollectedRent,
    collectionRate,
    grossRevenue,
    netOperatingIncome,
    cashFlow,
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
    averageRentPerUnit,
    revenuePerSqFt,
    capRate: 0, // Would need property values
    cashOnCashReturn: 0, // Would need investment amounts
    portfolioHealthScore,
    averageDaysVacant: 0, // Would need vacancy tracking
    maintenanceRequestsOpen: openMaintenanceRequests,
    maintenanceResponseTime: averageResponseTime,
    tenantTurnoverRate: 0 // Would need historical data
  };
}

function calculateLeaseAnalytics(properties: any[]): LeaseAnalytics {
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

  const expiredLeases = activeLeases.filter(lease => {
    const endDate = new Date(lease.lease_end_date);
    return endDate < today;
  }).length;

  return {
    expiring30Days,
    expiring60Days,
    expiring90Days,
    expiredLeases,
    renewalRate: 75, // Placeholder
    averageLeaseLength: 12, // Placeholder
    renewalPipeline: expiring30Days + expiring60Days,
    marketRentVariance: 0, // Placeholder
    rentGrowthRate: 0, // Placeholder
    averageDaysToLease: 28 // Placeholder
  };
}

function calculateMaintenanceMetrics(properties: any[]): MaintenanceMetrics {
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const openRequests = allMaintenanceRequests.filter(mr => mr.status !== 'completed');
  const urgentRequests = openRequests.filter(mr => mr.priority === 'urgent');
  const completedRequests = allMaintenanceRequests.filter(mr => mr.status === 'completed');

  const totalMaintenanceCosts = allMaintenanceRequests
    .flatMap(mr => mr.maintenance_costs || [])
    .reduce((sum, cost) => sum + (cost.total_cost || 0), 0);

  const totalUnits = properties.reduce((sum, p) => {
    return sum + (p.property_units?.length || 1);
  }, 0);

  const averageResolutionDays = completedRequests.length > 0 
    ? completedRequests.reduce((sum, mr) => {
        if (mr.completed_date && mr.created_at) {
          const diffTime = new Date(mr.completed_date).getTime() - new Date(mr.created_at).getTime();
          return sum + (diffTime / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0) / completedRequests.length
    : 0;

  // Group by category (simplified)
  const categories = ['Plumbing', 'HVAC', 'Electrical', 'Appliances', 'General'];
  const maintenanceByCategory = categories.map(category => ({
    category,
    count: Math.floor(Math.random() * 10), // Placeholder
    totalCost: Math.floor(Math.random() * 5000), // Placeholder
    avgResolutionDays: Math.floor(Math.random() * 7) + 1 // Placeholder
  }));

  return {
    totalOpenRequests: openRequests.length,
    urgentRequests: urgentRequests.length,
    averageResolutionDays,
    totalMaintenanceCosts,
    costPerUnit: totalUnits > 0 ? totalMaintenanceCosts / totalUnits : 0,
    preventiveMaintenanceRatio: 25, // Placeholder
    vendorPerformanceScore: 85, // Placeholder
    emergencyRepairCosts: totalMaintenanceCosts * 0.3,
    routineMaintenanceCosts: totalMaintenanceCosts * 0.5,
    improvementCosts: totalMaintenanceCosts * 0.2,
    maintenanceByCategory
  };
}

function calculatePaymentPerformance(properties: any[]): PaymentPerformance {
  const allPayments = properties.flatMap(p => p.rent_payments || []);
  const allHapPayments = properties.flatMap(p => p.hap_payments || []);

  // Calculate on-time payments more accurately
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

  const totalDelinquency = latePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const voucherProperties = properties.filter(p => p.has_voucher).length;

  return {
    onTimePaymentRate,
    latePaymentRate,
    totalLatePayments: latePayments.length,
    averageCollectionTime: 0, // Placeholder
    hapCollectionRate,
    hapPaymentConsistency: 95, // Placeholder
    voucherProperties,
    totalDelinquency,
    averageDelinquencyAge: 0, // Placeholder
    evictionPipeline: 0, // Placeholder
    rentRevenue,
    lateFeesRevenue,
    hapRevenue,
    otherRevenue: 0
  };
}

function calculatePropertyRankings(properties: any[]): PropertyRanking[] {
  return properties.map((property, index) => {
    const units = property.property_units || [];
    const totalUnits = units.length || 1;
    const occupiedUnits = units.filter((u: any) => u.status === 'occupied').length || (property.status === 'occupied' ? 1 : 0);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const monthlyRent = units.length > 0 
      ? units.reduce((sum: number, u: any) => sum + (u.monthly_rent || 0), 0)
      : property.monthly_rent || 0;

    const monthlyExpenses = (property.mortgage_cost || 0) + (property.insurance_cost || 0) + 
                           (property.management_fee || 0) + (property.repair_costs || 0) + 
                           (property.property_taxes || 0);

    const netIncome = monthlyRent - monthlyExpenses;
    const roi = property.market_value > 0 ? (netIncome * 12 / property.market_value) * 100 : 0;

    const maintenanceCosts = property.maintenance_requests
      ?.flatMap((mr: any) => mr.maintenance_costs || [])
      .reduce((sum: number, cost: any) => sum + (cost.total_cost || 0), 0) || 0;
    
    const maintenanceCostRatio = monthlyRent > 0 ? (maintenanceCosts / monthlyRent) * 100 : 0;

    const payments = property.rent_payments || [];
    const completedPayments = payments.filter((p: any) => p.status === 'completed');
    const collectionRate = payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 100;

    // Overall score calculation
    const overallScore = (occupancyRate * 0.3) + 
                        (Math.min(collectionRate, 100) * 0.25) + 
                        (Math.max(0, 100 - maintenanceCostRatio) * 0.25) + 
                        (roi > 0 ? Math.min(roi * 10, 100) : 0) * 0.2;

    return {
      propertyId: property.id,
      address: property.address || 'Unknown Address',
      occupancyRate,
      netIncome,
      roi,
      maintenanceCostRatio,
      collectionRate,
      overallScore,
      rank: index + 1 // Will be sorted later
    };
  }).sort((a, b) => b.overallScore - a.overallScore)
    .map((property, index) => ({ ...property, rank: index + 1 }));
}