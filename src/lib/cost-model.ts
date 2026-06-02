// Pure cost-model math. All numbers are estimates based on published pricing.
// Tweak DEFAULT_ASSUMPTIONS to refine the model.

export interface CostAssumptions {
  // Supabase
  supabaseBaseFee: number; // $/mo
  supabaseDbCostPerGb: number; // $/GB/mo (above 8GB included)
  supabaseStorageCostPerGb: number; // $/GB/mo
  supabaseEdgeCostPerMillion: number; // $ per 1M invocations
  supabaseBandwidthCostPerGb: number;
  // Resend
  resendCostPerEmail: number;
  resendFreeTier: number; // free emails/mo across whole platform
  // Lovable AI Gateway (Gemini Flash default)
  aiCostPerMillionInputTokens: number;
  aiCostPerMillionOutputTokens: number;
  // Checkbook.io
  checkbookCostPerCheck: number;
  // Hosting (Vercel/Lovable)
  hostingBaseFee: number;
  // SMS (Quo / OpenPhone)
  smsCostPerMessage: number;
  // Markup multiplier for suggested price floor
  markupMultiplier: number;
}

export const DEFAULT_ASSUMPTIONS: CostAssumptions = {
  supabaseBaseFee: 25,
  supabaseDbCostPerGb: 0.125,
  supabaseStorageCostPerGb: 0.021,
  supabaseEdgeCostPerMillion: 2.0,
  supabaseBandwidthCostPerGb: 0.09,
  resendCostPerEmail: 0.0004,
  resendFreeTier: 3000,
  aiCostPerMillionInputTokens: 0.30,
  aiCostPerMillionOutputTokens: 1.20,
  checkbookCostPerCheck: 1.00,
  hostingBaseFee: 20,
  smsCostPerMessage: 0.01,
  markupMultiplier: 5,
};

export interface AgencyInputs {
  caseworkers: number;
  inspectors: number;
  admins: number;
  activeLandlords: number;
  activeVouchers: number;
  pendingApplications: number;
  monthlyRftas: number;
  monthlyInspections: number;
  monthlyRecerts: number;
  monthlyHapDisbursements: number;
  monthlyEmails: number;
  monthlySms: number;
  monthlyAiOcrPages: number; // pay stubs / leases parsed
}

export const DEFAULT_AGENCY_INPUTS: AgencyInputs = {
  caseworkers: 5,
  inspectors: 2,
  admins: 1,
  activeLandlords: 80,
  activeVouchers: 200,
  pendingApplications: 500,
  monthlyRftas: 15,
  monthlyInspections: 30,
  monthlyRecerts: 17, // ~200/12
  monthlyHapDisbursements: 200,
  monthlyEmails: 1500,
  monthlySms: 200,
  monthlyAiOcrPages: 50,
};

export interface CostBreakdown {
  database: number;
  fileStorage: number;
  edgeFunctions: number;
  bandwidth: number;
  email: number;
  sms: number;
  ai: number;
  checkbook: number;
  total: number;
  suggestedPriceFloor: number;
}

// ── Heuristics ──
// Avg row sizes (KB), tuned for our schema
const AVG_ROW_KB = {
  tenant: 4,
  voucher: 3,
  rfta: 6,
  recert: 5,
  hap: 2,
  audit: 1,
  notification: 1,
};
// Avg file sizes (MB)
const AVG_FILE_MB = {
  document: 0.8, // PDFs, pay stubs
  inspectionPhoto: 1.5,
};
// Edge fn invocations per workflow item
const EDGE_PER = {
  rfta: 3,
  inspection: 2,
  recert: 4,
  hap: 2,
  email: 1,
  sms: 1,
  ocrPage: 1,
};
// AI tokens per OCR page
const AI_TOKENS_PER_OCR = { input: 1500, output: 500 };

