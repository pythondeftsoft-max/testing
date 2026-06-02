import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PointsSystemOverview {
  total_points_distributed: number;
  active_users: number;
  monthly_growth: number | null;
  total_value: number;
  net_points_balance: number;
}

interface PointsMonthlyTrend {
  month_start: string;
  points_awarded: number;
  unique_users: number;
}

interface PointsRecentActivity {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  event_type: string;
  points_change: number;
  points_balance_after: number;
  notes: string;
  created_at: string;
}

interface PointsLeaderboard {
  user_id: string;
  user_name: string;
  total_points: number;
}

export const useAdminPointsOverview = () => {
  return useQuery({
    queryKey: ['admin-points-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_points_system_overview_admin');
      if (error) throw error;
      return data?.[0] as PointsSystemOverview;
    },
  });
};

export const useAdminPointsMonthlyTrends = (months: number = 12) => {
  return useQuery({
    queryKey: ['admin-points-monthly-trends', months],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_points_monthly_trends_admin', { months });
      if (error) throw error;
      return data as PointsMonthlyTrend[];
    },
  });
};

export const useAdminPointsRecentActivity = (limit: number = 20) => {
  return useQuery({
    queryKey: ['admin-points-recent-activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_points_recent_activity_admin', { activity_limit: limit });
      if (error) throw error;
      return data as PointsRecentActivity[];
    },
  });
};

export const useAdminPointsLeaderboard = (period: string = '30d', limit: number = 10) => {
  return useQuery({
    queryKey: ['admin-points-leaderboard', period, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_points_leaderboard_admin', { 
        period, 
        limit_count: limit 
      });
      if (error) throw error;
      return data as PointsLeaderboard[];
    },
  });
};