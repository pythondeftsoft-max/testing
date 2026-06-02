import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scoreProspect, type ProspectStatus, type ScoringResult } from '@/lib/prospectScoring';
import { computePricing, type PricingResult } from '@/lib/prospectPricing';

export interface ProspectFilters {
  voucherMin: number;
  voucherMax: number;
  populationMin: number;
  populationMax: number;
  states: string[];
  semap: string[]; // empty = all
  mtwOnly: boolean;
  search: string;
  hideCustomers: boolean;
  hideUnknownVouchers: boolean;
  dataQuality: 'all' | 'verified' | 'estimated' | 'unknown';
  statuses: ProspectStatus[]; // empty = all
  minSaasWallet: number; // 0 = any
  noPortalOnly: boolean; // greenfield (no detected portal)
  registryStatuses: string[]; // empty = active_hud only (default); admin can include stale/manual/unknown
  showArchived: boolean; // default false
  dueOnly: boolean; // when true, only prospects with next_action_at <= today
}

export interface ProspectRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  pha_code: string | null;
  email: string | null;
  phone: string | null;
  is_onboarded: boolean | null;
  voucher_count: number | null;
  semap_score: string | null;
  mtw: boolean | null;
  population: number | null;
  ed_name: string | null;
  ed_email: string | null;
  ed_phone: string | null;
  registry_status: string | null;
  is_archived: boolean;
  metadata: Record<string, any>;
  // Enrichment
  enrichment: PhaEnrichment | null;
  pricing: PricingResult;
  prospect: {
    id: string;
    status: ProspectStatus;
    owner_user_id: string | null;
    next_action_at: string | null;
    last_contacted_at: string | null;
    pricing_override: {
      annual_usd?: number | null;
      setup_usd?: number | null;
      rationale?: string | null;
      set_by?: string | null;
      set_at?: string | null;
    } | null;
  } | null;
  scoring: ScoringResult;
}

export interface PhaEnrichment {
  pha_code: string;
  admin_fee_col_a: number | null;
  admin_fee_col_b: number | null;
  leased_units: number | null;
  authorized_units: number | null;
  utilization_pct: number | null;
  semap_score: number | null;
  semap_tier: string | null;
  is_mtw: boolean | null;
  avg_hap_per_unit: number | null;
  avg_tenant_rent: number | null;
  ed_name: string | null;
  ed_email: string | null;
  ed_phone: string | null;
  detected_software: string[] | null;
  detected_payment_method: string | null;
  has_online_portal: boolean | null;
  portal_vendor: string | null;
  latest_rfp_url: string | null;
  federal_funding_5yr: number | null;
  population: number | null;
  enriched_at: string | null;
  website_enriched_at: string | null;
  estimated_admin_budget_annual: number | null;
  saas_wallet_low: number | null;
  saas_wallet_high: number | null;
  estimated_admin_budget_fallback?: number | null;
  saas_wallet_low_fallback?: number | null;
  saas_wallet_high_fallback?: number | null;
}

export const DEFAULT_FILTERS: ProspectFilters = {
  voucherMin: 0,
  voucherMax: 5000,
  populationMin: 0,
  populationMax: 2_000_000,
  states: [],
  semap: [],
  mtwOnly: false,
  search: '',
  hideCustomers: true,
  hideUnknownVouchers: false,
  dataQuality: 'all',
  statuses: [],
  minSaasWallet: 0,
  noPortalOnly: false,
  registryStatuses: ['active_hud'],
  showArchived: false,
  dueOnly: false,
};

export const FILTER_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  patch: Partial<ProspectFilters>;
}> = [
  {
    id: 'sweet-spot',
    label: 'Sweet spot (100–1,200)',
    description: 'Mid-market PHAs with budget but room to modernize',
    patch: { voucherMin: 100, voucherMax: 1200, semap: [], mtwOnly: false, dataQuality: 'all' },
  },
  {
    id: 'greenfield-10k',
    label: '$10K+ greenfield',
    description: 'No detected tenant portal AND SaaS wallet above $10K — ripe for a sale',
    patch: { noPortalOnly: true, minSaasWallet: 10_000 },
  },
  {
    id: 'small',
    label: 'Small (under 250)',
    description: 'Smaller PHAs — quicker sales cycle',
    patch: { voucherMin: 0, voucherMax: 250, semap: [], mtwOnly: false },
  },
  {
    id: 'mid',
    label: 'Mid-market (250–1,500)',
    description: 'Core ICP with real budgets',
    patch: { voucherMin: 250, voucherMax: 1500, semap: [], mtwOnly: false },
  },
  {
    id: 'troubled',
    label: 'Troubled SEMAP',
    description: 'Highly motivated to switch vendors',
    patch: { semap: ['Troubled'], voucherMin: 0, voucherMax: 5000 },
  },
  {
    id: 'mtw',
    label: 'MTW innovators',
    description: 'Moving To Work — innovation budgets',
    patch: { mtwOnly: true, voucherMin: 0, voucherMax: 5000 },
  },
  {
    id: 'verified',
    label: 'HUD-verified only',
    description: 'Hide PHAs without confirmed voucher data',
    patch: { dataQuality: 'verified', hideUnknownVouchers: true },
  },
];

