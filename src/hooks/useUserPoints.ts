import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePortfolioId } from '@/utils/portfolio';

export interface UserPoint {
  id: string;
  user_id: string;
  portfolio_id: string;
  portfolio_points_id: string;
  points_awarded: number;
  distribution_percent: number;
  source_event_type: string;
  distribution_details: any;
  created_at: string;
  processed_at: string;
  notes?: string;
}

export interface UserPointsSummary {
  total_points: number;
  points_this_month: number;
  points_last_month: number;
  portfolio_count: number;
  recent_activity_count: number;
  spendable_points?: number;
}

export const useUserPoints = (userId: string, portfolioId?: string) => {
  const queryClient = useQueryClient();

  // Get user's distributed points from portfolio_user_points
  const {
    data: portfolioPoints,
    isLoading: pointsLoading,
    error: pointsError,
  } = useQuery({
    queryKey: ['user-points', userId, portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('portfolio_user_points')
        .select('*')
        .eq('user_id', userId)
        .order('processed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      const normalizedPortfolioId = normalizePortfolioId(portfolioId);
      if (normalizedPortfolioId) {
        query = query.eq('portfolio_id', normalizedPortfolioId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        portfolio_id: row.portfolio_id,
        portfolio_points_id: row.portfolio_points_id,
        points_awarded: row.points_awarded,
        distribution_percent: row.distribution_percent,
        source_event_type: row.source_event_type,
        distribution_details: row.distribution_details,
        created_at: row.created_at,
        processed_at: row.processed_at || row.created_at,
        notes: row.notes,
      }));
    },
    enabled: !!userId,
  });

  // Get user's points from points_history (rent proofs, admin adjustments, etc.)
  const {
    data: rentPoints,
    isLoading: rentPointsLoading,
    error: rentPointsError,
  } = useQuery({
    queryKey: ['user-rent-points', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Merge both sources into a unified activity feed
  const userPoints = useMemo(() => {
    const portfolio = (portfolioPoints || []) as UserPoint[];
    const rent = (rentPoints || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      portfolio_id: '',
      portfolio_points_id: '',
      points_awarded: Number(row.points_change) || 0,
      distribution_percent: 100,
      source_event_type: row.event_type || 'rent_payment',
      distribution_details: null,
      created_at: row.created_at || row.timestamp,
      processed_at: row.timestamp || row.created_at,
      notes: row.notes,
    } as UserPoint));

    // Combine and sort by most recent first
    return [...portfolio, ...rent].sort(
      (a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
    );
  }, [portfolioPoints, rentPoints]);

  // Get user's points summary from RPC, then merge with points_history totals
  const {
    data: rpcSummary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['user-points-summary', userId, portfolioId],
    queryFn: async () => {
      try {
        const portfolioIdParam = normalizePortfolioId(portfolioId);
        const { data, error } = await supabase.rpc('get_user_points_summary' as any, {
          p_user_id: userId,
          p_portfolio_id: portfolioIdParam
        });
        
        if (error) {
          console.error('RPC Error from get_user_points_summary:', error);
          throw error;
        }
        
        return Array.isArray(data) ? data[0] : data as UserPointsSummary & { spendable_points?: number };
      } catch (err) {
        console.error('Failed to fetch user points summary:', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Merge the RPC summary with points_history totals
  const pointsSummary = useMemo(() => {
    const base: UserPointsSummary = rpcSummary || {
      total_points: 0,
      points_this_month: 0,
      points_last_month: 0,
      portfolio_count: 0,
      recent_activity_count: 0,
      spendable_points: 0,
    };

    if (!rentPoints || rentPoints.length === 0) return base;

    // Sum all points_change from points_history for the total rent points
    const rentTotal = rentPoints.reduce((sum: number, r: any) => sum + (Number(r.points_change) || 0), 0);

    // Calculate this month's rent points
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const rentThisMonth = rentPoints
      .filter((r: any) => new Date(r.timestamp || r.created_at) >= startOfMonth)
      .reduce((sum: number, r: any) => sum + (Number(r.points_change) || 0), 0);

    // Last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rentLastMonth = rentPoints
      .filter((r: any) => {
        const d = new Date(r.timestamp || r.created_at);
        return d >= startOfLastMonth && d < startOfMonth;
      })
      .reduce((sum: number, r: any) => sum + (Number(r.points_change) || 0), 0);

    return {
      ...base,
      total_points: (base.total_points || 0) + rentTotal,
      points_this_month: (base.points_this_month || 0) + rentThisMonth,
      points_last_month: (base.points_last_month || 0) + rentLastMonth,
      recent_activity_count: (base.recent_activity_count || 0) + rentPoints.length,
      spendable_points: ((base as any).spendable_points || 0) + rentTotal,
    };
  }, [rpcSummary, rentPoints]);

  // Distribute portfolio points mutation using RPC
  const distributePointsMutation = useMutation({
    mutationFn: async (portfolioPointsId: string) => {
      const { data, error } = await supabase.rpc('distribute_portfolio_points' as any, {
        p_portfolio_points_id: portfolioPointsId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['user-points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['user-rent-points'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-points'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-points-summary'] });
    },
  });

  // Set up realtime subscription for user points
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-points-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_user_points',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-points', userId, portfolioId] });
          queryClient.invalidateQueries({ queryKey: ['user-points-summary', userId, portfolioId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_history',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-rent-points', userId] });
          queryClient.invalidateQueries({ queryKey: ['user-points-summary', userId, portfolioId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, portfolioId, queryClient]);

  return {
    userPoints,
    pointsSummary,
    loading: pointsLoading || summaryLoading || rentPointsLoading,
    error: pointsError || summaryError || rentPointsError,
    distributePoints: distributePointsMutation,
  };
};
