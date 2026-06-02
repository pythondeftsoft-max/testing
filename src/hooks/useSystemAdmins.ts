import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemAdmin {
  id: string;
  user_id: string;
  user_email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  granted_by: string;
  granted_at: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

export const useSystemAdmins = () => {
  const queryClient = useQueryClient();

  const useAllSystemAdmins = () => {
    return useQuery({
      queryKey: ['system-admins'],
      queryFn: async () => {
        const { data, error } = await (supabase as any).rpc('get_all_system_admins');
        if (error) throw error;
        return data as SystemAdmin[];
      },
    });
  };

  const useSendAdminInvitation = () => {
    return useMutation({
      mutationFn: async ({ 
        email, 
        notes, 
        role = 'matchmaker',
        first_name,
        last_name,
        phone
      }: { 
        email: string; 
        notes?: string; 
        role?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
      }) => {
        const { data, error } = await supabase.functions.invoke('send-system-admin-invitation', {
          body: { email, role, notes, first_name, last_name, phone }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-admins'] });
        queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
        toast.success('Invitation sent successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to send invitation');
      },
    });
  };

  const usePendingInvitations = () => {
    return useQuery({
      queryKey: ['pending-admin-invitations'],
      queryFn: async () => {
        const { data, error } = await (supabase as any).rpc('get_pending_admin_invitations');
        if (error) throw error;
        return data;
      },
    });
  };

  const useCancelInvitation = () => {
    return useMutation({
      mutationFn: async (invitationId: string) => {
        const { error } = await (supabase as any).rpc('cancel_admin_invitation', {
          p_invitation_id: invitationId
        });
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
        toast.success('Invitation cancelled');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to cancel invitation');
      },
    });
  };

  const useResendInvitation = () => {
    return useMutation({
      mutationFn: async ({ invitationId, email, role, notes, first_name, last_name, phone }: {
        invitationId: string;
        email: string;
        role: string;
        notes?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
      }) => {
        // Cancel old invitation
        await (supabase as any).rpc('cancel_admin_invitation', {
          p_invitation_id: invitationId
        });

        // Send new invitation
        const { data, error } = await supabase.functions.invoke('send-system-admin-invitation', {
          body: { email, role, notes, first_name, last_name, phone }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pending-admin-invitations'] });
        toast.success('Invitation resent successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to resend invitation');
      },
    });
  };

  const useRevokeSystemAdmin = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const { error } = await (supabase as any)
          .from('system_admins')
          .update({ is_active: false })
          .eq('user_id', userId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-admins'] });
        queryClient.invalidateQueries({ queryKey: ['admin-check'] });
        toast.success('System admin access revoked');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to revoke system admin');
      },
    });
  };

  const useUpdateSystemAdmin = () => {
    return useMutation({
      mutationFn: async ({ 
        adminId, 
        role, 
        notes 
      }: { 
        adminId: string; 
        role: string; 
        notes?: string;
      }) => {
        const { error } = await (supabase as any).rpc('update_system_admin', {
          p_admin_id: adminId,
          p_role_name: role,
          p_notes: notes || null,
        });

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-admins'] });
        queryClient.invalidateQueries({ queryKey: ['admin-check'] });
        toast.success('System admin updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update system admin');
      },
    });
  };

  const useCreateSystemAdminDirect = () => {
    return useMutation({
      mutationFn: async ({ 
        email, 
        password,
        role,
        first_name,
        last_name,
        phone,
        notes
      }: { 
        email: string;
        password: string;
        role: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        notes?: string;
      }) => {
        const { data, error } = await supabase.functions.invoke('create-system-admin-direct', {
          body: { email, password, role, first_name, last_name, phone, notes }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-admins'] });
        queryClient.invalidateQueries({ queryKey: ['admin-check'] });
        toast.success('Admin account created successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create admin account');
      },
    });
  };

  return {
    useAllSystemAdmins,
    useSendAdminInvitation,
    usePendingInvitations,
    useCancelInvitation,
    useResendInvitation,
    useRevokeSystemAdmin,
    useUpdateSystemAdmin,
    useCreateSystemAdminDirect,
  };
};
