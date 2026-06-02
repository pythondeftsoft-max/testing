import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface SmsConversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  contact_user_id: string | null;
  assigned_worker_id: string | null;
  property_id: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SmsMessage {
  id: string;
  conversation_id: string;
  twilio_message_sid: string | null;
  direction: string;
  sender_role: string;
  sender_user_id: string | null;
  body: string;
  delivery_status: string;
  status_updated_at: string | null;
  created_at: string;
  tenant_id: string | null;
  landlord_id: string | null;
  worker_owner_id: string | null;
  receiver_phone: string | null;
  status_history: any[] | null;
  timestamp_sent: string | null;
  timestamp_delivered: string | null;
}

export interface SmsFilters {
  workerId?: string;
  propertyId?: string;
  deliveryStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useSmsConversations = (filters?: SmsFilters) => {
  return useQuery({
    queryKey: ['sms-conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('sms_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.workerId) {
        query = query.eq('assigned_worker_id', filters.workerId);
      }
      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }
      if (filters?.dateFrom) {
        query = query.gte('last_message_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('last_message_at', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SmsConversation[];
    },
    staleTime: 1000 * 15,
  });
};

export const useSmsMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['sms-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SmsMessage[];
    },
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  });
};

export const useSendSms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      to: string;
      body: string;
      conversation_id?: string;
      contact_name?: string;
      property_id?: string;
      tenant_id?: string;
      landlord_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['sms-messages'] });
    },
  });
};

export const useMarkSmsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('sms_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
    },
  });
};

// Gap 6: Real-time subscriptions hook
export const useSmsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('sms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sms-messages'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sms-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
