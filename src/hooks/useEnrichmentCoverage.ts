import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Coverage stats for the prospecting enrichment pipeline.
 *
 * Denominator = active HUD PHAs (registry_status = 'active_hud'), not the raw
 * housing_authorities count. Stale rows (PHAs no longer in the HUD roster) are
 * intentionally excluded so coverage percentages reflect what we *can* enrich.
 *
 * Unit data lives across two surfaces:
 *   1. `housing_authorities.metadata` — section8_units, total_units, voucher_count,
 *       psh_total_units, population, mtw, semap_score (set during HUD import + enrichment)
 *   2. `pha_enrichment` — admin fees, SEMAP, MTW, utilization, leased/authorized units, web scan
 */
export function useEnrichmentCoverage() {
  return useQuery({
    queryKey: ['pha-enrichment-coverage'],
    queryFn: async () => {
      // Denominator: active HUD PHAs only (excludes 118 stale rows)
      const { count: activeTotal } = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true })
        .eq('registry_status', 'active_hud');

      // Raw total (including stale) — for transparency only
      const { count: rawTotal } = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true });

      // Active PHAs that have any HUD unit signal in metadata
      const { count: withRegistryUnits } = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true })
        .eq('registry_status', 'active_hud')
        .or(
          [
            'metadata->>voucher_count.gt.0',
            'metadata->>section8_units.gt.0',
            'metadata->>total_units.gt.0',
            'metadata->>psh_total_units.gt.0',
          ].join(','),
        );

      const { count: withPopulation } = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true })
        .eq('registry_status', 'active_hud')
        .not('metadata->population', 'is', null);

      // Websites: stored in metadata->>website on housing_authorities
      const { count: withWebsiteUrl } = await supabase
        .from('housing_authorities')
        .select('id', { count: 'exact', head: true })
        .eq('registry_status', 'active_hud')
        .not('metadata->>website', 'is', null);

      // Get the active PHA codes so we can correlate enrichment counts
      // (pha_enrichment is keyed by pha_code, not by registry_status).
      // Counts below are over the full pha_enrichment table; in practice every
      // enrichment row maps to an active PHA by construction, so the totals match.

      let withEnrichmentRow = 0;
      let withWebIntel = 0;
      let withSemap = 0;
      let withVoucherEnriched = 0;
      let withAdminFees = 0;
      let withOfficialWallet = 0;
      let withFallbackWallet = 0;
      let withVoucherUtilization = 0;
      let mtwCount = 0;
      try {
        const [
          { count: c1 },
          { count: c2 },
          { count: c3 },
          { count: c4 },
          { count: c5 },
          { count: c6a },
          { count: c6b },
          { count: c8 },
          { count: c9 },
        ] = await Promise.all([
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).not('enriched_at', 'is', null),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).not('website_enriched_at', 'is', null),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).not('semap_score', 'is', null),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).or('leased_units.gt.0,authorized_units.gt.0'),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).not('admin_fee_col_a', 'is', null),
          // Split the SaaS wallet count into two separate .gt() queries.
          // PostgREST .or() across two numeric columns with .gt.0 silently
          // mis-counts when one column is null on most rows.
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).gt('saas_wallet_high', 0),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).gt('saas_wallet_high_fallback', 0),
          // Voucher utilization = leased/authorized ratio computable
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).gt('leased_units', 0).gt('authorized_units', 0),
          (supabase as any).from('pha_enrichment').select('pha_code', { count: 'exact', head: true }).eq('is_mtw', true),
        ]);
        withEnrichmentRow = c1 ?? 0;
        withWebIntel = c2 ?? 0;
        withSemap = c3 ?? 0;
        withVoucherEnriched = c4 ?? 0;
        withAdminFees = c5 ?? 0;
        withOfficialWallet = c6a ?? 0;
        withFallbackWallet = c6b ?? 0;
        withVoucherUtilization = c8 ?? 0;
        mtwCount = c9 ?? 0;
      } catch {
        // table may not exist yet
      }

      // Combined SaaS wallet coverage = official OR fallback. Since fallback is
      // always populated when official is, fallback count is effectively the
      // upper bound; use max() to be safe.
      const withSaasWalletEstimate = Math.max(withOfficialWallet, withFallbackWallet);

      // Last completed run summary
      let lastRun: { finishedAt: string | null; updated: number } | null = null;
      try {
        const { data } = await (supabase as any)
          .from('pha_enrichment_jobs')
          .select('finished_at, updated_count')
          .eq('status', 'completed')
          .order('finished_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          lastRun = { finishedAt: data.finished_at, updated: data.updated_count ?? 0 };
        }
      } catch {
        // ignore
      }

      const t = activeTotal ?? 0;
      const registryUnits = withRegistryUnits ?? 0;
      const p = withPopulation ?? 0;
      const websiteCount = withWebsiteUrl ?? 0;
      const vouchers = Math.max(registryUnits, withVoucherEnriched);
      // "Enriched" = best signal we have for any HUD-derived data on the registry row
      const enriched = Math.max(registryUnits, p, withEnrichmentRow);

      return {
        total: t,                       // active HUD PHAs (denominator everyone uses)
        rawTotal: rawTotal ?? 0,        // includes stale, for transparency
        withVouchers: registryUnits,
        withPopulation: p,
        withEnrichmentRow,
        withSemap,
        withVoucherEnriched: vouchers,
        withWebIntel,
        withAdminFees,
        withSaasWalletEstimate,
        withOfficialWallet,
        withFallbackWallet,
        withWebsiteUrl: websiteCount,
        withVoucherUtilization,
        mtwCount,
        enriched,
        pct: t > 0 ? enriched / t : 0,
        webPct: t > 0 ? withWebIntel / t : 0,
        semapPct: t > 0 ? withSemap / t : 0,
        voucherPct: t > 0 ? vouchers / t : 0,
        adminFeePct: t > 0 ? withAdminFees / t : 0,
        saasWalletPct: t > 0 ? withSaasWalletEstimate / t : 0,
        websitePct: t > 0 ? websiteCount / t : 0,
        utilizationPct: t > 0 ? withVoucherUtilization / t : 0,
        lastRun,
      };
    },
    staleTime: 30_000,
  });
}
