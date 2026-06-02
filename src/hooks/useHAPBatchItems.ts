import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HAPBatchItem {
  id: string;
  batch_id: string;
  tenant_lease_id: string | null;
  landlord_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  voucher_id: string | null;
  hap_amount: number;
  tenant_portion: number;
  gross_rent: number;
  utility_allowance: number;
  adjustment_amount: number;
  adjustment_reason: string | null;
  net_payment: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useHAPBatchItems(batchId: string | null) {
  const [items, setItems] = useState<HAPBatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('hap_batch_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('landlord_id');

    if (error) { toast.error('Failed to load batch items'); console.error(error); }
    setItems((data as HAPBatchItem[]) || []);
    setLoading(false);
  }, [batchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const insertItems = async (batchItems: Omit<HAPBatchItem, 'id' | 'net_payment' | 'created_at' | 'updated_at'>[]) => {
    const { error } = await supabase
      .from('hap_batch_items')
      .insert(batchItems);

    if (error) { toast.error('Failed to insert batch items'); return false; }
    await fetch();
    return true;
  };

  const updateItem = async (itemId: string, updates: { adjustment_amount?: number; adjustment_reason?: string; status?: string }) => {
    const { error } = await supabase
      .from('hap_batch_items')
      .update(updates)
      .eq('id', itemId);

    if (error) { toast.error('Failed to update item'); return false; }
    await fetch();
    return true;
  };

  return { items, loading, insertItems, updateItem, refetch: fetch };
}
