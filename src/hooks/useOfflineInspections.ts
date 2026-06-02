import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheInspections, getCachedInspections, CachedInspection } from '@/lib/inspector/idb';
import { useOnlineStatus } from './useOnlineStatus';

export const useOfflineInspections = (inspectorId: string | undefined) => {
  const online = useOnlineStatus();
  const [inspections, setInspections] = useState<CachedInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    if (!inspectorId) return;
    setLoading(true);
    if (online) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const { data, error } = await supabase
        .from('inspections')
        .select('id, agency_id, scheduled_date, inspection_type, status, unit_id')
        .eq('inspector_id', inspectorId)
        .gte('scheduled_date', start)
        .lt('scheduled_date', end)
        .order('scheduled_date', { ascending: true });

      if (!error && data) {
        const mapped: CachedInspection[] = data.map((d: any) => ({
          id: d.id,
          agency_id: d.agency_id,
          scheduled_date: d.scheduled_date,
          inspection_type: d.inspection_type,
          status: d.status,
          unit_id: d.unit_id,
          cached_at: Date.now(),
        }));
        await cacheInspections(mapped);
        setInspections(mapped);
        setFromCache(false);
      } else {
        const cached = await getCachedInspections();
        setInspections(cached);
        setFromCache(true);
      }
    } else {
      const cached = await getCachedInspections();
      setInspections(cached);
      setFromCache(true);
    }
    setLoading(false);
  }, [inspectorId, online]);

  useEffect(() => {
    load();
  }, [load]);

  return { inspections, loading, fromCache, reload: load };
};
