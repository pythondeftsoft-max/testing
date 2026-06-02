/**
 * ICP fit-scoring for HUD Public Housing Authorities (PHAs).
 * Sweet spot is mid-market PHAs (100–1,200 vouchers) with room to modernize.
 */

export type ProspectStatus =
  | 'cold'
  | 'researching'
  | 'contacted'
  | 'demo_scheduled'
  | 'negotiating'
  | 'customer'
  | 'not_a_fit'
  | 'dormant';

export type FitTier = 'ideal' | 'good' | 'possible' | 'skip';

export type DataQuality = 'verified' | 'estimated' | 'unknown';

export interface ScoringInput {
  voucher_count?: number | null;
  semap_score?: 'standard' | 'troubled' | 'high_performer' | string | null;
  mtw?: boolean | null;
  population?: number | null;
  status?: ProspectStatus | null;
  // v3 signals (from pha_enrichment)
  utilization_pct?: number | null;
  has_online_portal?: boolean | null;
  saas_wallet_high?: number | null;
  // v4 signals
  latest_rfp_url?: string | null;
  detected_software?: string[] | null;
  portal_vendor?: string | null;
  federal_funding_5yr?: number | null;
  annual_expenses?: number | null;
}

/** Per-vendor displacement points. Higher = easier to displace. */
const VENDOR_DISPLACEMENT_POINTS: Record<string, { points: number; label: string }> = {
  'HAB Inc':              { points: 12, label: 'HAB Inc / HMS PAL — small vendor, weak lock-in' },
  'HAPPY':                { points: 10, label: 'HAPPY Software — aging on-prem, common switch' },
  'NMA / NanMcKay':       { points: 9,  label: 'NanMcKay — older, fragmented stack' },
  'Tenmast':              { points: 8,  label: 'Tenmast — old UI, PE-backed (MRI)' },
  'WinTen2+':             { points: 8,  label: 'WinTen2+ — legacy Tenmast, frequent churn' },
  'PHA-Web':              { points: 6,  label: 'PHA-Web — mid-tier regional' },
  'Lindsey Software':     { points: 6,  label: 'Lindsey — mid-tier regional' },
  'Visual Homes':         { points: 6,  label: 'Visual Homes — mid-tier regional' },
  'MultiSite Systems':    { points: 6,  label: 'MultiSite — mid-tier regional' },
  'ECS / Elite CS':       { points: 6,  label: 'Elite CS — mid-tier regional' },
  'Bostonpost':           { points: 6,  label: 'Bostonpost — mid-tier regional' },
  'Partner':              { points: 6,  label: 'Partner Inc — mid-tier regional' },
  'ProLink HCV':          { points: 6,  label: 'ProLink HCV — mid-tier regional' },
  'Emphasys':             { points: 5,  label: 'Emphasys — mid-tier, moderate switching cost' },
  'MRI':                  { points: -6, label: 'MRI Software — sticky enterprise' },
  'Yardi':                { points: -10,label: 'Yardi — sticky, GL-integrated' },
  'RentCafe':             { points: -10,label: 'RentCafe (Yardi) — sticky, GL-integrated' },
};

export interface SignalBreakdown {
  label: string;
  points: number;
  detail: string;
}

export interface ScoringResult {
  score: number; // 0–100 (capped)
  rawScore: number; // pre-cap, can exceed 100 or go negative
  tier: FitTier;
  tierLabel: string;
  reasons: string[];
  breakdown: SignalBreakdown[];
  dataQuality: DataQuality;
}

/** Triangular peak at ~500 vouchers, falls to 0 below 50 or above 3000. Max 60. */
function voucherScore(count?: number | null): { score: number; reason: string } {
  if (!count || count <= 0) return { score: 0, reason: 'No voucher count on file' };
  if (count < 50) return { score: 5, reason: `${count} vouchers — too small` };
  if (count > 3000) return { score: 10, reason: `${count} vouchers — likely already entrenched` };

  const peak = 500;
  const distance = Math.abs(count - peak);
  const range = count <= peak ? peak - 50 : 3000 - peak;
  const proximity = 1 - distance / range;
  const score = Math.round(60 * Math.max(0, Math.min(1, proximity)));

  let label = 'Mid-market';
  if (count >= 100 && count <= 1200) label = 'Sweet-spot mid-market';
  else if (count < 100) label = 'Small but workable';
  else if (count <= 2000) label = 'Upper mid-market';
  else label = 'Large agency';

  return { score, reason: `${count.toLocaleString()} vouchers — ${label}` };
}

