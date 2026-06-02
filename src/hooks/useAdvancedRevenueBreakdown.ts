import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfYear } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export type AdvancedRevenueRange = '30d' | '90d' | 'ytd' | '12m';

export interface AdvancedRevenueRow {
  source_key: string;
  source_label: string;
  month: string; // ISO date string
  amount: number;
  payments_count: number;
}

export interface AdvancedRevenueData {
  total: number;
  bySource: { key: string; label: string; value: number; color: string }[];
  trendByMonth: Array<{
    month: string;
    tenant_rent: number;
    hap_payments: number;
    late_fees: number;
    platform_fees: number;
    tenant_fees: number;
  }>;
}

const SOURCE_COLORS: Record<string, string> = {
  tenant_rent: 'hsl(var(--primary))',
  hap_payments: 'hsl(var(--secondary))',
  late_fees: 'hsl(var(--destructive))',
  platform_fees: 'hsl(var(--muted-foreground))',
  tenant_fees: 'hsl(var(--accent))',
};

function getRange(range: AdvancedRevenueRange): { start: Date; end: Date } {
  const end = new Date();
  switch (range) {
    case '30d':
      return { start: subDays(end, 30), end };
    case '90d':
      return { start: subDays(end, 90), end };
    case 'ytd':
      return { start: startOfYear(end), end };
    case '12m':
      return { start: subDays(end, 365), end };
    default:
      return { start: subDays(end, 30), end };
  }
}

export function useAdvancedRevenueBreakdown(
  landlordId: string,
  portfolioId: string | undefined,
  range: AdvancedRevenueRange
) {
  const { start, end } = getRange(range);

  // Normalize portfolio selection: undefined/"everything"/"all" => null
  const normalizedPortfolio = useMemo(() => {
    if (!portfolioId) return null;
    const v = String(portfolioId).toLowerCase();
    if (!v || v === 'everything' || v === 'all' || v === 'none') return null;
    return portfolioId;
  }, [portfolioId]);

  return useQuery({
    queryKey: ['advanced-revenue', landlordId, normalizedPortfolio, range, start.toISOString(), end.toISOString()],
    enabled: Boolean(landlordId),
    queryFn: async (): Promise<AdvancedRevenueData> => {
      const { data, error } = await supabase.rpc('get_revenue_breakdown_advanced', {
        p_landlord_id: landlordId,
        p_portfolio_id: normalizedPortfolio,
        p_start_date: start.toISOString().slice(0, 10),
        p_end_date: end.toISOString().slice(0, 10),
      });

      if (error) throw error;

      const rows = (data || []) as AdvancedRevenueRow[];

      // Totals by source
      const totalsBySource = new Map<string, { label: string; value: number }>();
      for (const r of rows) {
        const cur = totalsBySource.get(r.source_key) || { label: r.source_label, value: 0 };
        cur.value += Number(r.amount || 0);
        totalsBySource.set(r.source_key, cur);
      }

      const bySource = Array.from(totalsBySource.entries())
        .map(([key, { label, value }]) => ({ key, label, value, color: SOURCE_COLORS[key] || 'hsl(var(--primary))' }))
        .filter(s => s.value > 0)
        .sort((a, b) => b.value - a.value);

      const total = bySource.reduce((sum, s) => sum + s.value, 0);

      // Trend by month
      const monthMap = new Map<string, { tenant_rent: number; hap_payments: number; late_fees: number; platform_fees: number; tenant_fees: number }>();
      for (const r of rows) {
        const m = r.month;
        const entry = monthMap.get(m) || { tenant_rent: 0, hap_payments: 0, late_fees: 0, platform_fees: 0, tenant_fees: 0 };
        const amt = Number(r.amount || 0);
        switch (r.source_key) {
          case 'tenant_rent':
            entry.tenant_rent += amt; break;
          case 'hap_payments':
            entry.hap_payments += amt; break;
          case 'late_fees':
            entry.late_fees += amt; break;
          case 'platform_fees':
            entry.platform_fees += amt; break;
          case 'tenant_fees':
            entry.tenant_fees += amt; break;
        }
        monthMap.set(m, entry);
      }

      const trendByMonth = Array.from(monthMap.entries())
        .map(([month, vals]) => ({ month, ...vals }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return { total, bySource, trendByMonth };
    },
    staleTime: 60_000,
  });
}
