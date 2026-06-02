import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Portfolio Performance Hook
export const usePortfolioPerformance = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-performance', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from('properties')
        .select(`
          *,
          rent_payments(*)
        `)
        .eq('portfolio_id', portfolioId)
        .is('deleted_at', null);

      if (error) throw error;

      const totalUnits = properties?.length || 0;
      const occupiedUnits = properties?.filter(p => p.status === 'occupied').length || 0;
      const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits * 100) : 0;
      const totalMonthlyRent = properties?.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) || 0;
      const avgRentPerUnit = totalUnits > 0 ? totalMonthlyRent / totalUnits : 0;

      return {
        totalUnits,
        occupiedUnits,
        vacancyRate,
        totalMonthlyRent,
        avgRentPerUnit
      };
    },
    enabled: !!portfolioId
  });
};

// Collections & Delinquency Hook
export const usePortfolioCollections = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-collections', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          properties!inner(portfolio_id, address, monthly_rent, deleted_at)
        `)
        .eq('properties.portfolio_id', portfolioId)
        .is('properties.deleted_at', null)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) throw error;

      const totalPayments = data?.length || 0;
      const onTimePayments = data?.filter(r => r.days_late === 0).length || 0;
      const latePayments = data?.filter(r => r.days_late > 0).length || 0;
      const totalCollected = data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const totalLateFees = data?.reduce((sum, r) => sum + (r.late_fee_amount || 0), 0) || 0;
      const onTimePaymentRate = totalPayments > 0 ? (onTimePayments / totalPayments * 100) : 0;
      const avgDaysLate = latePayments > 0 ? 
        data?.filter(r => r.days_late > 0).reduce((sum, r) => sum + r.days_late, 0) / latePayments : 0;

      return {
        totalPayments,
        onTimePayments,
        latePayments,
        totalCollected,
        totalLateFees,
        onTimePaymentRate,
        avgDaysLate
      };
    },
    enabled: !!portfolioId
  });
};

// Lease Pipeline Hook
export const usePortfolioLeasePipeline = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio-lease-pipeline', portfolioId],
    queryFn: async () => {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .is('deleted_at', null);

      if (error) throw error;

      const now = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const expiring30Days = properties?.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= thirtyDaysFromNow
      ).length || 0;

      const expiring60Days = properties?.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= sixtyDaysFromNow
      ).length || 0;

      const expiring90Days = properties?.filter(p => 
        p.lease_end_date && 
        new Date(p.lease_end_date) >= now && 
        new Date(p.lease_end_date) <= ninetyDaysFromNow
      ).length || 0;

      const availableUnits = properties?.filter(p => p.status === 'available').length || 0;
      const avgDaysOnMarket = properties?.filter(p => p.status === 'available')
        .reduce((sum, p) => {
          const daysSince = Math.ceil((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24));
          return sum + daysSince;
        }, 0) / (availableUnits || 1);

      return {
        expiring30Days,
        expiring60Days,
        expiring90Days,
        availableUnits,
        avgDaysOnMarket: avgDaysOnMarket || 0
      };
    },
    enabled: !!portfolioId
  });
};

// Maintenance Efficiency Hook
export const usePortfolioMaintenanceEfficiency = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-maintenance', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner(portfolio_id, monthly_rent, deleted_at)
        `)
        .eq('properties.portfolio_id', portfolioId)
        .is('properties.deleted_at', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const totalRequests = data?.length || 0;
      const openRequests = data?.filter(r => r.status !== 'completed').length || 0;
      const completedRequests = data?.filter(r => r.status === 'completed').length || 0;

      const avgResolutionDays = completedRequests > 0 ? 
        data?.filter(r => r.status === 'completed' && r.completed_date)
          .reduce((sum, r) => {
            const created = new Date(r.created_at);
            const completed = new Date(r.completed_date);
            return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 3600 * 24));
          }, 0) / completedRequests : 0;

      const avgOpenRequestAge = openRequests > 0 ?
        data?.filter(r => r.status !== 'completed')
          .reduce((sum, r) => {
            const created = new Date(r.created_at);
            const now = new Date();
            return sum + Math.ceil((now.getTime() - created.getTime()) / (1000 * 3600 * 24));
          }, 0) / openRequests : 0;

      const totalMaintenanceCost = data?.reduce((sum, r) => sum + (r.estimated_cost || 0), 0) || 0;

      return {
        totalRequests,
        openRequests,
        completedRequests,
        avgResolutionDays,
        avgOpenRequestAge,
        totalMaintenanceCost
      };
    },
    enabled: !!portfolioId
  });
};