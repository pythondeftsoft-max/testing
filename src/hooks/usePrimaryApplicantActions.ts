import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SetPrimaryApplicantParams {
  unitId: string;
  tenantId: string;
}

interface RejectPrimaryApplicantParams {
  unitId?: string;
  propertyId?: string;
  reason?: string;
}

export const usePrimaryApplicantActions = () => {
  const queryClient = useQueryClient();

  const setAsPrimaryApplicant = useMutation({
    mutationFn: async ({ unitId, tenantId }: SetPrimaryApplicantParams) => {
      const { data, error } = await supabase.rpc('landlord_set_primary_applicant', {
        p_unit_id: unitId,
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-quota'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-push-applications'] });
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      
      // Dispatch custom event to notify components that don't use React Query
      const result = data as any;
      window.dispatchEvent(new CustomEvent('primary-applicant-updated', { 
        detail: { unitId: result.unit_id, tenantId: result.user_id }
      }));
      
      toast({
        title: 'Primary Applicant Set',
        description: 'The applicant has been set as Primary. Listing is now paused and moved to In Process.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Set Primary Applicant',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const rejectPrimaryApplicant = useMutation({
    mutationFn: async ({ unitId, propertyId, reason }: RejectPrimaryApplicantParams) => {
      const { data, error } = await supabase.rpc('landlord_reject_primary_applicant', {
        p_unit_id: unitId || null,
        p_property_id: propertyId || null,
        p_reason: reason || 'Not a fit',
      } as any);

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['push-status'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pending-match'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-match-history'] });
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
      
      // Dispatch custom event to notify components that don't use React Query
      const result = data as any;
      window.dispatchEvent(new CustomEvent('primary-applicant-updated', { 
        detail: { unitId: result.unit_id, tenantId: result.tenant_id }
      }));
      
      toast({
        title: 'Primary Applicant Rejected',
        description: 'The Primary Applicant has been rejected. Listing is now active again.',
      });
    },
    onError: (error: any) => {
      // If error is "No primary applicant found", the data is already correct
      // Dispatch refresh event anyway to update the UI
      if (error.message?.includes('No primary applicant found')) {
        queryClient.invalidateQueries({ queryKey: ['property-units'] });
        queryClient.invalidateQueries({ queryKey: ['unit-applications'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
        queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
        queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
        queryClient.invalidateQueries({ queryKey: ['worker-pipeline'] });
        
        window.dispatchEvent(new CustomEvent('primary-applicant-updated'));
        
        toast({
          title: 'Primary Applicant Already Cleared',
          description: 'The listing is now active again.',
        });
        return;
      }
      
      toast({
        title: 'Failed to Reject Primary Applicant',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    setAsPrimaryApplicant,
    rejectPrimaryApplicant,
  };
};
