import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgentApiLog {
  id: string;
  api_key_id: string | null;
  endpoint: string;
  method: string;
  response_status: number | null;
  duration_ms: number | null;
  request_body: any;
  response_body: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  key_name?: string;
}

export interface ApiLogFilters {
  keyId?: string;
  endpoint?: string;
  status?: 'success' | 'error' | 'all';
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export const useAgentApiLogs = (filters?: ApiLogFilters, limit = 100) => {
  return useQuery({
    queryKey: ['agent-api-logs', filters, limit],
    queryFn: async () => {
      let query = supabase
        .from('agent_api_logs')
        .select(`
          *,
          agent_api_keys (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters?.keyId) {
        query = query.eq('api_key_id', filters.keyId);
      }

      if (filters?.endpoint) {
        query = query.ilike('endpoint', `%${filters.endpoint}%`);
      }

      if (filters?.status === 'success') {
        query = query.gte('response_status', 200).lt('response_status', 300);
      } else if (filters?.status === 'error') {
        query = query.gte('response_status', 400);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include key name
      return (data || []).map((log: any) => ({
        ...log,
        key_name: log.agent_api_keys?.name || 'Unknown',
      })) as AgentApiLog[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useAgentApiLogDetails = (logId: string | null) => {
  return useQuery({
    queryKey: ['agent-api-log-details', logId],
    queryFn: async () => {
      if (!logId) return null;

      const { data, error } = await supabase
        .from('agent_api_logs')
        .select(`
          *,
          agent_api_keys (
            name,
            permissions
          )
        `)
        .eq('id', logId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!logId,
  });
};
