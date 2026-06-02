import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];

export interface MessageWithSender extends Message {
  sender_email: string;
  sender_first_name: string;
  sender_last_name: string;
}

export const useAdminMessageThread = (applicationId: string | null) => {
  return useQuery({
    queryKey: ['admin-message-thread', applicationId],
    queryFn: async () => {
      if (!applicationId) return [];

      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`marketplace_application_id.eq.${applicationId},unit_application_id.eq.${applicationId},property_application_id.eq.${applicationId}`)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!messages || messages.length === 0) return [];

      // Get sender profiles
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', senderIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return messages.map(msg => {
        const sender = profileMap.get(msg.sender_id);
        return {
          ...msg,
          sender_email: sender?.email || '',
          sender_first_name: sender?.first_name || '',
          sender_last_name: sender?.last_name || '',
        };
      }) as MessageWithSender[];
    },
    enabled: !!applicationId,
    staleTime: 1000 * 30, // 30 seconds
  });
};
