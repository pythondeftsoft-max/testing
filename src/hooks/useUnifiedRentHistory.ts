import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { groupByAddress } from '@/hooks/useSelfReportedRent';
import type { SelfReportedRentEntry } from '@/hooks/useSelfReportedRent';

export type UnifiedRentEntry = SelfReportedRentEntry & {
  source: 'self_reported' | 'platform';
};

/** Map a rent_payment row into the unified display shape */
function mapPlatformPayment(payment: {
  id: string;
  tenant_id: string | null;
  property_address: string | null;
  amount: number;
  currency_code: string | null;
  payment_date: string;
  status: string;
  notes: string | null;
  created_at: string | null;
}): UnifiedRentEntry {
  const date = new Date(payment.payment_date);
  return {
    id: payment.id,
    user_id: payment.tenant_id ?? '',
    address_text: payment.property_address ?? 'Unknown Property',
    landlord_name: null,
    monthly_rent: payment.amount,
    currency_code: payment.currency_code ?? 'USD',
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    payment_date: payment.payment_date,
    proof_url: null,
    verification_status: 'platform_verified' as any,
    verified_by: null,
    verified_at: payment.payment_date,
    notes: payment.notes,
    plaid_transaction_id: null,
    plaid_transaction_data: null,
    created_at: payment.created_at ?? payment.payment_date,
    source: 'platform',
  };
}

export const useUnifiedRentHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unified-rent-history', user?.id],
    queryFn: async () => {
      // Fetch both sources in parallel
      const [selfReportedResult, platformResult] = await Promise.all([
        supabase
          .from('self_reported_rent')
          .select('*')
          .eq('user_id', user!.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        supabase
          .from('rent_payments')
          .select('id, tenant_id, property_address, amount, currency_code, payment_date, status, notes, created_at')
          .eq('tenant_id', user!.id)
          .eq('status', 'completed')
          .order('payment_date', { ascending: false }),
      ]);

      if (selfReportedResult.error) throw selfReportedResult.error;
      if (platformResult.error) throw platformResult.error;

      const selfReported: UnifiedRentEntry[] = (selfReportedResult.data ?? []).map(e => ({
        ...e,
        verification_status: e.verification_status as SelfReportedRentEntry['verification_status'],
        plaid_transaction_data: e.plaid_transaction_data as Record<string, unknown> | null,
        source: 'self_reported' as const,
      }));

      const platform: UnifiedRentEntry[] = (platformResult.data ?? []).map(mapPlatformPayment);

      // Combine and re-sort by year desc, month desc
      const all = [...selfReported, ...platform].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      return all;
    },
    enabled: !!user?.id,
  });
};

/** Group unified entries by address */
export const groupUnifiedByAddress = (entries: UnifiedRentEntry[]) => {
  const grouped: Record<string, UnifiedRentEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.address_text]) grouped[entry.address_text] = [];
    grouped[entry.address_text].push(entry);
  }
  return grouped;
};
