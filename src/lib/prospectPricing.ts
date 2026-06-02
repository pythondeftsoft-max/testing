/**
 * PHA pricing model — tier-aware wallet bands + manual override support.
 *
 * HUD admin fees fund the entire HCV department. Industry benchmarks
 * (HUD financial assessments + NAHRO operator surveys) put the breakdown at
 * roughly:
 *   - Frontline payroll (caseworkers, inspectors)            45%
 *   - Mgmt + admin payroll (ED, deputy, finance, HR)          18%
 *   - Office occupancy + utilities                             8%
 *   - Software + IT (what we compete for)                      5%
 *   - Training, travel, audits, legal                          7%
 *   - Direct program (HQS contractors, port-out fees)         12%
 *   - Reserves / contingency                                   5%
 *
 * SaaS wallet bands are tiered by PHA size (smaller PHAs cannot afford
 * the same % of admin budget as enterprise/MTW). Suggested quote =
 * midpoint of the band, then clamped by per-voucher floor/ceiling so
 * we never quote an unrealistic dollar figure.
 *
 * If a manual override exists, it takes precedence over the suggestion.
 */

export interface PricingInputs {
  adminFeeColA?: number | null;
  adminFeeColB?: number | null;
  leasedUnits?: number | null;
  isMtw?: boolean | null;
  fallbackAdminBudget?: number | null;
  override?: PricingOverride | null;
}

export interface PricingOverride {
  annual_usd?: number | null;
  setup_usd?: number | null;
  rationale?: string | null;
  set_by?: string | null;
  set_at?: string | null;
}

export interface CostStackLine {
  key: string;
  label: string;
  pct: number;
  amount: number;
}

export interface SetupFeeOption {
  key: 'free' | 'standard' | 'migration';
  label: string;
  amount: number;
  rationale: string;
}

export interface PricingResult {
  hasData: boolean;
  isFallback: boolean;
  basisLabel: string;

  adminBudget: number;
  leasedUnits: number;

  costStack: CostStackLine[];
  totalAllocated: number;
  discretionaryRemaining: number;
  currentItSpend: number;

  saasWalletLow: number;
  saasWalletHigh: number;
  saasWalletMidpoint: number;
  bandLabel: string;
  walletLowPct: number;
  walletHighPct: number;
  walletMidPct: number;

  // Suggested (auto)
  suggestedAnnual: number;
  suggestedMonthly: number;
  perVoucherMonthly: number;
  setupFeeOptions: SetupFeeOption[];

  // Override (if any) — these are what the UI should display as headline
  hasOverride: boolean;
  override: PricingOverride | null;
  finalAnnual: number; // override.annual_usd if set, else suggestedAnnual
  finalMonthly: number;
  finalPerVoucherMonthly: number;
  finalSetup: number; // override.setup_usd if set, else first setup option

  tier: 'tiny' | 'small' | 'mid' | 'large' | 'enterprise' | 'unknown';
  benchmarkRange: string; // e.g. "$5–10/vch/mo" for tier comparison

  // TCO seat estimates — what the PHA actually GETS for the quote
  seats: {
    tenants: number;        // ≈ leased_units × 1.2 household members
    landlords: number;      // ≈ units / 6 (national avg)
    caseworkers: number;    // ≈ units / 75 (HUD SEMAP staffing benchmark)
    inspectors: number;     // ≈ units / 800
    totalUsers: number;
    perUserPerMonth: number; // for context only — pricing is flat per voucher
  };

  // Legacy compatibility
  payrollEstimate: number;
  nonPayrollOpex: number;
}

const NATIONAL_AVG_ADMIN_FEE = 85;

export const COST_STACK_DEFAULTS: { key: string; label: string; pct: number }[] = [
  { key: 'frontline_payroll', label: 'Frontline payroll (caseworkers, inspectors)', pct: 0.45 },
  { key: 'admin_payroll', label: 'Mgmt + admin payroll (ED, finance, HR)', pct: 0.18 },
  { key: 'occupancy', label: 'Office occupancy + utilities', pct: 0.08 },
  { key: 'software_it', label: 'Software + IT (current spend)', pct: 0.05 },
  { key: 'compliance', label: 'Training, travel, audits, legal', pct: 0.07 },
  { key: 'direct_program', label: 'Direct program (HQS contractors, port-out)', pct: 0.12 },
  { key: 'reserves', label: 'Reserves / contingency', pct: 0.05 },
];

interface TierBand {
  tier: PricingResult['tier'];
  label: string;
  maxVouchers: number; // exclusive upper bound
  lowPct: number;
  highPct: number;
}

