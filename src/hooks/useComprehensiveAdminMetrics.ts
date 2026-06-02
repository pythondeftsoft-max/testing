import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComprehensiveMetrics {
  properties: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    average_rent: number;
    occupancy_rate: number;
    vacancy_cost: number;
    units_breakdown: Record<string, number>;
  };
  users: {
    landlords: number;
    tenants: number;
    total: number;
    signups_this_month: number;
    signups_last_month: number;
    by_user_type: Record<string, number>;
  };
  applications: {
    total: number;
    by_status: Record<string, number>;
    this_month: number;
  };
  maintenance: {
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    avg_completion_days: number | null;
  };
  financial: {
    total_collected: number;
    total_pending: number;
    total_late: number;
    payment_count: number;
    collection_rate: number;
    on_time_rate: number;
    late_payment_count: number;
    avg_days_late: number | null;
  };
  messages: {
    total: number;
    this_month: number;
    by_sender_role: Record<string, number>;
  };
  portfolios: {
    total: number;
    total_assets: number;
    avg_properties: number | null;
  };
  referrals: {
    total: number;
    by_status: Record<string, number>;
    conversion_rate: number;
  };
  points: {
    total_distributed: number;
    active_users: number;
    this_month: number;
  };
  matchmaker: {
    total_interactions: number;
    this_month: number;
    by_action_type: Record<string, number>;
    successful_matches: number;
  };
  subscriptions: {
    total: number;
    active: number;
    by_status: Record<string, number>;
    by_plan_type: Record<string, number>;
    by_role: Record<string, number>;
    total_units: number;
    active_units: number;
    autopay_enabled_count: number;
    subscribed_users: number;
  };
}

export const useComprehensiveAdminMetrics = () => {
  return useQuery({
    queryKey: ['comprehensive-admin-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_comprehensive_admin_metrics');
      if (error) {
        console.error('Admin metrics failed:', error.message);
        return null; // Return null instead of throwing - dashboard will show fallback UI
      }
      return data as unknown as ComprehensiveMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry schema errors - they won't resolve on retry
  });
};
