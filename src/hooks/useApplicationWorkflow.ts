import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyApplicationCreated } from '@/utils/applicationNotifications';

export type ApplicationStatus = 
  | 'pending' 
  | 'under_review' 
  | 'background_check'
  | 'landlord_review'
  | 'approved' 
  | 'rejected' 
  | 'withdrawn'
  | 'awaiting_move_in'
  | 'move_in_complete';

export const useApplicationWorkflow = () => {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ 
      applicationId, 
      status 
    }: { 
      applicationId: string; 
      status: ApplicationStatus;
    }) => {
      // Map status to lifecycle_stage
      const lifecycle_stage = status === 'approved' ? 'tenant' : 
                             status === 'rejected' ? 'rejected' :
                             status === 'withdrawn' ? 'withdrawn' : 'applicant';
      
      const { error} = await supabase
        .from('marketplace_applications')
        .update({ 
          lifecycle_stage 
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaker-pipeline'] });
      toast.success('Application status updated');
    },
    onError: () => {
      toast.error('Failed to update application status');
    },
  });

  const assignWorker = useMutation({
    mutationFn: async ({ 
      applicationId, 
      workerId 
    }: { 
      applicationId: string; 
      workerId: string;
    }) => {
      const { error } = await supabase
        .from('marketplace_applications')
        .update({ assigned_worker_id: workerId })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Worker assigned successfully');
    },
    onError: () => {
      toast.error('Failed to assign worker');
    },
  });

  const updatePriority = useMutation({
    mutationFn: async ({ 
      applicationId, 
      priority 
    }: { 
      applicationId: string; 
      priority: 'urgent' | 'normal' | 'low';
    }) => {
      const { error } = await supabase
        .from('marketplace_applications')
        .update({ priority_level: priority })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Priority updated');
    },
  });

  const updateMoveInChecklist = useMutation({
    mutationFn: async ({ 
      applicationId, 
      checklist 
    }: { 
      applicationId: string; 
      checklist: {
        lease_signed?: boolean;
        deposit_paid?: boolean;
        keys_prepared?: boolean;
        utilities_transferred?: boolean;
        inspection_scheduled?: boolean;
      };
    }) => {
      // Get current checklist
      const { data: current } = await supabase
        .from('marketplace_applications')
        .select('move_in_checklist')
        .eq('id', applicationId)
        .single();

      const updatedChecklist = {
        ...(current?.move_in_checklist as any || {}),
        ...checklist,
      };

      const { error } = await supabase
        .from('marketplace_applications')
        .update({ move_in_checklist: updatedChecklist })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Checklist updated');
    },
  });

  const setMoveInDate = useMutation({
    mutationFn: async ({ 
      applicationId, 
      moveInDate 
    }: { 
      applicationId: string; 
      moveInDate: string;
    }) => {
      const { error } = await supabase
        .from('marketplace_applications')
        .update({ 
          move_in_date: moveInDate,
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      toast.success('Move-in date scheduled');
    },
  });

  const createApplication = useMutation({
    mutationFn: async ({ 
      tenant_id,
      property_id,
      status,
      assigned_worker_id,
      ai_match_score,
    }: { 
      tenant_id: string;
      property_id: string;
      status: ApplicationStatus;
      assigned_worker_id?: string;
      ai_match_score?: number;
    }) => {
      // Map status to lifecycle_stage
      const lifecycle_stage = status === 'approved' ? 'tenant' : 
                             status === 'rejected' ? 'rejected' :
                             status === 'withdrawn' ? 'withdrawn' : 'applicant';
      
      const { data, error } = await supabase
        .from('marketplace_applications')
        .insert({
          user_id: tenant_id,
          property_id,
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          lifecycle_stage,
          assigned_worker_id,
          ai_match_score,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['matchmaker-pipeline'] });
      
      // Send notifications (fire and forget - don't block application creation)
      notifyApplicationCreated({
        applicationId: data.id,
        tenantId: data.user_id,
        propertyId: data.property_id,
        matchScore: data.ai_match_score || undefined,
        assignedWorkerId: data.assigned_worker_id || undefined,
      }).catch((error) => {
        console.error('Failed to send application notifications:', error);
      });
    },
    onError: () => {
      toast.error('Failed to create application');
    },
  });

  return {
    updateStatus,
    assignWorker,
    updatePriority,
    updateMoveInChecklist,
    setMoveInDate,
    createApplication,
  };
};