// Tier-aware wallet bands (non-MTW). MTW gets bumped one tier up.
const TIER_BANDS: TierBand[] = [
  { tier: 'tiny', label: 'Tiny PHA', maxVouchers: 250, lowPct: 0.015, highPct: 0.03 },
  { tier: 'small', label: 'Small PHA', maxVouchers: 1000, lowPct: 0.015, highPct: 0.03 },
  { tier: 'mid', label: 'Mid-market', maxVouchers: 5000, lowPct: 0.02, highPct: 0.04 },
  { tier: 'large', label: 'Large agency', maxVouchers: 15000, lowPct: 0.025, highPct: 0.05 },
  { tier: 'enterprise', label: 'Enterprise / MTW', maxVouchers: Infinity, lowPct: 0.03, highPct: 0.06 },
];

// Per-voucher floor/ceiling sanity clamp ($/vch/mo).
// Ceilings tightened against public RFP awards (HappySoftware, Emphasys, Yardi
// Voyager Affordable, ProLink). Small PHAs cannot absorb $18/vch/mo — most
// closed deals at this size land $4–10/vch/mo. Mid-market lands $6–14, large
// $8–18, MTW/enterprise $10–25.
const PER_VCH_FLOOR_MONTHLY = 4;
const PER_VCH_CEILING_BY_TIER: Record<PricingResult['tier'], number> = {
  tiny: 9,
  small: 10,
  mid: 14,
  large: 18,
  enterprise: 25,
  unknown: 18,
};
// Industry benchmark band per tier (informational, shown under the quote).
export const TIER_BENCHMARK_RANGE: Record<PricingResult['tier'], string> = {
  tiny: '$4–9/vch/mo',
  small: '$5–10/vch/mo',
  mid: '$6–14/vch/mo',
  large: '$8–18/vch/mo',
  enterprise: '$10–25/vch/mo',
  unknown: '—',
};

function pickTier(units: number, isMtw: boolean): TierBand {
  // MTW agencies always priced as enterprise (innovation budget).
  if (isMtw) return TIER_BANDS[TIER_BANDS.length - 1];
  for (const b of TIER_BANDS) {
    if (units < b.maxVouchers) return b;
  }
  return TIER_BANDS[TIER_BANDS.length - 1];
}

