
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface PortfolioMetrics {
  unit_count: number;
  occupancy_rate: number;
  monthly_profit: number;
  gross_monthly_rent: number;
}

export const usePortfolioMetrics = (portfolioId: string) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    // IMPORTANT: include userId in the key so that switching accounts does
    // NOT serve the previous account's metrics from cache.
    queryKey: ['portfolio-metrics', userId ?? 'anon', portfolioId],
    queryFn: async () => {
      try {
        // Convert "everything" to null for database function
        const portfolioParam = portfolioId === 'everything' ? null : portfolioId;

        // Use the database function to get portfolio metrics with explicit user ID
        const { data, error } = await supabase.rpc('get_portfolio_metrics', {
          p_portfolio_id: portfolioParam,
          p_user_id: userId,
        });

        if (error) throw error;

        // The function returns an array with one row, so get the first item
        const metrics = data?.[0];

        if (!metrics) {
          return {
            unit_count: 0,
            occupancy_rate: 0,
            monthly_profit: 0,
            gross_monthly_rent: 0,
          } as PortfolioMetrics;
        }

        return {
          unit_count: metrics.unit_count || 0,
          occupancy_rate: metrics.occupancy_rate || 0,
          monthly_profit: metrics.monthly_profit || 0,
          gross_monthly_rent: metrics.gross_monthly_rent || 0,
        } as PortfolioMetrics;
      } catch (error) {
        console.error('Error fetching portfolio metrics:', error);
        throw error;
      }
    },
    enabled: !!portfolioId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
