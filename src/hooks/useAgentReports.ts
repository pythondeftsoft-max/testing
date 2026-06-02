import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgentReport {
  id: string;
  agent_id: string;
  report_type: string;
  title: string;
  content: any;
  summary: string | null;
  created_at: string;
}

export function useAgentReports(reportType?: string) {
  return useQuery({
    queryKey: ['agent-reports', reportType],
    queryFn: async () => {
      let query = supabase
        .from('agent_reports' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (reportType) {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AgentReport[];
    },
  });
}
