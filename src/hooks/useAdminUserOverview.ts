import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUserOverview {
  total_points: number;
  points_this_month: number;
  total_referrals: number;
  qualified_referrals: number;
  member_since: string | null;
  last_active: string | null;
}

export const useAdminUserOverview = (userId: string) => {
  return useQuery({
    queryKey: ['admin-user-overview', userId],
    queryFn: async (): Promise<AdminUserOverview> => {
      // Get profile for member since and last active
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at, updated_at')
        .eq('id', userId)
        .single();

      if (profileError) console.error('Error fetching profile:', profileError);

      // Get total points
      const { data: pointsData, error: pointsError } = await supabase
        .from('portfolio_user_points')
        .select('points_awarded')
        .eq('user_id', userId);

      if (pointsError) console.error('Error fetching points:', pointsError);

      const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points_awarded || 0), 0) || 0;

      // Get points this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthPointsData, error: monthPointsError } = await supabase
        .from('portfolio_user_points')
        .select('points_awarded')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      if (monthPointsError) console.error('Error fetching monthly points:', monthPointsError);

      const pointsThisMonth = monthPointsData?.reduce((sum, p) => sum + (p.points_awarded || 0), 0) || 0;

      // Get referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('id, status')
        .eq('referrer_id', userId);

      if (referralsError) console.error('Error fetching referrals:', referralsError);

      const totalReferrals = referralsData?.length || 0;
      const qualifiedReferrals = referralsData?.filter((r) => r.status === 'qualified' || r.status === 'converted').length || 0;

      return {
        total_points: totalPoints,
        points_this_month: pointsThisMonth,
        total_referrals: totalReferrals,
        qualified_referrals: qualifiedReferrals,
        member_since: profile?.created_at || null,
        last_active: profile?.updated_at || null,
      };
    },
    enabled: !!userId,
  });
};
