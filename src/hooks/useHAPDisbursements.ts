import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HAPDisbursement {
  id: string;
  batch_id: string;
  agency_id: string;
  landlord_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  period_month: string;
  amount: number;
  rail: 'nacha' | 'manual' | 'ap_export';
  status: 'pending' | 'paid' | 'bounced' | 'voided';
  reference_number: string | null;
  payment_method: string | null;
  memo: string | null;
  paid_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  notified_landlord_at: string | null;
  created_at: string;
}

export function useHAPDisbursements(batchId: string | null) {
  const [disbursements, setDisbursements] = useState<HAPDisbursement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('hap_disbursements')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at');
    if (error) { toast.error('Failed to load disbursements'); console.error(error); }
    setDisbursements((data as HAPDisbursement[]) || []);
    setLoading(false);
  }, [batchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const disburse = async () => {
    if (!batchId) return null;
    const { data, error } = await supabase.functions.invoke('disburse-batch', {
      body: { batch_id: batchId },
    });
    if (error || !data?.success) {
      toast.error('Disburse failed: ' + (error?.message || data?.error || 'unknown'));
      return null;
    }
    toast.success(`Created ${data.line_count} disbursement lines`);

    // Auto-download AP export artifact if returned
    if (data.artifact?.content) {
      try {
        const blob = new Blob([data.artifact.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.artifact.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) { console.error('artifact download failed', e); }
    }

    await fetch();
    return data;
  };

  const markPaid = async (ids: string[], reference?: string) => {
    const { data, error } = await supabase.functions.invoke('mark-disbursements-paid', {
      body: { disbursement_ids: ids, reference_number: reference },
    });
    if (error || !data?.success) {
      toast.error('Mark paid failed: ' + (error?.message || data?.error || 'unknown'));
      return false;
    }
    toast.success(`Marked ${data.updated} as paid`);
    await fetch();
    return true;
  };

  const markBatchPaid = async () => {
    if (!batchId) return false;
    const { data, error } = await supabase.functions.invoke('mark-disbursements-paid', {
      body: { batch_id: batchId, all_pending: true },
    });
    if (error || !data?.success) {
      toast.error('Mark batch paid failed: ' + (error?.message || data?.error || 'unknown'));
      return false;
    }
    toast.success(`Marked ${data.updated} lines paid`);
    await fetch();
    return true;
  };

  const markBounced = async (id: string, reason: string) => {
    const { data, error } = await supabase.functions.invoke('bounce-disbursement', {
      body: { disbursement_id: id, reason },
    });
    if (error || !data?.success) {
      toast.error('Mark bounced failed: ' + (error?.message || data?.error || 'unknown'));
      return false;
    }
    toast.success('Line marked as bounced');
    await fetch();
    return true;
  };

  return { disbursements, loading, disburse, markPaid, markBatchPaid, markBounced, refetch: fetch };
}
