import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminGrantSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      role, 
      planType = 'pro', 
      months = 1 
    }: { 
      userId: string; 
      role: string; 
      planType?: string; 
      months?: number; 
    }) => {
      const { data, error } = await supabase.rpc('admin_grant_subscription', {
        p_user_id: userId,
        p_role: role,
        p_plan_type: planType,
        p_months: months
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Subscription Granted",
        description: "Manual subscription has been successfully granted.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to grant subscription",
        variant: "destructive",
      });
    },
  });
};

export const useAdminAdjustQuota = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      delta, 
      expiresInDays = 7, 
      reason 
    }: { 
      tenantId: string; 
      delta: number; 
      expiresInDays?: number; 
      reason?: string; 
    }) => {
      const { data, error } = await supabase.rpc('admin_adjust_tenant_application_quota', {
        p_tenant_id: tenantId,
        p_delta: delta,
        p_expires_in_days: expiresInDays,
        p_reason: reason || 'Admin adjustment'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Quota Adjusted",
        description: `Successfully ${variables.delta > 0 ? 'added' : 'removed'} ${Math.abs(variables.delta)} application credits.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust quota",
        variant: "destructive",
      });
    },
  });
};

export const useAdminCancelManualSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data, error } = await supabase.rpc('admin_cancel_subscription', {
        p_subscription_id: subscriptionId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Subscription Canceled",
        description: "Manual subscription has been successfully canceled.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });
};