export function computePricing(input: PricingInputs): PricingResult {
  const colA = input.adminFeeColA ?? 0;
  const colB = input.adminFeeColB ?? 0;
  const units = input.leasedUnits ?? 0;
  const isMtw = !!input.isMtw;
  const feeBudget = colA * units * 12 + colB;
  const fallbackBudget =
    input.fallbackAdminBudget ?? (units > 0 ? units * NATIONAL_AVG_ADMIN_FEE * 12 : 0);
  const hasOfficialFeeData = !!units && (!!colA || !!colB);
  const adminBudget = hasOfficialFeeData ? feeBudget : fallbackBudget;

  if (!units || !adminBudget) {
    return emptyResult(input.override ?? null);
  }

  // Cost stack
  const costStack: CostStackLine[] = COST_STACK_DEFAULTS.map((d) => ({
    key: d.key,
    label: d.label,
    pct: d.pct,
    amount: adminBudget * d.pct,
  }));
  const totalAllocated = costStack.reduce((s, l) => s + l.amount, 0);
  const discretionaryRemaining = adminBudget - totalAllocated;
  const currentItSpend = costStack.find((l) => l.key === 'software_it')?.amount ?? 0;

  // Tier-aware wallet band
  const band = pickTier(units, isMtw);
  const lowPct = band.lowPct;
  const highPct = band.highPct;
  const midPct = (lowPct + highPct) / 2;
  const saasWalletLow = adminBudget * lowPct;
  const saasWalletHigh = adminBudget * highPct;
  const saasWalletMidpoint = adminBudget * midPct;

  // Per-voucher floor/ceiling clamp on midpoint
  const ceilingPerVch = PER_VCH_CEILING_BY_TIER[band.tier] ?? 18;
  const annualFloor = units * PER_VCH_FLOOR_MONTHLY * 12;
  const annualCeiling = units * ceilingPerVch * 12;
  const clampedMid = Math.max(annualFloor, Math.min(saasWalletMidpoint, annualCeiling));

  const suggestedAnnual = roundTo(clampedMid, 500);
  const suggestedMonthly = roundTo(suggestedAnnual / 12, 50);
  const perVoucherMonthly = units > 0 ? suggestedMonthly / units : 0;

  const standardSetup = Math.min(roundTo(suggestedAnnual * 0.05, 500), 25_000);
  const migrationSetup = Math.min(roundTo(suggestedAnnual * 0.15, 500), 50_000);
  const setupFeeOptions: SetupFeeOption[] = [
    {
      key: 'free',
      label: 'Free setup',
      amount: 0,
      rationale:
        units < 1000
          ? 'Recommended for sub-1K voucher PHAs — removes procurement friction and closes faster under existing IT operating budget.'
          : 'Closes fastest. Use when ARR is the priority and you can absorb onboarding cost.',
    },
    {
      key: 'standard',
      label: 'Standard setup',
      amount: standardSetup,
      rationale: '~5% of ARR. Covers configuration, training, and standard data import.',
    },
    {
      key: 'migration',
      label: 'Heavy migration',
      amount: migrationSetup,
      rationale: '~15% of ARR. For PHAs replacing legacy systems (WinTen2+, custom SQL) or wiring IRIS / EIV / VMS hooks.',
    },
  ];

  // Apply override
  const override = input.override ?? null;
  const hasOverride = !!(override && (override.annual_usd != null || override.setup_usd != null));
  const finalAnnual = override?.annual_usd != null ? override.annual_usd : suggestedAnnual;
  const finalMonthly = roundTo(finalAnnual / 12, 1);
  const finalPerVoucherMonthly = units > 0 ? finalMonthly / units : 0;
  const finalSetup = override?.setup_usd != null ? override.setup_usd : standardSetup;

  // TCO seat estimates (national operational benchmarks)
  const seatTenants = Math.round(units * 1.2);
  const seatLandlords = Math.max(1, Math.round(units / 6));
  const seatCaseworkers = Math.max(1, Math.round(units / 75));
  const seatInspectors = Math.max(1, Math.round(units / 800));
  const totalUsers = seatTenants + seatLandlords + seatCaseworkers + seatInspectors;
  const perUserPerMonth = totalUsers > 0 ? finalMonthly / totalUsers : 0;

  return {
    hasData: true,
    isFallback: !hasOfficialFeeData,
    basisLabel: hasOfficialFeeData
      ? `Official HUD admin fee schedule × ${units.toLocaleString()} units`
      : `Fallback: $${NATIONAL_AVG_ADMIN_FEE}/unit/mo × ${units.toLocaleString()} units (load HUD admin fee schedule for precise number)`,
    adminBudget,
    leasedUnits: units,
    costStack,
    totalAllocated,
    discretionaryRemaining,
    currentItSpend,
    saasWalletLow,
    saasWalletHigh,
    saasWalletMidpoint,
    bandLabel: `${formatK(saasWalletLow)}–${formatK(saasWalletHigh)}`,
    walletLowPct: lowPct,
    walletHighPct: highPct,
    walletMidPct: midPct,
    suggestedAnnual,
    suggestedMonthly,
    perVoucherMonthly,
    setupFeeOptions,
    hasOverride,
    override,
    finalAnnual,
    finalMonthly,
    finalPerVoucherMonthly,
    finalSetup,
    tier: band.tier,
    benchmarkRange: TIER_BENCHMARK_RANGE[band.tier],
    seats: {
      tenants: seatTenants,
      landlords: seatLandlords,
      caseworkers: seatCaseworkers,
      inspectors: seatInspectors,
      totalUsers,
      perUserPerMonth,
    },
    payrollEstimate:
      (costStack.find((l) => l.key === 'frontline_payroll')?.amount ?? 0) +
      (costStack.find((l) => l.key === 'admin_payroll')?.amount ?? 0),
    nonPayrollOpex:
      adminBudget -
      ((costStack.find((l) => l.key === 'frontline_payroll')?.amount ?? 0) +
        (costStack.find((l) => l.key === 'admin_payroll')?.amount ?? 0)),
  };
}

function emptyResult(override: PricingOverride | null): PricingResult {
  return {
    hasData: false,
    isFallback: false,
    basisLabel: 'Missing unit and admin-fee data',
    adminBudget: 0,
    leasedUnits: 0,
    costStack: [],
    totalAllocated: 0,
    discretionaryRemaining: 0,
    currentItSpend: 0,
    saasWalletLow: 0,
    saasWalletHigh: 0,
    saasWalletMidpoint: 0,
    bandLabel: '—',
    walletLowPct: 0,
    walletHighPct: 0,
    walletMidPct: 0,
    suggestedAnnual: 0,
    suggestedMonthly: 0,
    perVoucherMonthly: 0,
    setupFeeOptions: [],
    hasOverride: false,
    override,
    finalAnnual: 0,
    finalMonthly: 0,
    finalPerVoucherMonthly: 0,
    finalSetup: 0,
    tier: 'unknown',
    benchmarkRange: '—',
    seats: { tenants: 0, landlords: 0, caseworkers: 0, inspectors: 0, totalUsers: 0, perUserPerMonth: 0 },
    payrollEstimate: 0,
    nonPayrollOpex: 0,
  };
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function formatK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export const TIER_LABELS: Record<PricingResult['tier'], string> = {
  tiny: 'Tiny PHA',
  small: 'Small PHA',
  mid: 'Mid-market',
  large: 'Large agency',
  enterprise: 'Enterprise / MTW',
  unknown: 'Unknown',
};

export const TIER_BADGE_CLASS: Record<PricingResult['tier'], string> = {
  tiny: 'bg-muted text-muted-foreground border-border',
  small: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  mid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  large: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  enterprise: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};
