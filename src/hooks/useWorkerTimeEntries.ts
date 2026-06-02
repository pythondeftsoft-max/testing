import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerTimeEntry {
  id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  created_at: string;
  worker_name?: string;
}

export function useWorkerTimeEntries(month?: Date) {
  const targetMonth = month || new Date();
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString();
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  return useQuery({
    queryKey: ['worker-time-entries', startOfMonth, endOfMonth],
    queryFn: async () => {
      const { data: entries, error } = await supabase
        .from('worker_time_entries')
        .select('*')
        .gte('clock_in', startOfMonth)
        .lte('clock_in', endOfMonth)
        .order('clock_in', { ascending: false });

      if (error) throw error;

      // Fetch worker names
      const workerIds = [...new Set((entries || []).map(e => e.worker_id))];
      let profileMap: Record<string, string> = {};
      
      if (workerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', workerIds);
        
        (profiles || []).forEach(p => {
          profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
        });
      }

      return (entries || []).map(e => ({
        ...e,
        worker_name: profileMap[e.worker_id] || 'Unknown',
      })) as WorkerTimeEntry[];
    },
  });
}
