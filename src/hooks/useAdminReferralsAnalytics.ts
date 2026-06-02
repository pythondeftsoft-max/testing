import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReferralsOverview {
  total_referrals: number;
  qualified_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  available_rewards_count: number;
}

interface ReferralsRecentActivity {
  referral_id: string;
  referrer_id: string;
  referrer_name: string;
  referred_name: string;
  referred_email: string;
  referred_user_id?: string;
  status: string;
  updated_at: string;
}

export const useAdminReferralsOverview = () => {
  return useQuery({
    queryKey: ['admin-referrals-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_referrals_overview_admin');
      if (error) throw error;
      return data?.[0] as ReferralsOverview;
    },
  });
};

export const useAdminReferralsRecentActivity = (limit: number = 20) => {
  return useQuery({
    queryKey: ['admin-referrals-recent-activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_referrals_recent_activity_admin', { limit_count: limit });
      if (error) throw error;
      return data as ReferralsRecentActivity[];
    },
  });
};