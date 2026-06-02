import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useApplicationActions = () => {
  const queryClient = useQueryClient();

  const withdrawApplication = useMutation({
    mutationFn: async ({ 
      applicationId, 
      reason 
    }: { 
      applicationId: string; 
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('property_applications')
        .update({ 
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
          withdrawn_reason: reason || null,
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaker-pipeline'] });
      toast.success('Application withdrawn successfully');
    },
    onError: () => {
      toast.error('Failed to withdraw application');
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async ({ 
      applicationId, 
      reason,
      rejectedBy,
    }: { 
      applicationId: string; 
      reason?: string;
      rejectedBy: string;
    }) => {
      const { error } = await supabase
        .from('property_applications')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: rejectedBy,
          rejection_reason: reason || null,
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaker-pipeline'] });
      toast.success('Application rejected');
    },
    onError: () => {
      toast.error('Failed to reject application');
    },
  });

  const markAsPrimaryApplicant = useMutation({
    mutationFn: async ({ 
      applicationId,
      propertyId,
      isPrimary,
    }: { 
      applicationId: string;
      propertyId: string;
      isPrimary: boolean;
    }) => {
      // If marking as primary, first unmark any other primary applicants for this property
      if (isPrimary) {
        await supabase
          .from('property_applications')
          .update({ is_primary_applicant: false })
          .eq('property_id', propertyId)
          .neq('id', applicationId);
      }

      const { error } = await supabase
        .from('property_applications')
        .update({ is_primary_applicant: isPrimary })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Primary applicant status updated');
    },
    onError: () => {
      toast.error('Failed to update primary applicant status');
    },
  });

  const updateHousingStatus = useMutation({
    mutationFn: async ({ 
      applicationId,
      housingStatus,
      paymentMethod,
      confirmedBy,
    }: { 
      applicationId: string;
      housingStatus: 'housed' | 'housed_and_paid';
      paymentMethod?: 'stripe' | 'plaid' | 'other';
      confirmedBy: string;
    }) => {
      const updateData: any = {
        housing_status: housingStatus,
      };

      if (housingStatus === 'housed_and_paid') {
        updateData.payment_method = paymentMethod;
        updateData.payment_confirmed_at = new Date().toISOString();
        updateData.payment_confirmed_by = confirmedBy;
      }

      const { error } = await supabase
        .from('property_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Housing status updated');
    },
    onError: () => {
      toast.error('Failed to update housing status');
    },
  });

  return {
    withdrawApplication,
    rejectApplication,
    markAsPrimaryApplicant,
    updateHousingStatus,
  };
};