function semapScore(s?: string | null): { score: number; reason: string } {
  if (!s) return { score: 10, reason: 'SEMAP unknown' };
  const v = s.toLowerCase();
  if (v.includes('troubled')) return { score: 25, reason: 'Troubled SEMAP — high motivation to switch' };
  if (v.includes('standard')) return { score: 20, reason: 'Standard SEMAP — open to upgrade' };
  if (v.includes('high')) return { score: 10, reason: 'High Performer — sticky but premium fit' };
  return { score: 10, reason: `SEMAP: ${s}` };
}

/** Population proxy. Peak ~75k people, falls off above 500k. Max 40. Used only when voucher data missing. */
function populationScore(pop?: number | null): { score: number; reason: string } {
  if (!pop || pop <= 0) return { score: 0, reason: 'Population unknown' };
  if (pop < 5000) return { score: 5, reason: `${pop.toLocaleString()} pop — likely tiny PHA` };
  if (pop > 1_500_000) return { score: 8, reason: `${pop.toLocaleString()} pop — large metro, entrenched` };

  const peak = 75_000;
  const distance = Math.abs(pop - peak);
  const range = pop <= peak ? peak - 5000 : 1_500_000 - peak;
  const proximity = 1 - distance / range;
  const score = Math.round(40 * Math.max(0, Math.min(1, proximity)));

  let label = 'mid-size city';
  if (pop < 25_000) label = 'small town';
  else if (pop <= 250_000) label = 'sweet-spot mid-market';
  else label = 'large metro';
  return { score, reason: `${pop.toLocaleString()} pop — ${label} (estimate)` };
}

