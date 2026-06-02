import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfYear } from 'date-fns';

export type RevenueRange = '30d' | '90d' | 'ytd' | '12m';

export interface RevenueSourceItem {
  key: 'tenant_rent' | 'hap' | 'late_fees' | 'tenant_fees' | 'platform_fees';
  label: string;
  value: number;
  color: string; // Use design system tokens via CSS vars
}

export interface RevenueBreakdownData {
  total: number;
  sources: RevenueSourceItem[];
}

function getRangeDates(range: RevenueRange) {
  const end = new Date();
  let start: Date;
  switch (range) {
    case '30d':
      start = subDays(end, 30);
      break;
    case '90d':
      start = subDays(end, 90);
      break;
    case '12m':
      start = subDays(end, 365);
      break;
    case 'ytd':
    default:
      start = startOfYear(end);
      break;
  }
  const toDate = end.toISOString().slice(0, 10);
  const fromDate = start.toISOString().slice(0, 10);
  return { fromDate, toDate };
}

export function useRevenueBreakdown(landlordId: string, portfolioId: string | undefined, range: RevenueRange) {
  const { fromDate, toDate } = useMemo(() => getRangeDates(range), [range]);

  return useQuery({
    queryKey: ['revenue-breakdown', landlordId, portfolioId, fromDate, toDate],
    enabled: !!landlordId,
    staleTime: 60_000,
    queryFn: async (): Promise<RevenueBreakdownData> => {
      // 1) Get property ids for this landlord (+portfolio if provided)
      const propsQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId);

      if (portfolioId) {
        propsQuery.eq('portfolio_id', portfolioId);
      }

      // Optional hygiene filters if present in schema
      propsQuery.is('deleted_at', null);

      const { data: props, error: propsErr } = await propsQuery;
      if (propsErr) throw propsErr;
      const propertyIds = (props || []).map((p: any) => p.id);
      if (propertyIds.length === 0) {
        return {
          total: 0,
          sources: [
            { key: 'tenant_rent', label: 'Tenant Rent', value: 0, color: 'hsl(var(--primary))' },
            { key: 'hap', label: 'HAP Payments', value: 0, color: 'hsl(var(--accent))' },
            { key: 'late_fees', label: 'Late Fees', value: 0, color: 'hsl(var(--destructive))' },
            { key: 'tenant_fees', label: 'Tenant Fees', value: 0, color: 'hsl(var(--secondary))' },
            { key: 'platform_fees', label: 'Platform Fees', value: 0, color: 'hsl(var(--muted-foreground))' },
          ],
        };
      }

      // 2) Rent payments within range
      const { data: rentPayments, error: rentErr } = await supabase
        .from('rent_payments')
        .select('amount, late_fee_amount, tenant_fee_amount, platform_fee_amount, payment_date, status, property_id')
        .in('property_id', propertyIds)
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate)
        .eq('status', 'completed');
      if (rentErr) throw rentErr;

      // 3) HAP payments within range
      const { data: hapPayments, error: hapErr } = await supabase
        .from('hap_payments')
        .select('actual_amount, expected_amount, payment_date, property_id, payment_status')
        .in('property_id', propertyIds)
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate);
      if (hapErr) throw hapErr;

      // Aggregate client-side
      let tenantRent = 0;
      let lateFees = 0;
      let tenantFees = 0;
      let platformFees = 0;

      (rentPayments || []).forEach((rp: any) => {
        tenantRent += Number(rp.amount || 0);
        lateFees += Number(rp.late_fee_amount || 0);
        tenantFees += Number(rp.tenant_fee_amount || 0);
        platformFees += Number(rp.platform_fee_amount || 0);
      });

      let hapTotal = 0;
      (hapPayments || []).forEach((hp: any) => {
        const amt = hp.actual_amount ?? hp.expected_amount ?? 0;
        // If payment_status exists, optionally only count settled
        hapTotal += Number(amt || 0);
      });

      const sources: RevenueSourceItem[] = [
        { key: 'tenant_rent', label: 'Tenant Rent', value: tenantRent, color: 'hsl(var(--primary))' },
        { key: 'hap', label: 'HAP Payments', value: hapTotal, color: 'hsl(var(--accent))' },
        { key: 'late_fees', label: 'Late Fees', value: lateFees, color: 'hsl(var(--destructive))' },
        { key: 'tenant_fees', label: 'Tenant Fees', value: tenantFees, color: 'hsl(var(--secondary))' },
        { key: 'platform_fees', label: 'Platform Fees', value: platformFees, color: 'hsl(var(--muted-foreground))' },
      ];

      const total = sources.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);

      // Sort by value desc
      sources.sort((a, b) => b.value - a.value);

      return { total, sources };
    },
  });
}
