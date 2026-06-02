import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePlanStatus = () => {
  return useQuery({
    queryKey: ['subscription-plan-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*');

      if (error) throw error;
      
      // Convert to map for easy lookup
      return data.reduce((acc, plan) => {
        acc[plan.id] = plan.is_active;
        return acc;
      }, {} as Record<string, boolean>);
    },
  });
};
