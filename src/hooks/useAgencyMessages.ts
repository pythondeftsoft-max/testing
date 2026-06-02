import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgencyMessage {
  id: string;
  agency_id: string;
  sender_id: string;
  sender_type: string;
  recipient_id: string;
  recipient_type: string;
  subject: string;
  body: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AutomatedReminder {
  id: string;
  agency_id: string;
  reminder_type: string;
  days_before: number;
  notice_template_id: string | null;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export function useAgencyMessages(agencyId: string) {
  const [messages, setMessages] = useState<AgencyMessage[]>([]);
  const [reminders, setReminders] = useState<AutomatedReminder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_messages')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) console.error('Failed to load messages:', error);
    setMessages((data as unknown as AgencyMessage[]) || []);
    setLoading(false);
  }, [agencyId]);

  const fetchReminders = useCallback(async () => {
    const { data, error } = await supabase
      .from('agency_automated_reminders')
      .select('*')
      .eq('agency_id', agencyId)
      .order('reminder_type');

    if (error) console.error('Failed to load reminders:', error);
    setReminders((data as unknown as AutomatedReminder[]) || []);
  }, [agencyId]);

  useEffect(() => {
    fetchMessages();
    fetchReminders();
  }, [fetchMessages, fetchReminders]);

  const sendMessage = async (msg: {
    sender_id: string;
    sender_type?: string;
    recipient_id: string;
    recipient_type?: string;
    subject: string;
    body: string;
    linked_entity_type?: string;
    linked_entity_id?: string;
  }) => {
    const { error } = await supabase.from('agency_messages').insert({
      agency_id: agencyId,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type || 'staff',
      recipient_id: msg.recipient_id,
      recipient_type: msg.recipient_type || 'tenant',
      subject: msg.subject,
      body: msg.body,
      linked_entity_type: msg.linked_entity_type || null,
      linked_entity_id: msg.linked_entity_id || null,
    });

    if (error) { toast.error('Failed to send message'); return false; }

    // Also queue an email delivery for this agency message
    try {
      await supabase.from('email_queue').insert({
        user_id: msg.recipient_id,
        subject: msg.subject,
        body: msg.body,
        status: 'pending',
        email_type: 'custom',
        metadata: {
          agency_id: agencyId,
          source: 'agency_message',
          linked_entity_type: msg.linked_entity_type || null,
          linked_entity_id: msg.linked_entity_id || null,
        },
      } as any);
    } catch (emailErr) {
      console.error('Failed to queue agency email:', emailErr);
      // Don't fail the whole operation — in-app message was saved
    }

    toast.success('Message sent');
    await fetchMessages();
    return true;
  };

  const markAsRead = async (messageId: string) => {
    const { error } = await supabase
      .from('agency_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) return false;
    await fetchMessages();
    return true;
  };

  const upsertReminder = async (reminder: {
    reminder_type: string;
    days_before: number;
    notice_template_id?: string | null;
    is_active: boolean;
  }) => {
    const { error } = await supabase
      .from('agency_automated_reminders')
      .upsert({
        agency_id: agencyId,
        reminder_type: reminder.reminder_type as any,
        days_before: reminder.days_before,
        notice_template_id: reminder.notice_template_id || null,
        is_active: reminder.is_active,
      }, { onConflict: 'agency_id,reminder_type' });

    if (error) { toast.error('Failed to save reminder config'); return false; }
    toast.success('Reminder config saved');
    await fetchReminders();
    return true;
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return {
    messages, reminders, loading, unreadCount,
    sendMessage, markAsRead, upsertReminder,
    refetchMessages: fetchMessages, refetchReminders: fetchReminders,
  };
}
