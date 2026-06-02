import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Inspection {
  id: string;
  agency_id: string;
  property_id: string | null;
  unit_id: string | null;
  inspector_id: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  hqs_checklist: Record<string, unknown> | null;
  notes: string | null;
  reschedule_reason: string | null;
  previous_inspection_id: string | null;
  created_at: string;
}

export function useInspections(agencyId: string, role: string, staffId: string) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspections = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    let query = supabase
      .from('inspections')
      .select('*')
      .eq('agency_id', agencyId)
      .order('scheduled_date', { ascending: true });

    // Inspectors only see their own
    if (role === 'inspector') {
      query = query.eq('inspector_id', staffId);
    }

    const { data, error } = await query;
    if (error) toast.error('Failed to load inspections');
    setInspections((data as unknown as Inspection[]) || []);
    setLoading(false);
  }, [agencyId, role, staffId]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const updateInspection = async (id: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from('inspections').update(updates as any).eq('id', id);
    if (error) { toast.error('Failed to update inspection'); return; }
    toast.success('Inspection updated');
    fetchInspections();
  };

  const reschedule = async (id: string, newDate: string, reason: string) => {
    const { error } = await supabase.from('inspections').update({
      scheduled_date: newDate,
      status: 'scheduled',
      reschedule_reason: reason,
    }).eq('id', id);
    if (error) { toast.error('Failed to reschedule'); return; }
    toast.success('Inspection rescheduled');
    fetchInspections();
  };

  return { inspections, loading, refetch: fetchInspections, updateInspection, reschedule };
}
