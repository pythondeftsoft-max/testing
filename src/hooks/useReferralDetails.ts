
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralDetail {
  id: string;
  referred_user_name: string;
  referred_user_email: string;
  status: 'pending' | 'qualified' | 'rejected';
  referral_date: string;
  qualified_date?: string;
  reward_amount: number;
  notes?: string;
}

const REWARD_PER_QUALIFIED = 50;

export const useReferralDetails = (userId: string) => {
  return useQuery({
    queryKey: ['referral-details', userId],
    queryFn: async (): Promise<ReferralDetail[]> => {
      // Query referrals with available columns
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          approved_at,
          referred_user_id,
          referred_name,
          referred_email
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching referral details:', error);
        throw error;
      }

      if (!referrals || referrals.length === 0) {
        return [];
      }

      // Get profile info for referred users who have registered
      const referredUserIds = referrals.map(r => r.referred_user_id).filter(Boolean) as string[];
      
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
      
      if (referredUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', referredUserIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      return referrals.map(r => {
        const profile = r.referred_user_id ? profilesMap[r.referred_user_id] : null;
        
        // Use profile name if available, otherwise use referred_name from the referral record
        const name = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || r.referred_name || 'Unknown User'
          : r.referred_name || 'Unknown User';
        
        // Use profile email if available, otherwise use referred_email from the referral record  
        const email = profile?.email || r.referred_email || 'N/A';
        
        const status = (r.status as 'pending' | 'qualified' | 'rejected') || 'pending';
        
        return {
          id: r.id,
          referred_user_name: name,
          referred_user_email: email,
          status,
          referral_date: r.created_at,
          qualified_date: r.approved_at || undefined,
          reward_amount: status === 'qualified' ? REWARD_PER_QUALIFIED : 0,
        };
      });
    },
    enabled: !!userId,
  });
};