export function scoreProspect(input: ScoringInput): ScoringResult {
  const reasons: string[] = [];
  const breakdown: SignalBreakdown[] = [];

  const hasVouchers = input.voucher_count != null && input.voucher_count > 0;
  let dataQuality: DataQuality = 'unknown';

  let raw = 0;

  if (hasVouchers) {
    const v = voucherScore(input.voucher_count);
    raw += v.score;
    reasons.push(v.reason);
    breakdown.push({ label: 'Vouchers', points: v.score, detail: v.reason });

    const s = semapScore(input.semap_score);
    raw += s.score;
    reasons.push(s.reason);
    breakdown.push({ label: 'SEMAP', points: s.score, detail: s.reason });

    dataQuality = 'verified';
  } else if (input.population != null && input.population > 0) {
    const p = populationScore(input.population);
    raw += p.score;
    reasons.push(p.reason);
    breakdown.push({ label: 'Population proxy', points: p.score, detail: p.reason });
    reasons.push('Voucher data unknown — population used as proxy');
    dataQuality = 'estimated';
  } else {
    reasons.push('No HUD or population data — run enrichment to score');
    breakdown.push({ label: 'No data', points: 0, detail: 'Run enrichment to populate signals' });
    dataQuality = 'unknown';
  }

  if (input.mtw) {
    raw += 10;
    reasons.push('MTW participant — innovation budget available');
    breakdown.push({ label: 'MTW', points: 10, detail: 'Moving To Work participant' });
  }

  // v3 signals — utilization gap = leaking money = pain point
  if (typeof input.utilization_pct === 'number' && input.utilization_pct > 0 && input.utilization_pct < 90) {
    raw += 15;
    reasons.push(`Only ${input.utilization_pct.toFixed(0)}% utilization — leaking HAP, motivated`);
    breakdown.push({
      label: 'Low utilization',
      points: 15,
      detail: `${input.utilization_pct.toFixed(0)}% utilization — operational pain`,
    });
  }

  // No detected online portal = greenfield
  if (input.has_online_portal === false) {
    raw += 15;
    reasons.push('No tenant/landlord portal detected — greenfield opportunity');
    breakdown.push({ label: 'No portal', points: 15, detail: 'Greenfield — no online portal detected' });
  }

  // Wallet-fit bands — replaces single threshold
  if (typeof input.saas_wallet_high === 'number' && input.saas_wallet_high > 0) {
    const w = input.saas_wallet_high;
    const fmt = `$${Math.round(w / 1000)}K`;
    let pts = 0;
    let label = '';
    if (w < 5_000) { pts = -8; label = `${fmt} wallet — too small to bother`; }
    else if (w < 10_000) { pts = 0; label = `${fmt} wallet — borderline`; }
    else if (w < 30_000) { pts = 5; label = `${fmt} wallet — sweet-spot deal size`; }
    else if (w < 75_000) { pts = 8; label = `${fmt} wallet — strong deal size`; }
    else { pts = 10; label = `${fmt} wallet — whale`; }
    raw += pts;
    reasons.push(label);
    breakdown.push({ label: 'Wallet fit', points: pts, detail: label });
  }

  // v4: Open RFP detected — strongest buying-intent signal we have
  if (input.latest_rfp_url) {
    raw += 20;
    reasons.push('Open RFP / procurement page found — active buying intent');
    breakdown.push({ label: 'Open RFP', points: 20, detail: 'Procurement page detected on website' });
  }

  // v4: Per-vendor displacement ladder. Pick the strongest signal (highest |points|).
  const vendorsDetected = new Set<string>(input.detected_software ?? []);
  if (input.portal_vendor) vendorsDetected.add(input.portal_vendor);
  if (vendorsDetected.size > 0) {
    let best: { vendor: string; points: number; label: string } | null = null;
    for (const v of vendorsDetected) {
      const entry = VENDOR_DISPLACEMENT_POINTS[v];
      if (!entry) continue;
      if (!best || Math.abs(entry.points) > Math.abs(best.points)) {
        best = { vendor: v, points: entry.points, label: entry.label };
      }
    }
    if (best) {
      raw += best.points;
      reasons.push(best.label);
      breakdown.push({ label: 'Vendor displacement', points: best.points, detail: best.label });
    } else if (input.has_online_portal === true) {
      // Portal exists but vendor unknown — slight friction
      raw -= 2;
      reasons.push('Portal detected, vendor unknown — slight friction');
      breakdown.push({ label: 'Unknown vendor', points: -2, detail: 'Portal exists, vendor not fingerprinted' });
    }
  } else if (input.has_online_portal === true) {
    // Portal exists, no software detected at all
    raw -= 2;
    reasons.push('Portal detected, no vendor fingerprint — slight friction');
    breakdown.push({ label: 'Unknown vendor', points: -2, detail: 'Portal exists, vendor not fingerprinted' });
  }

  // v4: 5-yr federal funding — bigger checkbook = bigger deal
  if (typeof input.federal_funding_5yr === 'number' && input.federal_funding_5yr > 0) {
    let pts = 0;
    let label = '';
    if (input.federal_funding_5yr >= 50_000_000) { pts = 10; label = '$50M+ federal funding (5-yr)'; }
    else if (input.federal_funding_5yr >= 10_000_000) { pts = 7; label = '$10M+ federal funding (5-yr)'; }
    else if (input.federal_funding_5yr >= 2_000_000) { pts = 4; label = '$2M+ federal funding (5-yr)'; }
    if (pts > 0) {
      raw += pts;
      reasons.push(`${label} — substantial budget`);
      breakdown.push({ label: 'Federal funding', points: pts, detail: label });
    }
  }

  if (input.status === 'customer') {
    raw -= 50;
    reasons.push('Already a customer');
    breakdown.push({ label: 'Customer', points: -50, detail: 'Already a customer' });
  } else if (input.status === 'not_a_fit') {
    raw -= 40;
    reasons.push('Marked not-a-fit');
    breakdown.push({ label: 'Not a fit', points: -40, detail: 'Manually marked not a fit' });
  } else if (input.status === 'dormant') {
    raw -= 15;
    reasons.push('Dormant — re-engage later');
    breakdown.push({ label: 'Dormant', points: -15, detail: 'Re-engage later' });
  }

  const score = Math.max(0, Math.min(100, raw));

  let tier: FitTier;
  let tierLabel: string;
  if (score >= 80) {
    tier = 'ideal';
    tierLabel = 'Ideal';
  } else if (score >= 60) {
    tier = 'good';
    tierLabel = 'Good';
  } else if (score >= 40) {
    tier = 'possible';
    tierLabel = 'Possible';
  } else {
    tier = 'skip';
    tierLabel = 'Skip';
  }

  return { score, rawScore: raw, tier, tierLabel, reasons, breakdown, dataQuality };
}

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  cold: 'Cold',
  researching: 'Researching',
  contacted: 'Contacted',
  demo_scheduled: 'Demo Scheduled',
  negotiating: 'Negotiating',
  customer: 'Customer',
  not_a_fit: 'Not a fit',
  dormant: 'Dormant',
};

export const STATUS_ORDER: ProspectStatus[] = [
  'cold',
  'researching',
  'contacted',
  'demo_scheduled',
  'negotiating',
  'customer',
  'not_a_fit',
  'dormant',
];

export const TIER_BADGE_CLASS: Record<FitTier, string> = {
  ideal: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  good: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  possible: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  skip: 'bg-muted text-muted-foreground border-border',
};

export const DATA_QUALITY_LABEL: Record<DataQuality, string> = {
  verified: 'HUD-verified',
  estimated: 'Population estimate',
  unknown: 'No data',
};

export const DATA_QUALITY_DOT_CLASS: Record<DataQuality, string> = {
  verified: 'bg-emerald-500',
  estimated: 'bg-amber-500',
  unknown: 'bg-muted-foreground/40',
};
