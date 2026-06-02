import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NachaSettingsRow {
  id?: string;
  agency_id: string;
  odfi_routing_number: string | null;
  odfi_name: string | null;
  originator_company_name: string | null;
  originator_company_id: string | null;
  originator_account_number: string | null;
  originator_account_type: string;
  immediate_destination: string | null;
  immediate_origin: string | null;
  service_class_code: string;
  sec_code: string;
  is_active: boolean;
  test_mode: boolean;
  last_file_id_modifier: string;
}

const DEFAULTS = (agencyId: string): NachaSettingsRow => ({
  agency_id: agencyId,
  odfi_routing_number: '',
  odfi_name: '',
  originator_company_name: '',
  originator_company_id: '',
  originator_account_number: '',
  originator_account_type: 'checking',
  immediate_destination: '',
  immediate_origin: '',
  service_class_code: '220',
  sec_code: 'PPD',
  is_active: false,
  test_mode: true,
  last_file_id_modifier: 'A',
});

export function useNachaSettings(agencyId: string | null) {
  const [settings, setSettings] = useState<NachaSettingsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('agency_nacha_settings')
      .select('*')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (error) {
      console.error(error);
      toast.error('Failed to load NACHA settings');
    }
    setSettings(data || DEFAULTS(agencyId));
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const save = async (next: Partial<NachaSettingsRow>) => {
    if (!agencyId) return false;
    setSaving(true);
    const payload = { ...DEFAULTS(agencyId), ...settings, ...next, agency_id: agencyId };
    const { error } = await (supabase as any)
      .from('agency_nacha_settings')
      .upsert(payload, { onConflict: 'agency_id' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
      return false;
    }
    toast.success('NACHA settings saved');
    await load();
    return true;
  };

  const bumpFileIdModifier = async (next: string) => {
    if (!agencyId) return;
    await (supabase as any)
      .from('agency_nacha_settings')
      .update({ last_file_id_modifier: next })
      .eq('agency_id', agencyId);
  };

  return { settings, loading, saving, save, reload: load, bumpFileIdModifier };
}
