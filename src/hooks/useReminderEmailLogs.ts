import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReminderEmailLog {
  id: string;
  reminder_id: string;
  sent_at: string;
  status: 'queued' | 'sent' | 'failed';
  provider_message_id: string | null;
  error_message: string | null;
}

export const useReminderEmailLogs = (reminderId: string) => {
  return useQuery({
    queryKey: ['reminder-email-logs', reminderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_email_logs')
        .select('*')
        .eq('reminder_id', reminderId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ReminderEmailLog[];
    },
    enabled: !!reminderId,
  });
};