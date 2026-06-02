import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTogglePlanStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      const { data, error } = await supabase.rpc('admin_toggle_plan_status', {
        p_plan_id: planId,
        p_is_active: isActive
      }).single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isActive 
          ? 'Plan activated - now available for subscriptions' 
          : 'Plan deactivated - hidden from users'
      );
      queryClient.invalidateQueries({ queryKey: ['subscription-plan-status'] });
    },
    onError: (error) => {
      toast.error('Failed to update plan status');
      console.error('Plan toggle error:', error);
    }
  });
};
