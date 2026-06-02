import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: any; // More flexible for database compatibility
  user_agent?: string;
  location_data?: any;
  device_fingerprint?: string;
  is_active: boolean;
  last_activity: string;
  expires_at: string;
  mfa_verified: boolean;
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export const useUserSessions = (userId?: string) => {
  return useQuery({
    queryKey: ['user-sessions', userId],
    queryFn: async (): Promise<UserSession[]> => {
      let query = supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
};

export const useTerminateSession = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      toast({
        title: "Session Terminated",
        description: "User session has been terminated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error terminating session:', error);
      toast({
        title: "Error",
        description: "Failed to terminate session. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useHighRiskSessions = () => {
  return useQuery({
    queryKey: ['high-risk-sessions'],
    queryFn: async (): Promise<UserSession[]> => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .gt('risk_score', 50)
        .order('risk_score', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
};