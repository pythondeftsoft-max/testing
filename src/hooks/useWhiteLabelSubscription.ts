import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhiteLabelSubscriptionStatus {
  hasWhiteLabelAccess: boolean;
  isLoading: boolean;
  subscriptionTier: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;
}

export const useWhiteLabelSubscription = (userId?: string): WhiteLabelSubscriptionStatus => {
  const { data, isLoading } = useQuery({
    queryKey: ['white-label-subscription', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Check for active white-label subscription
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_type', 'white_label')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) throw subError;

      // Check white-label config approval status
      const { data: config, error: configError } = await supabase
        .from('white_label_configs')
        .select('approval_status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;

      return {
        subscription: subscriptions?.[0] || null,
        approvalStatus: config?.approval_status || null,
      };
    },
    enabled: !!userId,
  });

  return {
    hasWhiteLabelAccess: !!data?.subscription,
    isLoading,
    subscriptionTier: data?.subscription?.plan_type || null,
    approvalStatus: (data?.approvalStatus as 'pending' | 'approved' | 'rejected' | null) || null,
  };
};
