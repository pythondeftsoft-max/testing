
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantSubscription {
  id: string;
  plan_type: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  stripe_subscription_id?: string;
}

export const useTenantSubscription = (tenantId: string) => {
  return useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', tenantId)
        .eq('role', 'tenant')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching tenant subscription:', error);
        throw error;
      }

      return data?.[0] as TenantSubscription | null;
    },
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds
  });
};
