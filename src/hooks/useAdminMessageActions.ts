import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAudit } from './useAdminAudit';

export const useAdminMessageActions = () => {
  const queryClient = useQueryClient();
  const { logAdminAccess } = useAdminAudit();

  const flagMessage = useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_flagged: true, 
          flagged_reason: reason 
        })
        .eq('id', messageId);

      if (error) throw error;

      await logAdminAccess('message', messageId, 'flag', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-thread'] });
      toast.success('Message flagged successfully');
    },
    onError: (error) => {
      console.error('Error flagging message:', error);
      toast.error('Failed to flag message');
    },
  });

  const clearFlag = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_flagged: false, 
          flagged_reason: null 
        })
        .eq('id', messageId);

      if (error) throw error;

      await logAdminAccess('message', messageId, 'clear_flag');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-thread'] });
      toast.success('Flag cleared successfully');
    },
    onError: (error) => {
      console.error('Error clearing flag:', error);
      toast.error('Failed to clear flag');
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason?: string }) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      await logAdminAccess('message', messageId, 'delete', { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-message-thread'] });
      toast.success('Message deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    },
  });

  return {
    flagMessage,
    clearFlag,
    deleteMessage,
  };
};
