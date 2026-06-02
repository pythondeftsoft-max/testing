import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';

export interface EnhancedPortfolioMetrics {
  // Financial Metrics
  grossMonthlyRevenue: number;
  netOperatingIncome: number;
  totalExpenses: number;
  cashFlow: number;
  collectionRate: number;
  expenseRatio: number;
  
  // Property Metrics
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  occupancyRate: number;
  averageRent: number;
  revenuePerSqFt: number;
  
  // Operational Metrics
  averageDaysToLease: number;
  maintenanceRequestsCount: number;
  averageMaintenanceCost: number;
  renewalRate: number;
  
  // Performance Indicators
  portfolioHealthScore: number;
  yearOverYearGrowth: number;
  profitMargin: number;
}

export interface PropertyPerformanceData {
  propertyId: string;
  address: string;
  monthlyRent: number;
  totalExpenses: number;
  netIncome: number;
  occupancyStatus: 'occupied' | 'vacant' | 'maintenance';
  roi: number;
  marketValue: number;
}

export interface MaintenanceAnalytics {
  totalOpenRequests: number;
  averageResolutionDays: number;
  totalMaintenanceCost: number;
  costPerUnit: number;
  urgentRequests: number;
  completedThisMonth: number;
  topMaintenanceCategories: Array<{
    category: string;
    count: number;
    totalCost: number;
  }>;
}

export interface RevenueBreakdown {
  rentRevenue: number;
  lateFeesRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
}

export const useEnhancedLandlordAnalytics = (landlordId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (landlordId) {
      console.log('🔍 [ENHANCED_LANDLORD_ANALYTICS] Portfolio changed, invalidating cache:', { 
        landlordId, 
        portfolioId 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['enhancedLandlordAnalytics'],
        exact: false 
      });
    }
  }, [landlordId, portfolioId, queryClient]);

  return useQuery({
    queryKey: ['enhancedLandlordAnalytics', landlordId, portfolioId],
    queryFn: async () => {
      try {
        // Build properties query with optional portfolio filter
        let propertiesQuery = supabase
          .from('properties')
          .select(`
            *,
            property_units (
              id,
              unit_number,
              monthly_rent,
              status
            ),
            maintenance_requests (
              id,
              status,
              priority,
              created_at,
              completed_date
            ),
            rent_payments (
              id,
              amount,
              payment_date,
              due_date,
              status,
              late_fee_amount
            )
          `)
          .eq('owner_id', landlordId)
          .is('deleted_at', null);

        // Apply portfolio filter (portfolioId is already normalized)
        if (portfolioId) {
          propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
        }

        const { data: properties, error: propertiesError } = await propertiesQuery;
        
        if (propertiesError) throw propertiesError;

        // Fetch vendor payment records
        let vendorPaymentsQuery = supabase
          .from('vendor_payment_records')
          .select('amount, property_id, paid_at')
          .eq('landlord_id', landlordId);

        if (portfolioId) {
          vendorPaymentsQuery = vendorPaymentsQuery.eq('portfolio_id', portfolioId);
        }

        const { data: vendorPayments, error: vendorPaymentsError } = await vendorPaymentsQuery;
        
        if (vendorPaymentsError) throw vendorPaymentsError;

        const enhancedMetrics = calculateEnhancedMetrics(properties || [], vendorPayments || []);
        const propertyPerformance = calculatePropertyPerformance(properties || []);
        const maintenanceAnalytics = calculateMaintenanceAnalytics(properties || [], vendorPayments || []);
        const revenueBreakdown = calculateRevenueBreakdown(properties || []);

        return {
          enhancedMetrics,
          propertyPerformance,
          maintenanceAnalytics,
          revenueBreakdown,
          rawProperties: properties
        };
      } catch (error) {
        console.error('Error fetching enhanced analytics:', error);
        throw error;
      }
    },
    enabled: !!landlordId,
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
  });
};

