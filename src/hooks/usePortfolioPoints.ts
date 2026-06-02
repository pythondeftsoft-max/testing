
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioPoint {
  id: string;
  portfolio_id: string;
  property_id?: string;
  tenant_id?: string;
  points_awarded: number;
  created_at: string;
  source_event_type: string;
  notes?: string;
  processed_by?: string;
}

export interface PortfolioPointsSummary {
  total_points: number;
  points_this_month: number;
  points_last_month: number;
  top_source_event: string;
  recent_activity_count: number;
}

export interface AwardPointsParams {
  portfolio_id: string;
  source_event_type: string;
  points_awarded: number;
  property_id?: string;
  tenant_id?: string;
  notes?: string;
}

export const usePortfolioPoints = (portfolioId: string) => {
  const queryClient = useQueryClient();

  // Get portfolio points history
  const {
    data: portfolioPoints,
    isLoading: pointsLoading,
    error: pointsError,
  } = useQuery({
    queryKey: ['portfolio-points', portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('portfolio_points')
        .select(`
          *,
          properties(address),
          profiles!portfolio_points_processed_by_fkey(first_name, last_name)
        `);
      
      // Only filter by portfolio_id if not showing "everything"
      if (portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as PortfolioPoint[];
    },
    enabled: !!portfolioId,
  });

  // Get portfolio points summary
  const {
    data: pointsSummaryFromDb,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['portfolio-points-summary', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_points_summary', {
        p_portfolio_id: portfolioId,
      });

      if (error) throw error;
      return data?.[0] as PortfolioPointsSummary;
    },
    enabled: !!portfolioId && portfolioId !== 'everything',
  });

  // Compute summary client-side for "everything" view
  const computedSummary = useMemo(() => {
    if (portfolioId !== 'everything' || !portfolioPoints) {
      return null;
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalPoints = portfolioPoints.reduce((sum, p) => sum + p.points_awarded, 0);
    
    const pointsThisMonth = portfolioPoints
      .filter(p => new Date(p.created_at) >= thisMonthStart)
      .reduce((sum, p) => sum + p.points_awarded, 0);
    
    const pointsLastMonth = portfolioPoints
      .filter(p => {
        const date = new Date(p.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, p) => sum + p.points_awarded, 0);

    const recentActivityCount = portfolioPoints.filter(
      p => new Date(p.created_at) >= thirtyDaysAgo
    ).length;

    // Find top source event
    const eventCounts = portfolioPoints.reduce((acc, p) => {
      acc[p.source_event_type] = (acc[p.source_event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSourceEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      total_points: totalPoints,
      points_this_month: pointsThisMonth,
      points_last_month: pointsLastMonth,
      top_source_event: topSourceEvent,
      recent_activity_count: recentActivityCount,
    } as PortfolioPointsSummary;
  }, [portfolioId, portfolioPoints]);

  // Use computed summary for "everything", otherwise use DB summary
  const pointsSummary = portfolioId === 'everything' ? computedSummary : pointsSummaryFromDb;

  // Award points mutation
  const awardPointsMutation = useMutation({
    mutationFn: async (params: AwardPointsParams) => {
      const { data, error } = await supabase.rpc('award_portfolio_points', {
        p_portfolio_id: params.portfolio_id,
        p_source_event_type: params.source_event_type,
        p_points_awarded: params.points_awarded,
        p_property_id: params.property_id || null,
        p_tenant_id: params.tenant_id || null,
        p_notes: params.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-points', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-points-summary', portfolioId] });
    },
  });

  // Set up realtime subscription for portfolio points
  useEffect(() => {
    if (!portfolioId || portfolioId === 'everything') return;

    const channel = supabase
      .channel('portfolio-points-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_points',
          filter: `portfolio_id=eq.${portfolioId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['portfolio-points', portfolioId] });
          queryClient.invalidateQueries({ queryKey: ['portfolio-points-summary', portfolioId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [portfolioId, queryClient]);

  return {
    portfolioPoints,
    pointsSummary,
    loading: pointsLoading || summaryLoading,
    error: pointsError || summaryError,
    awardPoints: awardPointsMutation,
  };
};
