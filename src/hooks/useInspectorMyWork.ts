import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyInspection {
  id: string;
  agency_id: string;
  property_id: string | null;
  unit_id: string | null;
  inspector_id: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  reschedule_reason: string | null;
  previous_inspection_id: string | null;
  created_at: string;
}

export interface MyPerformance {
  total_completed: number;
  pass_rate: number;
  avg_days_to_complete: number;
  on_time_pct: number;
  completed_this_month: number;
  scheduled: number;
  in_progress: number;
  overdue: number;
}

export function useInspectorMyWork(agencyId: string, staffId: string) {
  const [inspections, setInspections] = useState<MyInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId || !staffId) return;
    setLoading(true);
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('inspector_id', staffId)
      .order('scheduled_date', { ascending: true });
    setInspections((data as unknown as MyInspection[]) || []);
    setLoading(false);
  }, [agencyId, staffId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const performance: MyPerformance = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = inspections.filter(i => i.status === 'completed');
    const passes = completed.filter(i => i.result === 'pass').length;
    const completedMonth = completed.filter(i => i.completed_date && new Date(i.completed_date) >= monthStart).length;
    const days = completed
      .filter(i => i.scheduled_date && i.completed_date)
      .map(i => (new Date(i.completed_date!).getTime() - new Date(i.scheduled_date!).getTime()) / 86400000);
    const onTime = days.filter(d => d <= 1).length;
    const overdue = inspections.filter(i =>
      i.status !== 'completed' && i.status !== 'cancelled' &&
      i.scheduled_date && new Date(i.scheduled_date) < now
    ).length;
    return {
      total_completed: completed.length,
      pass_rate: completed.length ? Math.round((passes / completed.length) * 100) : 0,
      avg_days_to_complete: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : 0,
      on_time_pct: days.length ? Math.round((onTime / days.length) * 100) : 0,
      completed_this_month: completedMonth,
      scheduled: inspections.filter(i => i.status === 'scheduled').length,
      in_progress: inspections.filter(i => i.status === 'in_progress').length,
      overdue,
    };
  }, [inspections]);

  return { inspections, loading, performance, refetch: fetchData };
}