async function fetchAllAuthorities() {
  const all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('housing_authorities')
      .select('id, name, city, state, zip, pha_code, is_onboarded, metadata, registry_status, is_archived')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  // Admin-only PII fetch (email, phone) via privileged RPC
  if (all.length > 0) {
    const ids = all.map((r: any) => r.id);
    const { data: contacts } = await (supabase as any).rpc(
      'admin_get_housing_authority_contacts',
      { _ids: ids }
    );
    const byId = new Map<string, any>();
    (contacts ?? []).forEach((c: any) => byId.set(c.id, c));
    all.forEach((r: any) => {
      const c = byId.get(r.id);
      r.email = c?.email ?? null;
      r.phone = c?.phone ?? null;
    });
  }
  return all;
}

async function fetchAllProspectStatus() {
  const { data, error } = await supabase
    .from('pha_prospect_status')
    .select('id, housing_authority_id, status, owner_user_id, next_action_at, last_contacted_at, pricing_override');
  if (error) throw error;
  return data ?? [];
}

async function fetchAllEnrichment(): Promise<Map<string, PhaEnrichment>> {
  const map = new Map<string, PhaEnrichment>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await (supabase as any)
      .from('pha_enrichment')
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) {
      // Table may not exist yet on first deploy; fail soft
      console.warn('pha_enrichment fetch failed', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const r of data) map.set(r.pha_code, r as PhaEnrichment);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

export function useProspects(filters: ProspectFilters) {
  return useQuery({
    queryKey: ['admin-prospects', filters],
    queryFn: async (): Promise<ProspectRow[]> => {
      const [authorities, statuses, enrichmentMap] = await Promise.all([
        fetchAllAuthorities(),
        fetchAllProspectStatus(),
        fetchAllEnrichment(),
      ]);
      const statusMap = new Map(statuses.map((s: any) => [s.housing_authority_id, s]));

      const rows: ProspectRow[] = authorities.map((a: any) => {
        const meta = a.metadata ?? {};
        const enrichment = a.pha_code ? enrichmentMap.get(a.pha_code) ?? null : null;

        // Resolve a usable unit/voucher count from any available signal:
        // pha_enrichment.leased_units → authorized_units → metadata.voucher_count
        // → metadata.section8_units → metadata.psh_total_units → metadata.total_units
        const numericMeta = (k: string): number | null => {
          const v = meta?.[k];
          if (typeof v === 'number' && v > 0) return v;
          if (typeof v === 'string' && /^\d+$/.test(v)) {
            const n = parseInt(v, 10);
            return n > 0 ? n : null;
          }
          return null;
        };
        const voucher_count =
          (enrichment?.leased_units && enrichment.leased_units > 0 ? enrichment.leased_units : null) ??
          (enrichment?.authorized_units && enrichment.authorized_units > 0 ? enrichment.authorized_units : null) ??
          numericMeta('voucher_count') ??
          numericMeta('section8_units') ??
          numericMeta('psh_total_units') ??
          numericMeta('total_units');
        const semap_score = enrichment?.semap_tier ?? meta.semap_score ?? null;
        const mtw =
          enrichment?.is_mtw ?? (meta.mtw === true || meta.mtw === 'true');
        const population =
          enrichment?.population ??
          (typeof meta.population === 'number' ? meta.population : null);
        const prospect = statusMap.get(a.id) ?? null;

        const pricing = computePricing({
          adminFeeColA: enrichment?.admin_fee_col_a,
          adminFeeColB: enrichment?.admin_fee_col_b,
          leasedUnits: enrichment?.leased_units ?? voucher_count,
          isMtw: mtw,
          fallbackAdminBudget: enrichment?.estimated_admin_budget_fallback ?? null,
          override: (prospect as any)?.pricing_override ?? null,
        });

        const scoring = scoreProspect({
          voucher_count,
          semap_score,
          mtw,
          population,
          status: prospect?.status ?? null,
          utilization_pct: enrichment?.utilization_pct ?? null,
          has_online_portal: enrichment?.has_online_portal ?? null,
          saas_wallet_high: pricing.saasWalletHigh,
          latest_rfp_url: enrichment?.latest_rfp_url ?? null,
          detected_software: enrichment?.detected_software ?? null,
          portal_vendor: enrichment?.portal_vendor ?? null,
          federal_funding_5yr: enrichment?.federal_funding_5yr ?? null,
          annual_expenses: typeof meta.annual_expenses === 'number' ? meta.annual_expenses : null,
        });

        return {
          id: a.id,
          name: a.name,
          city: a.city,
          state: a.state,
          zip: a.zip ?? (typeof meta.zip === 'string' ? meta.zip : null),
          pha_code: a.pha_code,
          email: a.email,
          phone: a.phone,
          is_onboarded: a.is_onboarded,
          voucher_count,
          semap_score,
          mtw,
          population,
          ed_name: enrichment?.ed_name ?? meta.ed_name ?? null,
          ed_email: enrichment?.ed_email ?? meta.ed_email ?? null,
          ed_phone: enrichment?.ed_phone ?? meta.ed_phone ?? null,
          registry_status: a.registry_status ?? null,
          is_archived: !!a.is_archived,
          metadata: meta,
          enrichment,
          pricing,
          prospect: prospect
            ? {
                id: (prospect as any).id,
                status: (prospect as any).status,
                owner_user_id: (prospect as any).owner_user_id,
                next_action_at: (prospect as any).next_action_at,
                last_contacted_at: (prospect as any).last_contacted_at,
                pricing_override: (prospect as any).pricing_override ?? null,
              }
            : null,
          scoring,
        };
      });

      // Apply filters client-side (3,540 rows is fine).
      const search = filters.search.trim().toLowerCase();
      const filtered = rows.filter((r) => {
        if (!filters.showArchived && r.is_archived) return false;
        if (filters.registryStatuses.length > 0) {
          const status = r.registry_status ?? 'unknown';
          if (!filters.registryStatuses.includes(status)) return false;
        }
        if (filters.hideCustomers && (r.is_onboarded || r.prospect?.status === 'customer')) {
          return false;
        }
        if (r.voucher_count != null) {
          if (r.voucher_count < filters.voucherMin || r.voucher_count > filters.voucherMax) {
            return false;
          }
        } else if (filters.hideUnknownVouchers) {
          return false;
        }
        if (r.population != null) {
          if (r.population < filters.populationMin || r.population > filters.populationMax) {
            return false;
          }
        }
        if (filters.dataQuality !== 'all' && r.scoring.dataQuality !== filters.dataQuality) {
          return false;
        }
        if (filters.states.length > 0 && (!r.state || !filters.states.includes(r.state))) {
          return false;
        }
        if (filters.semap.length > 0) {
          const s = (r.semap_score ?? '').toLowerCase();
          if (!filters.semap.some((f) => s.includes(f.toLowerCase()))) return false;
        }
        if (filters.mtwOnly && !r.mtw) return false;
        if (filters.statuses.length > 0) {
          const cur = r.prospect?.status ?? 'cold';
          if (!filters.statuses.includes(cur)) return false;
        }
        if (filters.minSaasWallet > 0 && r.pricing.saasWalletHigh < filters.minSaasWallet) {
          return false;
        }
        if (filters.noPortalOnly && r.enrichment?.has_online_portal !== false) {
          return false;
        }
        if (filters.dueOnly) {
          const nxt = r.prospect?.next_action_at;
          if (!nxt) return false;
          if (new Date(nxt).getTime() > Date.now()) return false;
        }
        if (search) {
          const metaZip = typeof r.metadata?.zip === 'string' ? r.metadata.zip : '';
          const hay = `${r.name} ${r.city ?? ''} ${r.state ?? ''} ${r.pha_code ?? ''} ${r.zip ?? ''} ${metaZip}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

      const qualityRank: Record<string, number> = { verified: 0, estimated: 1, unknown: 2 };
      filtered.sort((a, b) => {
        if (b.scoring.score !== a.scoring.score) return b.scoring.score - a.scoring.score;
        if (b.pricing.saasWalletHigh !== a.pricing.saasWalletHigh) {
          return b.pricing.saasWalletHigh - a.pricing.saasWalletHigh;
        }
        return qualityRank[a.scoring.dataQuality] - qualityRank[b.scoring.dataQuality];
      });
      return filtered;
    },
    staleTime: 30_000,
  });
}

export function useProspectNotes(prospectId?: string | null) {
  return useQuery({
    queryKey: ['prospect-notes', prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pha_prospect_notes')
        .select('*')
        .eq('prospect_id', prospectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
