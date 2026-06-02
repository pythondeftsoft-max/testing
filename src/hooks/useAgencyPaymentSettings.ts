import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DisbursementRail = 'nacha' | 'manual' | 'ap_export' | 'checkbook';
export type ApExportFormat = 'yardi_csv' | 'qb_iif' | 'generic_csv';

export interface AgencyPaymentSettings {
  agency_id: string;
  primary_rail: DisbursementRail;
  ap_export_format: ApExportFormat | null;
  manual_default_memo: string | null;
  notify_landlord_on_disburse: boolean;
}

const DEFAULTS = (agencyId: string): AgencyPaymentSettings => ({
  agency_id: agencyId,
  primary_rail: 'nacha',
  ap_export_format: 'generic_csv',
  manual_default_memo: 'HAP Payment',
  notify_landlord_on_disburse: true,
});

export function useAgencyPaymentSettings(agencyId: string | null) {
  const [settings, setSettings] = useState<AgencyPaymentSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('agency_payment_settings')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (error) console.error(error);
    setSettings(data || DEFAULTS(agencyId));
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const save = async (next: Partial<AgencyPaymentSettings>) => {
    if (!agencyId) return false;
    setSaving(true);
    const payload = { ...DEFAULTS(agencyId), ...settings, ...next, agency_id: agencyId };
    const { error } = await (supabase as any)
      .from('agency_payment_settings')
      .upsert(payload, { onConflict: 'agency_id' });
    setSaving(false);
    if (error) { toast.error('Save failed: ' + error.message); return false; }
    toast.success('Payment settings saved');
    await load();
    return true;
  };

  return { settings, loading, saving, save, reload: load };
}
