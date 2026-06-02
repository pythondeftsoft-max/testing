import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface EmailQueueItem {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  link?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  updated_at: string;
  sent_at?: string;
  // Email type tracking
  email_type?: 'custom' | 'auth_confirmation' | 'auth_password_reset' | 'auth_magic_link' | 'auth_invite';
  auth_metadata?: Record<string, any>;
  // Template fields
  audience?: 'tenant' | 'landlord' | 'all';
  template_slug?: string;
  category?: string;
  metadata?: Record<string, any>;
  to_email?: string;
}

export const useEmailQueue = (filters?: {
  status?: string;
  search?: string;
  templateSlug?: string;
  limit?: number;
}) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['email-queue', filters],
    queryFn: async () => {
      let query = supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,body.ilike.%${filters.search}%,to_email.ilike.%${filters.search}%`);
      }

      if (filters?.templateSlug && filters.templateSlug !== 'all-types') {
        query = query.eq('template_slug', filters.templateSlug);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(500);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailQueueItem[];
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnMount: true, // Always refetch on mount
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('email_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_queue'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['email-queue'] });
          queryClient.invalidateQueries({ queryKey: ['email-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const useEmailStats = () => {
  return useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_queue')
        .select('status')
        .neq('status', null);

      if (error) throw error;

      const stats = {
        pending: 0,
        sent: 0,
        failed: 0,
        total: data.length
      };

      data.forEach(item => {
        if (item.status === 'pending') stats.pending++;
        else if (item.status === 'sent') stats.sent++;
        else if (item.status === 'failed') stats.failed++;
      });

      return stats;
    },
    refetchInterval: 30000,
  });
};

export const useProcessEmails = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-email-queue', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Emails processed",
        description: `Successfully processed ${data?.processedCount || 0} emails`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process emails",
        description: error.message || "An error occurred while processing emails",
        variant: "destructive",
      });
    },
  });
};