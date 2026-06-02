import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RenewalRow {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  landlord_id: string | null;
  status: string | null;
  current_lease_end: string | null;
  proposed_start_date: string | null;
  updated_at: string;
  created_at: string;
  property_address?: string | null;
  tenant_name?: string | null;
  days_until_expiry: number | null;
  days_since_activity: number;
  risk_score: number;
  risk_band: 'low' | 'medium' | 'high';
  bucket: 'expiring_30' | 'expiring_60' | 'expiring_90' | 'in_flight' | 'stalled' | 'completed' | 'other';
}

const computeRisk = (
  daysUntilExpiry: number | null,
  daysSinceActivity: number,
  status: string | null
): { score: number; band: 'low' | 'medium' | 'high' } => {
  let score = 0;
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry <= 30) score += 40;
    else if (daysUntilExpiry <= 60) score += 25;
    else if (daysUntilExpiry <= 90) score += 10;
  }
  if (daysSinceActivity > 30) score += 25;
  else if (daysSinceActivity > 14) score += 15;
  if (status && ['stalled', 'pending', 'initiated', null].includes(status as any)) score += 10;
  const band = score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  return { score, band };
};

const bucketOf = (
  daysUntilExpiry: number | null,
  daysSinceActivity: number,
  status: string | null
): RenewalRow['bucket'] => {
  if (status === 'completed' || status === 'signed' || status === 'renewed') return 'completed';
  if (daysSinceActivity > 14 && status !== 'completed') return 'stalled';
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry <= 30) return 'expiring_30';
    if (daysUntilExpiry <= 60) return 'expiring_60';
    if (daysUntilExpiry <= 90) return 'expiring_90';
  }
  if (status && ['in_negotiation', 'notified', 'in_progress'].includes(status)) return 'in_flight';
  return 'other';
};

export const useRenewalIntelligence = (agencyId: string) => {
  return useQuery({
    queryKey: ['renewal-intelligence', agencyId],
    queryFn: async (): Promise<RenewalRow[]> => {
      // READ-ONLY: pull existing renewals + properties; no writes
      const { data: renewals, error } = await supabase
        .from('lease_renewals')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const propertyIds = Array.from(
        new Set((renewals || []).map((r: any) => r.property_id).filter(Boolean))
      );

      let propMap = new Map<string, any>();
      if (propertyIds.length) {
        const { data: props } = await supabase
          .from('properties')
          .select('id, address, lease_end_date')
          .in('id', propertyIds as string[]);
        (props || []).forEach((p: any) => propMap.set(p.id, p));
      }

      const now = Date.now();
      return (renewals || []).map((r: any): RenewalRow => {
        const prop = r.property_id ? propMap.get(r.property_id) : null;
        const leaseEnd = r.current_lease_end || prop?.lease_end_date;
        const daysUntilExpiry = leaseEnd
          ? Math.floor((new Date(leaseEnd).getTime() - now) / 86400000)
          : null;
        const daysSinceActivity = Math.floor(
          (now - new Date(r.updated_at).getTime()) / 86400000
        );
        const { score, band } = computeRisk(daysUntilExpiry, daysSinceActivity, r.status);
        return {
          id: r.id,
          property_id: r.property_id,
          tenant_id: r.tenant_id,
          landlord_id: r.landlord_id,
          status: r.status,
          current_lease_end: leaseEnd,
          proposed_start_date: r.proposed_start_date,
          updated_at: r.updated_at,
          created_at: r.created_at,
          property_address: prop?.address,
          days_until_expiry: daysUntilExpiry,
          days_since_activity: daysSinceActivity,
          risk_score: score,
          risk_band: band,
          bucket: bucketOf(daysUntilExpiry, daysSinceActivity, r.status),
        };
      });
    },
    enabled: !!agencyId,
  });
};
