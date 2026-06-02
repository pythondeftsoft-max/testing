import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWhiteLabelPlanStatus = () => {
  return useQuery({
    queryKey: ['white-label-plan-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, is_active')
        .eq('id', 'white_label')
        .single();

      if (error) {
        console.error('Error fetching white label plan status:', error);
        return { exists: false, isActive: false };
      }

      return {
        exists: !!data,
        isActive: data?.is_active ?? false
      };
    },
    staleTime: 300000, // 5 minutes - plan status doesn't change often
  });
};
