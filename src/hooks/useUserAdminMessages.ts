import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AdminMessage {
  id: string;
  admin_user_id: string;
  recipient_user_id: string | null;
  recipient_group: string | null;
  subject: string;
  message_text: string;
  message_type: string | null;
  attachment_url: string | null;
  read: boolean;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

export const useUserAdminMessages = () => {
  const queryClient = useQueryClient();

  // Fetch admin messages for current user
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['user-admin-messages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get messages sent directly to this user OR to a group they belong to
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('admin_messages')
        .select(`
          *,
          admin:profiles!admin_messages_admin_user_id_fkey(
            email,
            first_name,
            last_name
          )
        `)
        .or(
          `recipient_user_id.eq.${user.id},` +
          `recipient_group.eq.all,` +
          `and(recipient_group.eq.landlords,profiles.user_type.in.(landlord,individual_owner)),` +
          `and(recipient_group.eq.tenants,profiles.user_type.eq.tenant)`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include admin name
      return (data || []).map((msg: any) => ({
        ...msg,
        admin_name: msg.admin 
          ? `${msg.admin.first_name || ''} ${msg.admin.last_name || ''}`.trim() || msg.admin.email
          : 'Admin',
        admin_email: msg.admin?.email || 'admin@openkey.com',
      })) as AdminMessage[];
    },
  });

  // Mark message as read
  const { mutate: markAsRead } = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-admin-messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      console.error('Error marking message as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark message as read',
        variant: 'destructive',
      });
    },
  });

  return {
    messages,
    isLoading,
    markAsRead,
  };
};
