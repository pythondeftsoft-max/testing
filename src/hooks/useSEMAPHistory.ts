import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SEMAPHistoryPoint {
  snapshot_date: string;
  reporting_period: string;
  total_score: number;
  total_max: number;
  percentage: number;
  passing: boolean;
  triggered_by: string;
}

export function useSEMAPHistory(agencyId: string, limit = 24) {
  const [history, setHistory] = useState<SEMAPHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('agency_semap_score_history')
        .select('snapshot_date, reporting_period, total_score, total_max, percentage, passing, triggered_by')
        .eq('agency_id', agencyId)
        .order('snapshot_date', { ascending: true })
        .limit(limit);
      if (!cancelled) {
        setHistory((data || []) as SEMAPHistoryPoint[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agencyId, limit]);

  return { history, loading };
}