function calculateEnhancedMetrics(properties: any[], vendorPayments: any[]): EnhancedPortfolioMetrics {
  if (!properties.length) {
    return {
      grossMonthlyRevenue: 0,
      netOperatingIncome: 0,
      totalExpenses: 0,
      cashFlow: 0,
      collectionRate: 0,
      expenseRatio: 0,
      totalProperties: 0,
      occupiedProperties: 0,
      vacantProperties: 0,
      occupancyRate: 0,
      averageRent: 0,
      revenuePerSqFt: 0,
      averageDaysToLease: 0,
      maintenanceRequestsCount: 0,
      averageMaintenanceCost: 0,
      renewalRate: 0,
      portfolioHealthScore: 0,
      yearOverYearGrowth: 0,
      profitMargin: 0,
    };
  }

  // Calculate financial metrics
  const grossMonthlyRevenue = properties.reduce((sum, prop) => {
    const propertyRent = prop.monthly_rent || 0;
    const unitsRent = prop.property_units?.reduce((unitSum: number, unit: any) => 
      unitSum + (unit.monthly_rent || 0), 0) || 0;
    return sum + Math.max(propertyRent, unitsRent);
  }, 0);

  // Include vendor payments in total expenses
  const vendorExpenses = vendorPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  const totalExpenses = properties.reduce((sum, prop) => {
    return sum + (prop.mortgage_cost || 0) + (prop.insurance_cost || 0) + 
           (prop.management_fee || 0) + (prop.repair_costs || 0) + 
           (prop.property_taxes || 0);
  }, 0) + vendorExpenses;

  const netOperatingIncome = grossMonthlyRevenue - totalExpenses;
  const cashFlow = netOperatingIncome; // Simplified for now

  // Calculate occupancy metrics
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
  const vacantProperties = totalProperties - occupiedProperties;
  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

  // Calculate averages
  const averageRent = totalProperties > 0 ? grossMonthlyRevenue / totalProperties : 0;
  const totalSqFt = properties.reduce((sum, prop) => sum + (prop.square_feet || 1000), 0);
  const revenuePerSqFt = totalSqFt > 0 ? grossMonthlyRevenue / totalSqFt : 0;

  // Calculate maintenance metrics
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  const maintenanceRequestsCount = allMaintenanceRequests.filter(mr => mr.status !== 'completed').length;
  const averageMaintenanceCost = properties.reduce((sum, prop) => sum + (prop.repair_costs || 0), 0) / totalProperties;

  // Calculate performance indicators
  const expenseRatio = grossMonthlyRevenue > 0 ? (totalExpenses / grossMonthlyRevenue) * 100 : 0;
  const profitMargin = grossMonthlyRevenue > 0 ? (netOperatingIncome / grossMonthlyRevenue) * 100 : 0;
  
  // Portfolio health score (0-100)
  const healthFactors = [
    Math.min(occupancyRate, 100),
    Math.max(0, 100 - expenseRatio),
    Math.min(profitMargin > 0 ? profitMargin * 2 : 0, 100),
    maintenanceRequestsCount === 0 ? 100 : Math.max(0, 100 - (maintenanceRequestsCount * 10))
  ];
  const portfolioHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;

  // Collection rate calculation (simplified)
  const collectionRate = 95; // Placeholder - would need payment data analysis

  return {
    grossMonthlyRevenue,
    netOperatingIncome,
    totalExpenses,
    cashFlow,
    collectionRate,
    expenseRatio,
    totalProperties,
    occupiedProperties,
    vacantProperties,
    occupancyRate,
    averageRent,
    revenuePerSqFt,
    averageDaysToLease: 28, // Placeholder
    maintenanceRequestsCount,
    averageMaintenanceCost,
    renewalRate: 85, // Placeholder
    portfolioHealthScore,
    yearOverYearGrowth: 12, // Placeholder
    profitMargin,
  };
}

