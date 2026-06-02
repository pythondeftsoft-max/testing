import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string | null;
  user_id: string;
  snapshot_date: string;
  total_real_estate_value: number;
  total_assets_value: number;
  total_liabilities: number;
  net_worth: number;
  property_count: number;
  asset_count: number;
  occupancy_rate: number;
  monthly_rental_income: number;
  monthly_expenses: number;
  net_operating_income: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const usePortfolioSnapshots = (userId?: string, portfolioId?: string, days = 90) => {
  return useQuery({
    queryKey: ['portfolio-snapshots', userId, portfolioId, days],
    queryFn: async () => {
      if (!userId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('portfolio_value_snapshots')
        .select('*')
        .eq('user_id', userId)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      // Filter by portfolio if specified
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      } else if (portfolioId === 'everything') {
        query = query.is('portfolio_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching portfolio snapshots:', error);
        throw error;
      }

      return data as PortfolioSnapshot[];
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};

export const useLatestPortfolioSnapshot = (userId?: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['latest-portfolio-snapshot', userId, portfolioId],
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('portfolio_value_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1);

      // Filter by portfolio if specified
      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      } else if (portfolioId === 'everything') {
        query = query.is('portfolio_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching latest portfolio snapshot:', error);
        throw error;
      }

      return data?.[0] as PortfolioSnapshot | null;
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
};