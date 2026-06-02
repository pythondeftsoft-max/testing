import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminResetQuota = () => {
  const { toast } = useToast();

  const resetQuota = useMutation({
    mutationFn: async ({ tenantId, reason }: { tenantId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('admin_reset_tenant_application_quota', {
        p_tenant_id: tenantId,
        p_reason: reason || 'Manual admin reset'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Quota Reset Successfully",
        description: "The tenant's application credits have been refreshed and they've been notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset application quota",
        variant: "destructive",
      });
    },
  });

  return {
    resetQuota,
    isLoading: resetQuota.isPending,
  };
};