function calculatePropertyPerformance(properties: any[]): PropertyPerformanceData[] {
  return properties.map(property => {
    const monthlyRent = property.monthly_rent || 0;
    const totalExpenses = (property.mortgage_cost || 0) + (property.insurance_cost || 0) + 
                         (property.management_fee || 0) + (property.repair_costs || 0) + 
                         (property.property_taxes || 0);
    const netIncome = monthlyRent - totalExpenses;
    const marketValue = property.market_value || monthlyRent * 200; // Estimate
    const roi = marketValue > 0 ? (netIncome * 12 / marketValue) * 100 : 0;

    return {
      propertyId: property.id,
      address: property.address || 'Unknown Address',
      monthlyRent,
      totalExpenses,
      netIncome,
      occupancyStatus: property.status === 'occupied' ? 'occupied' : 
                      property.status === 'maintenance' ? 'maintenance' : 'vacant',
      roi,
      marketValue,
    };
  });
}

function calculateMaintenanceAnalytics(properties: any[], vendorPayments: any[]): MaintenanceAnalytics {
  const allMaintenanceRequests = properties.flatMap(p => p.maintenance_requests || []);
  
  const openRequests = allMaintenanceRequests.filter(mr => mr.status !== 'completed');
  const completedRequests = allMaintenanceRequests.filter(mr => mr.status === 'completed');
  const urgentRequests = allMaintenanceRequests.filter(mr => mr.priority === 'urgent' && mr.status !== 'completed');

  // Calculate average resolution time
  const averageResolutionDays = completedRequests.length > 0 
    ? completedRequests.reduce((sum, mr) => {
        if (mr.completed_date && mr.created_at) {
          const diffTime = new Date(mr.completed_date).getTime() - new Date(mr.created_at).getTime();
          return sum + (diffTime / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0) / completedRequests.length
    : 0;

  // Include vendor payments in total maintenance cost
  const vendorMaintenanceCost = vendorPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalMaintenanceCost = properties.reduce((sum, prop) => sum + (prop.repair_costs || 0), 0) + vendorMaintenanceCost;
  const costPerUnit = properties.length > 0 ? totalMaintenanceCost / properties.length : 0;

  // This month's completed requests
  const thisMonth = new Date();
  const completedThisMonth = completedRequests.filter(mr => {
    if (!mr.completed_date) return false;
    const completedDate = new Date(mr.completed_date);
    return completedDate.getMonth() === thisMonth.getMonth() && 
           completedDate.getFullYear() === thisMonth.getFullYear();
  }).length;

  return {
    totalOpenRequests: openRequests.length,
    averageResolutionDays,
    totalMaintenanceCost,
    costPerUnit,
    urgentRequests: urgentRequests.length,
    completedThisMonth,
    topMaintenanceCategories: [
      { category: 'Plumbing', count: 5, totalCost: 2500 },
      { category: 'HVAC', count: 3, totalCost: 1800 },
      { category: 'Electrical', count: 2, totalCost: 800 },
    ] // Placeholder data
  };
}

function calculateRevenueBreakdown(properties: any[]): RevenueBreakdown {
  const allPayments = properties.flatMap(p => p.rent_payments || []);
  
  const rentRevenue = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const lateFeesRevenue = allPayments.reduce((sum, payment) => sum + (payment.late_fee_amount || 0), 0);
  const otherRevenue = 0; // Placeholder
  const totalRevenue = rentRevenue + lateFeesRevenue + otherRevenue;

  // Generate monthly trend data (placeholder)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: totalRevenue * (0.9 + Math.random() * 0.2),
      expenses: totalRevenue * 0.6 * (0.9 + Math.random() * 0.2),
      netIncome: totalRevenue * 0.4 * (0.9 + Math.random() * 0.2),
    };
  }).reverse();

  return {
    rentRevenue,
    lateFeesRevenue,
    otherRevenue,
    totalRevenue,
    monthlyTrend,
  };
}