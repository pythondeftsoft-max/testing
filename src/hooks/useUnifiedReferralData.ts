
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedReferralValue {
  total_gift_card_value: number;
  total_point_equivalent: number;
  total_unified_points: number;
  available_gift_cards: number;
  available_point_equivalent: number;
}

export interface EnhancedReferralStats {
  total_referrals: number;
  qualified_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  available_rewards_count: number;
  progress_to_milestone: number;
  total_point_equivalent: number;
  available_point_equivalent: number;
  unified_total_value: number;
}

const REWARD_PER_QUALIFIED = 50; // Default reward amount per qualified referral

export const useUnifiedReferralData = (userId: string) => {
  // Get unified referral value from database
  const {
    data: unifiedValue,
    isLoading: valueLoading,
    error: valueError,
  } = useQuery({
    queryKey: ['unified-referral-value', userId],
    queryFn: async (): Promise<UnifiedReferralValue> => {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', userId);

      if (error) {
        console.error('Error fetching referral values:', error);
        throw error;
      }

      const qualifiedCount = referrals?.filter(r => r.status === 'qualified').length || 0;
      const totalRewards = qualifiedCount * REWARD_PER_QUALIFIED;

      return {
        total_gift_card_value: totalRewards,
        total_point_equivalent: totalRewards,
        total_unified_points: totalRewards,
        available_gift_cards: qualifiedCount,
        available_point_equivalent: totalRewards,
      };
    },
    enabled: !!userId,
  });

  // Get enhanced referral stats from database
  const {
    data: enhancedStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['enhanced-referral-stats', userId],
    queryFn: async (): Promise<EnhancedReferralStats> => {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', userId);

      if (error) {
        console.error('Error fetching referral stats:', error);
        throw error;
      }

      const total = referrals?.length || 0;
      const qualified = referrals?.filter(r => r.status === 'qualified').length || 0;
      const pending = referrals?.filter(r => r.status === 'pending').length || 0;
      const totalRewards = qualified * REWARD_PER_QUALIFIED;

      // Progress to next milestone (every 5 referrals)
      const nextMilestone = Math.ceil((qualified + 1) / 5) * 5;
      const progressPercent = nextMilestone > 0 ? (qualified / nextMilestone) * 100 : 0;

      return {
        total_referrals: total,
        qualified_referrals: qualified,
        pending_referrals: pending,
        total_rewards_earned: totalRewards,
        available_rewards_count: qualified,
        progress_to_milestone: Math.min(progressPercent, 100),
        total_point_equivalent: totalRewards,
        available_point_equivalent: totalRewards,
        unified_total_value: totalRewards,
      };
    },
    enabled: !!userId,
  });

  return {
    unifiedValue,
    enhancedStats,
    loading: valueLoading || statsLoading,
    error: valueError || statsError,
  };
};
