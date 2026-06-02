// Per-prospect cost estimate. Bridges PHA voucher count → cost-model AgencyInputs
// so we can show "cost to serve" + projected gross margin inline on the
// Prospecting drawer without duplicating the math in cost-model.ts.

import {
  AgencyInputs,
  CostAssumptions,
  CostBreakdown,
  DEFAULT_AGENCY_INPUTS,
  DEFAULT_ASSUMPTIONS,
  computeAgencyCost,
} from './cost-model';

const STORAGE_KEY = 'openkey-cost-assumptions-v1';

/** Read user-tweaked assumptions from localStorage (same key the Cost Estimator writes). */
export function loadAssumptions(): CostAssumptions {
  if (typeof window === 'undefined') return DEFAULT_ASSUMPTIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ASSUMPTIONS;
    return { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

/**
 * Map a PHA's leased-unit count into a synthetic AgencyInputs.
 * Uses the same heuristics already proven in computeScalingProjection().
 */
export function unitsToAgencyInputs(leasedUnits: number): AgencyInputs {
  const units = Math.max(0, Math.round(leasedUnits || 0));
  if (units === 0) return DEFAULT_AGENCY_INPUTS;
  return {
    ...DEFAULT_AGENCY_INPUTS,
    activeVouchers: units,
    pendingApplications: Math.round(units * 2.5),
    activeLandlords: Math.max(1, Math.round(units * 0.4)),
    monthlyRftas: Math.max(1, Math.round(units * 0.075)),
    monthlyInspections: Math.max(1, Math.round(units * 0.15)),
    monthlyRecerts: Math.max(1, Math.round(units / 12)),
    monthlyHapDisbursements: units,
    monthlyEmails: Math.max(50, Math.round(units * 7.5)),
    monthlySms: Math.max(20, Math.round(units)),
    monthlyAiOcrPages: Math.max(5, Math.round(units * 0.25)),
    caseworkers: Math.max(2, Math.round(units / 100)),
    inspectors: Math.max(1, Math.round(units / 250)),
    admins: Math.max(1, Math.round(units / 500)),
  };
}

export interface ProspectCostEstimate {
  monthlyCost: number;
  annualCost: number;
  breakdown: CostBreakdown;
  inputs: AgencyInputs;
}

export function estimateProspectCost(
  leasedUnits: number,
  assumptions: CostAssumptions = loadAssumptions(),
): ProspectCostEstimate {
  const inputs = unitsToAgencyInputs(leasedUnits);
  const breakdown = computeAgencyCost(inputs, assumptions);
  return {
    monthlyCost: breakdown.total,
    annualCost: breakdown.total * 12,
    breakdown,
    inputs,
  };
}

export interface ProfitMath {
  marginAnnual: number;
  marginMonthly: number;
  marginPct: number; // 0–100
  paybackMonths: number | null; // null if margin <= 0
  tier: 'healthy' | 'thin' | 'low';
}

export function computeProfit(
  annualQuote: number,
  monthlyQuote: number,
  monthlyCost: number,
  setupFee: number,
): ProfitMath {
  const annualCost = monthlyCost * 12;
  const marginAnnual = annualQuote - annualCost;
  const marginMonthly = monthlyQuote - monthlyCost;
  const marginPct = annualQuote > 0 ? (marginAnnual / annualQuote) * 100 : 0;
  const paybackMonths =
    marginMonthly > 0 && setupFee > 0 ? setupFee / marginMonthly : null;
  let tier: ProfitMath['tier'] = 'healthy';
  if (marginPct < 60) tier = 'low';
  else if (marginPct < 80) tier = 'thin';
  return { marginAnnual, marginMonthly, marginPct, paybackMonths, tier };
}
