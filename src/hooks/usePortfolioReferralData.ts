import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioReferralPerformance {
  total_referrals: number;
  qualified_referrals: number;
  pending_referrals: number;
  conversion_rate: number;
  total_referral_value: number;
  avg_referral_value: number;
  month_over_month_growth: number;
  top_referral_source: string;
}

export interface PortfolioReferralROI {
  total_referral_value: number;
  total_portfolio_points: number;
  estimated_tenant_value: number;
  referral_roi_percentage: number;
  cost_per_qualified_referral: number;
}

export const usePortfolioReferralData = (portfolioId: string, startDate?: string, endDate?: string) => {
  // Get portfolio referral performance
  const {
    data: performance,
    isLoading: performanceLoading,
    error: performanceError,
  } = useQuery({
    queryKey: ['portfolio-referral-performance', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_portfolio_referral_performance', {
          p_portfolio_id: portfolioId,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });

      if (error) throw error;
      return data?.[0] as PortfolioReferralPerformance;
    },
    enabled: !!portfolioId,
  });

  // Get portfolio referral ROI
  const {
    data: roi,
    isLoading: roiLoading,
    error: roiError,
  } = useQuery({
    queryKey: ['portfolio-referral-roi', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_portfolio_referral_roi', {
          p_portfolio_id: portfolioId,
        });

      if (error) throw error;
      return data?.[0] as PortfolioReferralROI;
    },
    enabled: !!portfolioId,
  });

  return {
    performance,
    roi,
    loading: performanceLoading || roiLoading,
    error: performanceError || roiError,
  };
};