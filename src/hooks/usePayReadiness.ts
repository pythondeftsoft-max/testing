import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnreadyLandlord {
  id: string;
  landlord_id: string | null;
  landlord_name: string;
  pay_hold_reason: string | null;
}

export interface PayReadinessState {
  loading: boolean;
  /** Map of landlord_id (the underlying user id used by HAP items) -> reason. Present = NOT pay-ready. */
  unreadyByLandlordId: Map<string, string | null>;
  /** Flat list for banners. */
  unready: UnreadyLandlord[];
  /** Whether the agency has opted into hard-blocking disbursement. */
  hardBlock: boolean;
}

/**
 * Shared hook: given an agency and the landlord_ids appearing in a HAP batch,
 * returns which ones are NOT pay-ready and whether the agency hard-blocks
 * disbursement when that happens.
 *
 * Used by PayReadyWarningBanner (top-of-batch alert), HAPBatchDetail (per-row
 * dot + advance button gate), and any future place that needs the same view.
 */
export function usePayReadiness(agencyId: string, landlordIds: string[]): PayReadinessState {
  const [unready, setUnready] = useState<UnreadyLandlord[]>([]);
  const [unreadyByLandlordId, setMap] = useState<Map<string, string | null>>(new Map());
  const [hardBlock, setHardBlock] = useState(false);
  const [loading, setLoading] = useState(false);

  const key = landlordIds.join('|');

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [llRes, agencyRes] = await Promise.all([
        landlordIds.length > 0
          ? supabase
              .from('agency_landlords')
              .select('id, landlord_id, landlord_name, pay_ready, pay_hold_reason')
              .eq('agency_id', agencyId)
              .in('landlord_id', landlordIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('housing_authorities')
          .select('hap_block_unready_landlords')
          .eq('id', agencyId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const rows = ((llRes.data || []) as any[]).filter((l) => !l.pay_ready);
      const m = new Map<string, string | null>();
      rows.forEach((l) => {
        if (l.landlord_id) m.set(l.landlord_id, l.pay_hold_reason ?? null);
      });
      setMap(m);
      setUnready(
        rows.map((l) => ({
          id: l.id,
          landlord_id: l.landlord_id,
          landlord_name: l.landlord_name,
          pay_hold_reason: l.pay_hold_reason,
        })),
      );
      setHardBlock(Boolean((agencyRes.data as any)?.hap_block_unready_landlords));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, key]);

  return { loading, unready, unreadyByLandlordId, hardBlock };
}
