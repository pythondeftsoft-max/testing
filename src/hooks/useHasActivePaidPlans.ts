import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHasActivePaidPlans = (role?: string) => {
  return useQuery({
    queryKey: ['has-active-paid-plans', role],
    queryFn: async () => {
      let query = supabase
        .from('subscription_plans')
        .select('id, price, name', { count: 'exact' })
        .eq('is_active', true)
        .gt('price', 0); // Exclude free plans

      if (role) {
        query = query.or(`role.eq.${role},role.eq.both`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking active paid plans:', error);
        return false;
      }

      // Filter out white label plan from the count
      const nonWhiteLabelPlans = data?.filter(plan => 
        !plan.name.toLowerCase().includes('white label')
      ) || [];

      return nonWhiteLabelPlans.length > 0;
    },
    staleTime: 300000, // 5 minutes
  });
};
