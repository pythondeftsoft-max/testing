import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarkLeaseSignedParams {
  unitId: string;
  sendStripe?: boolean;
}

export const useAdminMarkLeaseSigned = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unitId, sendStripe = true }: MarkLeaseSignedParams) => {
      const { data, error } = await supabase.rpc('admin_mark_lease_signed', {
        p_unit_id: unitId,
        p_send_stripe: sendStripe,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['property-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });

      // If sendStripe was requested, check if property is admin-listed first
      if (variables.sendStripe) {
        try {
          const { data: unitRow } = await supabase
            .from('property_units')
            .select('properties(admin_listed)')
            .eq('id', variables.unitId)
            .maybeSingle();
          const adminListed = !!(unitRow as any)?.properties?.admin_listed;

          if (adminListed) {
            toast.success('Lease marked as signed. Manage the placement fee from House Hunter → Fees.');
            return;
          }

          const { data: marketplaceApp } = await supabase
            .from('marketplace_applications')
            .select('id')
            .eq('unit_id', variables.unitId)
            .in('status', ['lease_signed', 'approved', 'submitted', 'primary_applicant'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (marketplaceApp) {
            await supabase.functions.invoke('process-lease-signed-payment', {
              body: { applicationId: marketplaceApp.id },
            });
            toast.success('Lease marked as signed and payment link sent to landlord');
          } else {
            toast.success('Lease marked as signed (no marketplace application found for payment)');
          }
        } catch (error) {
          console.error('Failed to send payment link:', error);
          toast.success('Lease marked as signed but payment link may not have been sent');
        }
      } else {
        toast.success('Lease marked as signed successfully');
      }
    },
    onError: (error: Error) => {
      console.error('Error marking lease as signed:', error);
      toast.error(error.message || 'Failed to mark lease as signed');
    },
  });
};
