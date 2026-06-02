
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentAnalyticsData {
  // HAP Payments
  hapTotalExpected: number;
  hapTotalReceived: number;
  hapCurrentMonthExpected: number;
  hapCurrentMonthReceived: number;
  hapLatePayments: number;
  hapMissedPayments: number;
  hapCollectionRate: number;
  propertiesWithVouchers: number;
  
  // Tenant Payments
  tenantTotalExpected: number;
  tenantTotalReceived: number;
  tenantCurrentMonthExpected: number;
  tenantCurrentMonthReceived: number;
  tenantLatePayments: number;
  tenantMissedPayments: number;
  tenantCollectionRate: number;
  
  // Combined Totals
  totalExpected: number;
  totalReceived: number;
  currentMonthExpected: number;
  currentMonthReceived: number;
  overallCollectionRate: number;
  totalLatePayments: number;
  totalMissedPayments: number;
  totalProperties: number;
}

export const usePaymentAnalytics = (landlordId: string, portfolioId?: string) => {
  // Debug logging with portfolio isolation priority
  console.log('🔍 usePaymentAnalytics hook render (Portfolio Isolation Priority):', {
    landlordId,
    portfolioId,
    portfolioMode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
    timestamp: new Date().toISOString()
  });

  const fetchPaymentAnalytics = async (): Promise<PaymentAnalyticsData> => {
    console.log('🚀 fetchPaymentAnalytics called (Portfolio Priority):', {
      landlordId,
      portfolioId,
      mode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
      timestamp: new Date().toISOString()
    });

    // Priority 1: Must have valid landlordId
    if (!landlordId) {
      console.log('❌ No landlordId provided, skipping fetch');
      throw new Error('No landlordId provided');
    }

    // Priority 2: Portfolio Isolation - require explicit portfolio selection
    if (!portfolioId) {
      console.log('❌ No portfolioId provided - Portfolio Isolation Priority requires explicit selection');
      return {
        hapTotalExpected: 0,
        hapTotalReceived: 0,
        hapCurrentMonthExpected: 0,
        hapCurrentMonthReceived: 0,
        hapLatePayments: 0,
        hapMissedPayments: 0,
        hapCollectionRate: 0,
        propertiesWithVouchers: 0,
        tenantTotalExpected: 0,
        tenantTotalReceived: 0,
        tenantCurrentMonthExpected: 0,
        tenantCurrentMonthReceived: 0,
        tenantLatePayments: 0,
        tenantMissedPayments: 0,
        tenantCollectionRate: 0,
        totalExpected: 0,
        totalReceived: 0,
        currentMonthExpected: 0,
        currentMonthReceived: 0,
        overallCollectionRate: 0,
        totalLatePayments: 0,
        totalMissedPayments: 0,
        totalProperties: 0
      };
    }

      // Build properties query with Portfolio Isolation Priority
      let query = supabase
        .from('properties')
        .select('id, monthly_rent, has_voucher, status')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      // Portfolio Isolation Priority: Fix "everything" view to only include assigned portfolios
      if (portfolioId === 'everything') {
        console.log('🌍 EVERYTHING VIEW: Fetching only properties assigned to created portfolios');
        // FIXED: Only include properties that are assigned to portfolios (exclude unassigned)
        query = query.not('portfolio_id', 'is', null);
      } else {
        console.log('🏢 PORTFOLIO ISOLATED: Filtering by portfolio:', portfolioId);
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties, error: propertiesError } = await query;

      if (propertiesError) throw propertiesError;

      if (!properties || properties.length === 0) {
        console.log('📊 No properties found for portfolio:', {
          portfolioId,
          mode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED'
        });
        
        return {
          hapTotalExpected: 0,
          hapTotalReceived: 0,
          hapCurrentMonthExpected: 0,
          hapCurrentMonthReceived: 0,
          hapLatePayments: 0,
          hapMissedPayments: 0,
          hapCollectionRate: 0,
          propertiesWithVouchers: 0,
          tenantTotalExpected: 0,
          tenantTotalReceived: 0,
          tenantCurrentMonthExpected: 0,
          tenantCurrentMonthReceived: 0,
          tenantLatePayments: 0,
          tenantMissedPayments: 0,
          tenantCollectionRate: 0,
          totalExpected: 0,
          totalReceived: 0,
          currentMonthExpected: 0,
          currentMonthReceived: 0,
          overallCollectionRate: 0,
          totalLatePayments: 0,
          totalMissedPayments: 0,
          totalProperties: 0
        };
      }

      const propertyIds = properties.map(p => p.id);
      const propertiesWithVouchers = properties.filter(p => p.has_voucher);
      const voucherPropertyIds = propertiesWithVouchers.map(p => p.id);

      // Get HAP payments for voucher properties (maintaining all existing logic)
      const { data: hapPayments, error: hapPaymentsError } = await supabase
        .from('hap_payments')
        .select('*')
        .in('property_id', voucherPropertyIds);

      if (hapPaymentsError) throw hapPaymentsError;

      // Get tenant payments for all properties (maintaining all existing logic)
      const { data: tenantPayments, error: tenantPaymentsError } = await supabase
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIds);

      if (tenantPaymentsError) throw tenantPaymentsError;

      // Calculate current month metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthHapPayments = hapPayments?.filter(p => {
        const paymentDate = new Date(p.payment_period_start);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }) || [];

      const currentMonthTenantPayments = tenantPayments?.filter(p => {
        const paymentDate = new Date(p.due_date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }) || [];

      // HAP Analytics (preserving all existing calculations)
      const hapTotalExpected = hapPayments?.reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0;
      const hapTotalReceived = hapPayments?.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0) || 0;
      const hapCurrentMonthExpected = currentMonthHapPayments.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
      const hapCurrentMonthReceived = currentMonthHapPayments.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);
      const hapLatePayments = hapPayments?.filter(p => p.payment_status === 'late').length || 0;
      const hapMissedPayments = hapPayments?.filter(p => p.payment_status === 'missing').length || 0;
      const hapCollectionRate = hapTotalExpected > 0 ? (hapTotalReceived / hapTotalExpected) * 100 : 0;

      // Tenant Analytics (preserving all existing calculations)
      const tenantTotalExpected = tenantPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const tenantTotalReceived = tenantPayments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const tenantCurrentMonthExpected = currentMonthTenantPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const tenantCurrentMonthReceived = currentMonthTenantPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
      const tenantLatePayments = tenantPayments?.filter(p => p.days_late && p.days_late > 0).length || 0;
      const tenantMissedPayments = tenantPayments?.filter(p => p.status === 'overdue').length || 0;
      const tenantCollectionRate = tenantTotalExpected > 0 ? (tenantTotalReceived / tenantTotalExpected) * 100 : 0;

      // Combined Analytics (preserving all existing calculations)
      const totalExpected = hapTotalExpected + tenantTotalExpected;
      const totalReceived = hapTotalReceived + tenantTotalReceived;
      const currentMonthExpected = hapCurrentMonthExpected + tenantCurrentMonthExpected;
      const currentMonthReceived = hapCurrentMonthReceived + tenantCurrentMonthReceived;
      const overallCollectionRate = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

      const newData = {
        hapTotalExpected,
        hapTotalReceived,
        hapCurrentMonthExpected,
        hapCurrentMonthReceived,
        hapLatePayments,
        hapMissedPayments,
        hapCollectionRate,
        propertiesWithVouchers: propertiesWithVouchers.length,
        tenantTotalExpected,
        tenantTotalReceived,
        tenantCurrentMonthExpected,
        tenantCurrentMonthReceived,
        tenantLatePayments,
        tenantMissedPayments,
        tenantCollectionRate,
        totalExpected,
        totalReceived,
        currentMonthExpected,
        currentMonthReceived,
        overallCollectionRate,
        totalLatePayments: hapLatePayments + tenantLatePayments,
        totalMissedPayments: hapMissedPayments + tenantMissedPayments,
        totalProperties: properties.length
      };
      
      console.log('✅ Portfolio Isolation Priority - Setting analytics data:', {
        portfolioId,
        mode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
        totalProperties: newData.totalProperties,
        totalReceived: newData.totalReceived,
        totalExpected: newData.totalExpected,
        timestamp: new Date().toISOString()
      });
      
      return newData;
  };

  // Use React Query with portfolio-specific cache key for proper cache isolation
  const queryResult = useQuery({
    queryKey: ['paymentAnalytics', landlordId, portfolioId],
    queryFn: fetchPaymentAnalytics,
    enabled: !!(landlordId && portfolioId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in newer versions)
  });

  console.log('📊 React Query result (Portfolio Isolation Priority):', {
    landlordId,
    portfolioId,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    hasData: !!queryResult.data,
    mode: portfolioId === 'everything' ? 'EVERYTHING_VIEW' : 'PORTFOLIO_ISOLATED',
    timestamp: new Date().toISOString()
  });

  return {
    data: queryResult.data || null,
    loading: queryResult.isLoading,
    error: queryResult.error ? (queryResult.error as Error).message : null,
    refetch: queryResult.refetch
  };
};
