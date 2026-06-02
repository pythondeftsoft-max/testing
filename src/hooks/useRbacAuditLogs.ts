
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RbacChangeLog {
  id: string;
  actor_user_id: string;
  target_user_id: string | null;
  portfolio_id: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
  change_type: string;
  scope: string;
  object: string | null;
  actor_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  portfolio?: {
    client_name: string;
  };
}

export const useRbacAuditLogs = (filters?: {
  portfolioId?: string;
  targetUserId?: string;
  changeType?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['rbac-audit-logs', filters],
    queryFn: async () => {
      try {
        let query = supabase
          .from('rbac_change_logs')
          .select(`
            *,
            actor_profile:profiles!rbac_change_logs_actor_user_id_fkey(
              first_name,
              last_name,
              email
            ),
            target_profile:profiles!rbac_change_logs_target_user_id_fkey(
              first_name,
              last_name,
              email
            ),
            portfolio:portfolios(client_name)
          `)
          .order('created_at', { ascending: false });

        if (filters?.portfolioId) {
          query = query.eq('portfolio_id', filters.portfolioId);
        }

        if (filters?.targetUserId) {
          query = query.eq('target_user_id', filters.targetUserId);
        }

        if (filters?.changeType) {
          query = query.eq('change_type', filters.changeType);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('RBAC audit logs query error:', error);
          throw error;
        }
        
        return data as unknown as RbacChangeLog[];
      } catch (error) {
        // Handle specific error cases gracefully
        console.error('Failed to fetch RBAC audit logs:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on permission/auth errors
      if ((error as any)?.code === 'PGRST301' || (error as any)?.status === 401) {
        return false;
      }
      // Retry on network/temporary errors
      return failureCount < 2;
    },
  });
};

export const useRbacAuditSummary = (timeframe = '7 days') => {
  return useQuery({
    queryKey: ['rbac-audit-summary', timeframe],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_rbac_audit_summary', {
        p_timeframe: timeframe
      });

      if (error) throw error;
      return data;
    },
    staleTime: 300000, // 5 minutes
  });
};