export function computeAgencyCost(
  inputs: AgencyInputs,
  a: CostAssumptions = DEFAULT_ASSUMPTIONS
): CostBreakdown {
  // 1. DB rows generated/mo (cumulative-ish — approximate steady-state monthly delta)
  const totalTenants = inputs.activeVouchers + inputs.pendingApplications;
  const dbBytes =
    totalTenants * AVG_ROW_KB.tenant * 1024 +
    inputs.activeVouchers * AVG_ROW_KB.voucher * 1024 +
    inputs.monthlyRftas * 12 * AVG_ROW_KB.rfta * 1024 + // annualize for storage
    inputs.monthlyRecerts * 12 * AVG_ROW_KB.recert * 1024 +
    inputs.monthlyHapDisbursements * 12 * AVG_ROW_KB.hap * 1024 +
    (inputs.monthlyRftas + inputs.monthlyInspections + inputs.monthlyRecerts) *
      12 *
      10 *
      AVG_ROW_KB.audit *
      1024; // ~10 audit rows per workflow event
  const dbGb = dbBytes / (1024 ** 3);
  // Each agency only contributes its share above the included 8GB. We pro-rate per agency assuming many agencies share base.
  const database = dbGb * a.supabaseDbCostPerGb;

  // 2. File storage — documents per tenant + inspection photos
  const fileMb =
    totalTenants * 5 * AVG_FILE_MB.document + // ~5 docs per tenant
    inputs.monthlyInspections * 12 * 8 * AVG_FILE_MB.inspectionPhoto; // 8 photos per inspection annualized
  const fileGb = fileMb / 1024;
  const fileStorage = fileGb * a.supabaseStorageCostPerGb;

  // 3. Edge functions (per month)
  const edgeInvocations =
    inputs.monthlyRftas * EDGE_PER.rfta +
    inputs.monthlyInspections * EDGE_PER.inspection +
    inputs.monthlyRecerts * EDGE_PER.recert +
    inputs.monthlyHapDisbursements * EDGE_PER.hap +
    inputs.monthlyEmails * EDGE_PER.email +
    inputs.monthlySms * EDGE_PER.sms +
    inputs.monthlyAiOcrPages * EDGE_PER.ocrPage;
  const edgeFunctions = (edgeInvocations / 1_000_000) * a.supabaseEdgeCostPerMillion;

  // 4. Bandwidth (rough — assume 50KB per edge invocation + 200KB per page view)
  const staffPageViewsPerMonth =
    (inputs.caseworkers + inputs.inspectors + inputs.admins) * 22 * 200; // 22 work days * 200 views
  const bandwidthGb =
    (edgeInvocations * 50 + staffPageViewsPerMonth * 200) / (1024 * 1024);
  const bandwidth = bandwidthGb * a.supabaseBandwidthCostPerGb;

  // 5. Email
  const email = inputs.monthlyEmails * a.resendCostPerEmail;

  // 6. SMS
  const sms = inputs.monthlySms * a.smsCostPerMessage;

  // 7. AI (OCR)
  const aiInputTokens = inputs.monthlyAiOcrPages * AI_TOKENS_PER_OCR.input;
  const aiOutputTokens = inputs.monthlyAiOcrPages * AI_TOKENS_PER_OCR.output;
  const ai =
    (aiInputTokens / 1_000_000) * a.aiCostPerMillionInputTokens +
    (aiOutputTokens / 1_000_000) * a.aiCostPerMillionOutputTokens;

  // 8. Checkbook
  const checkbook = inputs.monthlyHapDisbursements * a.checkbookCostPerCheck;

  const total =
    database + fileStorage + edgeFunctions + bandwidth + email + sms + ai + checkbook;
  const suggestedPriceFloor = total * a.markupMultiplier;

  return {
    database,
    fileStorage,
    edgeFunctions,
    bandwidth,
    email,
    sms,
    ai,
    checkbook,
    total,
    suggestedPriceFloor,
  };
}

export interface ScalingTier {
  agencies: number;
  avgVouchersPerAgency: number;
  avgPricePerAgency: number;
}

export interface ScalingRow {
  agencies: number;
  totalVouchers: number;
  variableCost: number;
  fixedCost: number;
  totalCost: number;
  totalRevenue: number;
  margin: number;
  marginPct: number;
}

export const DEFAULT_SCALING_TIERS: ScalingTier[] = [
  { agencies: 50, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 100, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 150, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 300, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 500, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 1000, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
  { agencies: 2500, avgVouchersPerAgency: 500, avgPricePerAgency: 2500 },
];

export function computeScalingProjection(
  tiers: ScalingTier[],
  a: CostAssumptions = DEFAULT_ASSUMPTIONS
): ScalingRow[] {
  return tiers.map((tier) => {
    // Approximate one "average" agency
    const avgInputs: AgencyInputs = {
      ...DEFAULT_AGENCY_INPUTS,
      activeVouchers: tier.avgVouchersPerAgency,
      pendingApplications: tier.avgVouchersPerAgency * 2.5,
      activeLandlords: Math.round(tier.avgVouchersPerAgency * 0.4),
      monthlyRftas: Math.round(tier.avgVouchersPerAgency * 0.075),
      monthlyInspections: Math.round(tier.avgVouchersPerAgency * 0.15),
      monthlyRecerts: Math.round(tier.avgVouchersPerAgency / 12),
      monthlyHapDisbursements: tier.avgVouchersPerAgency,
      monthlyEmails: Math.round(tier.avgVouchersPerAgency * 7.5),
      monthlySms: Math.round(tier.avgVouchersPerAgency),
      monthlyAiOcrPages: Math.round(tier.avgVouchersPerAgency * 0.25),
      caseworkers: Math.max(2, Math.round(tier.avgVouchersPerAgency / 100)),
      inspectors: Math.max(1, Math.round(tier.avgVouchersPerAgency / 250)),
      admins: Math.max(1, Math.round(tier.avgVouchersPerAgency / 500)),
    };
    const perAgency = computeAgencyCost(avgInputs, a);
    const variableCost = perAgency.total * tier.agencies;
    // Fixed costs scale with infra tier — assume 1 base infra per ~50 agencies
    const fixedCost =
      (a.supabaseBaseFee + a.hostingBaseFee) * Math.max(1, Math.ceil(tier.agencies / 50));
    const totalCost = variableCost + fixedCost;
    const totalRevenue = tier.agencies * tier.avgPricePerAgency;
    const margin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    return {
      agencies: tier.agencies,
      totalVouchers: tier.agencies * tier.avgVouchersPerAgency,
      variableCost,
      fixedCost,
      totalCost,
      totalRevenue,
      margin,
      marginPct,
    };
  });
}

export const fmt = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    ...opts,
  }).format(n);

export const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n);
