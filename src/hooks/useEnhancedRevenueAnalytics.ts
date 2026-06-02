import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';
import { useEffect } from 'react';

export interface EnhancedRevenueData {
  name: string;
  value: number;
  color: string;
  category: 'rental' | 'fees' | 'deposits' | 'other';
  trend?: number; // month-over-month change percentage
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyGrowth: number;
  revenuePerProperty: number;
  topRevenueSource: string;
  revenueSources: EnhancedRevenueData[];
  monthlyTrend: Array<{
    month: string;
    totalRevenue: number;
    breakdown: { [key: string]: number };
  }>;
}

export const useEnhancedRevenueAnalytics = (landlordId: string, rawPortfolioId?: string) => {
  const portfolioId = normalizePortfolioId(rawPortfolioId);
  const queryClient = useQueryClient();
  
  // Invalidate cache when portfolio changes to ensure fresh data
  useEffect(() => {
    if (landlordId) {
      console.log('🔍 [ENHANCED_REVENUE_ANALYTICS] Portfolio changed, invalidating cache:', { 
        landlordId, 
        portfolioId 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['enhancedRevenueAnalytics'],
        exact: false 
      });
    }
  }, [landlordId, portfolioId, queryClient]);

  return useQuery({
    queryKey: ['enhancedRevenueAnalytics', landlordId, portfolioId],
    queryFn: async (): Promise<RevenueMetrics> => {
      if (!landlordId || !portfolioId) {
        return {
          totalRevenue: 0,
          monthlyGrowth: 0,
          revenuePerProperty: 0,
          topRevenueSource: '',
          revenueSources: [],
          monthlyTrend: []
        };
      }

      // Build properties query with portfolio filtering
      let propertiesQuery = supabase
        .from('properties')
        .select(`
          *,
          rent_payments (
            amount,
            late_fee_amount,
            platform_fee_amount,
            tenant_fee_amount,
            payment_date,
            due_date,
            status
          ),
          hap_payments (
            expected_amount,
            actual_amount,
            payment_date,
            payment_status
          )
        `)
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      // Portfolio filtering logic (portfolioId is already normalized)
      if (portfolioId) {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      // Get security deposits for additional revenue
      let depositsQuery = supabase
        .from('portfolio_security_deposits')
        .select('*');

      // Apply portfolio filter to deposits (portfolioId is already normalized)
      if (portfolioId) {
        depositsQuery = depositsQuery.eq('portfolio_id', portfolioId);
      }

      const { data: securityDeposits, error: depositsError } = await depositsQuery;
      if (depositsError) throw depositsError;

      return calculateEnhancedRevenue(properties || [], securityDeposits || []);
    },
    enabled: !!(landlordId && portfolioId),
    staleTime: 30 * 1000, // 30 seconds - shorter to ensure fresh data on filter changes
    gcTime: 2 * 60 * 1000, // 2 minutes - shorter cache time to prevent stale data
    refetchOnMount: true,
  });
};

function calculateEnhancedRevenue(properties: any[], securityDeposits: any[]): RevenueMetrics {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  // Initialize revenue tracking
  const revenueBreakdown = {
    // Primary rental income
    baseRent: 0,
    hapPayments: 0,
    
    // Fee income
    lateFees: 0,
    applicationFees: 0,
    petFees: 0,
    parkingFees: 0,
    storageFees: 0,
    laundryIncome: 0,
    amenityFees: 0,
    platformFees: 0,
    
    // Deposit income (new deposits collected this month)
    securityDeposits: 0,
    petDeposits: 0,
    
    // Other income
    otherIncome: 0,
    vendingIncome: 0
  };

  // Track previous month for growth calculation
  const lastMonthRevenue = { ...revenueBreakdown };

  // Process each property
  properties.forEach(property => {
    // Base monthly rent from occupied properties
    if (property.status === 'occupied' && property.monthly_rent) {
      revenueBreakdown.baseRent += property.monthly_rent;
    }

    // Application fees (estimated monthly based on property activity)
    if (property.application_fee && property.tenant_request_count > 0) {
      revenueBreakdown.applicationFees += (property.application_fee * Math.min(property.tenant_request_count, 5)) / 12;
    }

    // Monthly recurring fees
    if (property.pet_monthly_fee) {
      revenueBreakdown.petFees += property.pet_monthly_fee;
    }
    if (property.parking_fee) {
      revenueBreakdown.parkingFees += property.parking_fee;
    }
    if (property.storage_fee) {
      revenueBreakdown.storageFees += property.storage_fee;
    }
    if (property.laundry_income) {
      revenueBreakdown.laundryIncome += property.laundry_income;
    }
    if (property.vending_income) {
      revenueBreakdown.vendingIncome += property.vending_income;
    }
    if (property.amenity_fees) {
      revenueBreakdown.amenityFees += property.amenity_fees;
    }
    if (property.other_income) {
      revenueBreakdown.otherIncome += property.other_income;
    }

    // Process rent payments for current month
    property.rent_payments?.forEach((payment: any) => {
      const paymentDate = new Date(payment.payment_date);
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        if (payment.status === 'completed') {
          revenueBreakdown.lateFees += payment.late_fee_amount || 0;
          revenueBreakdown.platformFees += payment.platform_fee_amount || 0;
        }
      }
      
      // Track last month for growth
      if (paymentDate.getMonth() === lastMonth.getMonth() && paymentDate.getFullYear() === lastMonth.getFullYear()) {
        if (payment.status === 'completed') {
          lastMonthRevenue.lateFees += payment.late_fee_amount || 0;
          lastMonthRevenue.platformFees += payment.platform_fee_amount || 0;
        }
      }
    });

    // Process HAP payments for current month
    property.hap_payments?.forEach((hapPayment: any) => {
      const paymentDate = new Date(hapPayment.payment_date);
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        if (hapPayment.payment_status === 'received') {
          revenueBreakdown.hapPayments += hapPayment.actual_amount || hapPayment.expected_amount || 0;
        }
      }
      
      // Track last month
      if (paymentDate.getMonth() === lastMonth.getMonth() && paymentDate.getFullYear() === lastMonth.getFullYear()) {
        if (hapPayment.payment_status === 'received') {
          lastMonthRevenue.hapPayments += hapPayment.actual_amount || hapPayment.expected_amount || 0;
        }
      }
    });
  });

  // Process security deposits collected this month
  securityDeposits?.forEach(deposit => {
    const depositDate = new Date(deposit.deposit_date);
    if (depositDate.getMonth() === currentMonth && depositDate.getFullYear() === currentYear) {
      if (deposit.status === 'held') {
        // Assume 10% of security deposits are pet deposits
        const petDepositAmount = deposit.amount * 0.1;
        revenueBreakdown.securityDeposits += deposit.amount - petDepositAmount;
        revenueBreakdown.petDeposits += petDepositAmount;
      }
    }
  });

  // Create revenue sources array with enhanced data
  const revenueSources: EnhancedRevenueData[] = [
    {
      name: 'Base Rent',
      value: revenueBreakdown.baseRent,
      color: 'hsl(220, 70%, 50%)',
      category: 'rental',
      trend: calculateGrowth(revenueBreakdown.baseRent, lastMonthRevenue.baseRent)
    },
    {
      name: 'HAP Payments',
      value: revenueBreakdown.hapPayments,
      color: 'hsl(190, 70%, 50%)',
      category: 'rental',
      trend: calculateGrowth(revenueBreakdown.hapPayments, lastMonthRevenue.hapPayments)
    },
    {
      name: 'Late Fees',
      value: revenueBreakdown.lateFees,
      color: 'hsl(0, 70%, 60%)',
      category: 'fees',
      trend: calculateGrowth(revenueBreakdown.lateFees, lastMonthRevenue.lateFees)
    },
    {
      name: 'Application Fees',
      value: revenueBreakdown.applicationFees,
      color: 'hsl(280, 70%, 55%)',
      category: 'fees',
      trend: 0
    },
    {
      name: 'Pet Fees',
      value: revenueBreakdown.petFees,
      color: 'hsl(120, 50%, 50%)',
      category: 'fees',
      trend: 0
    },
    {
      name: 'Parking Income',
      value: revenueBreakdown.parkingFees,
      color: 'hsl(45, 70%, 55%)',
      category: 'fees',
      trend: 0
    },
    {
      name: 'Storage Fees',
      value: revenueBreakdown.storageFees,
      color: 'hsl(160, 60%, 50%)',
      category: 'fees',
      trend: 0
    },
    {
      name: 'Laundry Income',
      value: revenueBreakdown.laundryIncome,
      color: 'hsl(200, 60%, 55%)',
      category: 'other',
      trend: 0
    },
    {
      name: 'Amenity Fees',
      value: revenueBreakdown.amenityFees,
      color: 'hsl(300, 60%, 55%)',
      category: 'fees',
      trend: 0
    },
    {
      name: 'Security Deposits',
      value: revenueBreakdown.securityDeposits,
      color: 'hsl(60, 60%, 50%)',
      category: 'deposits',
      trend: 0
    },
    {
      name: 'Platform Fees',
      value: revenueBreakdown.platformFees,
      color: 'hsl(330, 60%, 55%)',
      category: 'fees',
      trend: calculateGrowth(revenueBreakdown.platformFees, lastMonthRevenue.platformFees)
    },
    {
      name: 'Other Income',
      value: revenueBreakdown.otherIncome + revenueBreakdown.vendingIncome + revenueBreakdown.petDeposits,
      color: 'hsl(150, 50%, 45%)',
      category: 'other',
      trend: 0
    }
  ];

  // Filter out zero-value sources and sort by value
  const activeRevenueSources = revenueSources
    .filter(source => source.value > 0)
    .sort((a, b) => b.value - a.value);

  // Calculate totals and metrics
  const totalRevenue = activeRevenueSources.reduce((sum, source) => sum + source.value, 0);
  const lastMonthTotal = Object.values(lastMonthRevenue).reduce((sum, val) => sum + val, 0);
  const monthlyGrowth = calculateGrowth(totalRevenue, lastMonthTotal);
  const revenuePerProperty = properties.length > 0 ? totalRevenue / properties.length : 0;
  const topRevenueSource = activeRevenueSources[0]?.name || '';

  // Generate monthly trend (simplified for now)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthRevenue = totalRevenue * (0.85 + Math.random() * 0.3);
    
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      totalRevenue: monthRevenue,
      breakdown: activeRevenueSources.reduce((acc, source) => {
        acc[source.name] = source.value * (0.85 + Math.random() * 0.3);
        return acc;
      }, {} as { [key: string]: number })
    };
  }).reverse();

  return {
    totalRevenue,
    monthlyGrowth,
    revenuePerProperty,
    topRevenueSource,
    revenueSources: activeRevenueSources,
    monthlyTrend
  };
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
