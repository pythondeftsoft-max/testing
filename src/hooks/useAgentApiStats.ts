import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiStats {
  total_requests: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  top_endpoints: Array<{ endpoint: string; count: number }>;
  requests_by_day: Array<{ date: string; count: number }>;
  error_types: Array<{ response_status: number; count: number }>;
}

export type TimeRange = '24h' | '7d' | '30d';

const timeRangeToInterval: Record<TimeRange, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export const useAgentApiStats = (timeRange: TimeRange = '24h') => {
  return useQuery({
    queryKey: ['agent-api-stats', timeRange],
    queryFn: async () => {
      const interval = timeRangeToInterval[timeRange];

      const { data, error } = await (supabase as any).rpc('get_agent_api_stats', {
        time_range: interval,
      });

      if (error) {
        console.error('Error fetching API stats:', error);
        // Return default values on error
        return {
          total_requests: 0,
          success_count: 0,
          error_count: 0,
          avg_duration_ms: 0,
          top_endpoints: [],
          requests_by_day: [],
          error_types: [],
        } as ApiStats;
      }

      return data as ApiStats;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useActiveApiKeysCount = () => {
  return useQuery({
    queryKey: ['active-api-keys-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('agent_api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
  });
};
