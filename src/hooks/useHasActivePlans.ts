import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHasActivePlans = (role?: string) => {
  return useQuery({
    queryKey: ['has-active-plans', role],
    queryFn: async () => {
      let query = supabase
        .from('subscription_plans')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (role) {
        query = query.or(`role.eq.${role},role.eq.both`);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error checking active plans:', error);
        return false;
      }

      return (count ?? 0) > 0;
    },
    staleTime: 300000, // 5 minutes
  });
};
