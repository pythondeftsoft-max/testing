import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface HAPBatch {
  id: string;
  agency_id: string;
  batch_number: string;
  period_month: string;
  status: string;
  total_amount: number;
  total_units: number;
  total_landlords: number;
  generated_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  disbursed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useHAPBatches(agencyId: string) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<HAPBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hap_payment_batches')
      .select('*')
      .eq('agency_id', agencyId)
      .order('period_month', { ascending: false });

    if (error) { toast.error('Failed to load HAP batches'); console.error(error); }
    setBatches((data as HAPBatch[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createBatch = async (periodMonth: string, batchNumber: string) => {
    const { data, error } = await supabase
      .from('hap_payment_batches')
      .insert({
        agency_id: agencyId,
        batch_number: batchNumber,
        period_month: periodMonth,
        generated_by: user?.id,
      })
      .select()
      .single();

    if (error) { toast.error('Failed to create batch: ' + error.message); return null; }
    toast.success('HAP batch created');
    await fetch();
    return data as HAPBatch;
  };

  const updateStatus = async (batchId: string, newStatus: string, totals?: { total_amount: number; total_units: number; total_landlords: number }) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'reviewed') updates.reviewed_by = user?.id;
    if (newStatus === 'approved') updates.approved_by = user?.id;
    if (newStatus === 'disbursed') updates.disbursed_at = new Date().toISOString();
    if (totals) Object.assign(updates, totals);

    const { error } = await supabase
      .from('hap_payment_batches')
      .update(updates)
      .eq('id', batchId);

    if (error) { toast.error('Failed to update batch status'); return false; }
    toast.success(`Batch status updated to ${newStatus}`);
    await fetch();
    return true;
  };

  const checkDuplicate = async (periodMonth: string) => {
    const { data } = await supabase
      .from('hap_payment_batches')
      .select('id, batch_number')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth);
    return data || [];
  };

  return { batches, loading, createBatch, updateStatus, checkDuplicate, refetch: fetch };
}
