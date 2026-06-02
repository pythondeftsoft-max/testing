import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AdminMessage = Database['public']['Tables']['admin_messages']['Row'];
type AdminMessageInsert = Database['public']['Tables']['admin_messages']['Insert'];

export interface AdminMessageWithRecipient extends AdminMessage {
  recipient_email: string;
  recipient_first_name: string;
  recipient_last_name: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}

export const useAdminDirectMessages = (recipientUserId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch message history with a specific user
  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-direct-messages', recipientUserId],
    queryFn: async () => {
      if (!recipientUserId) return [];

      const { data: messages, error: msgError } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('recipient_user_id', recipientUserId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!messages || messages.length === 0) return [];

      // Get admin and recipient profiles
      const adminIds = [...new Set(messages.map(m => m.admin_user_id))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', [...adminIds, recipientUserId]);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const recipientProfile = profileMap.get(recipientUserId);

      return messages.map(msg => {
        const adminProfile = profileMap.get(msg.admin_user_id);
        return {
          ...msg,
          recipient_email: recipientProfile?.email || '',
          recipient_first_name: recipientProfile?.first_name || '',
          recipient_last_name: recipientProfile?.last_name || '',
          admin_email: adminProfile?.email || '',
          admin_first_name: adminProfile?.first_name || '',
          admin_last_name: adminProfile?.last_name || '',
        };
      }) as AdminMessageWithRecipient[];
    },
    enabled: !!recipientUserId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      recipientId,
      recipientGroup,
      subject,
      messageText,
      messageType = 'general',
      file,
    }: {
      recipientId?: string;
      recipientGroup?: 'all' | 'landlords' | 'tenants';
      subject: string;
      messageText: string;
      messageType?: 'general' | 'maintenance' | 'application' | 'urgent' | 'billing' | 'lease' | 'inspection' | 'settings' | 'help' | 'announcement';
      file?: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate: must have either recipientId OR recipientGroup
      if (!recipientId && !recipientGroup) {
        throw new Error('Must specify either recipient or group');
      }

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;

      // Upload file if provided
      if (file) {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size must be less than 10MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `admin/${recipientId || recipientGroup}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: signedData, error: signedErr } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);
        if (signedErr || !signedData?.signedUrl) {
          throw new Error(`Failed to sign attachment URL: ${signedErr?.message ?? 'unknown'}`);
        }

        attachmentUrl = signedData.signedUrl;
        attachmentName = file.name;
        attachmentType = file.type;
      }

      const newMessage: AdminMessageInsert = {
        admin_user_id: user.id,
        recipient_user_id: recipientId || null,
        recipient_group: recipientGroup || null,
        is_bulk_message: !!recipientGroup,
        subject,
        message_text: messageText,
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
      };

      const { data, error } = await supabase
        .from('admin_messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations-list'] });
      toast.success('Message sent successfully');
    },
    onError: (error: any) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  // Mark message as read
  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('admin_messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations-list'] });
    },
    onError: (error: any) => {
      console.error('Error marking message as read:', error);
    },
  });

  return {
    messages: messages || [],
    isLoading,
    sendMessage: sendMessage.mutate,
    markAsRead: markAsRead.mutate,
    isSending: sendMessage.isPending,
  };
};
