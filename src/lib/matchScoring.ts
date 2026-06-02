/**
 * Universal Match Scoring Engine V4
 *
 * Weights: Location 40%, Bedrooms 30%, Budget 20%, Timing 10%
 *
 * v4 changes from v3:
 * - Location bumped 30 → 40 (biggest predictor of a closed deal)
 * - Budget bumped 15 → 20
 * - Freshness REMOVED — older units are still valid matches
 * - Pets REMOVED from scoring (kept as HARD FILTER only)
 *
 * Source of truth lives in matchScoringConstants.ts
 * Edge function `agent-matchmaker-api` MUST stay in sync.
 */

import { MATCH_WEIGHTS, TIER_THRESHOLDS, getTierFromScore } from './matchScoringConstants';

export { MATCH_WEIGHTS, TIER_THRESHOLDS, getTierFromScore };
export type { MatchTier } from './matchScoringConstants';

export interface ScoreBreakdown {
  location: number;
  budget: number;
  bedrooms: number;
  timing: number;
}

/**
 * Calculate overall match score using V4 weights (0-100).
 * Each input field is a 0-100 percentage score for that factor.
 */
export const calculateOverallScoreV2 = (breakdown: ScoreBreakdown): number => {
  return Math.round(
    breakdown.location * MATCH_WEIGHTS.location +
    breakdown.bedrooms * MATCH_WEIGHTS.bedrooms +
    breakdown.budget * MATCH_WEIGHTS.budget +
    breakdown.timing * MATCH_WEIGHTS.timing
  );
};

/**
 * Calculate budget score — Universal range-based.
 */
export const calculateBudgetScoreV2 = (
  tenantBudget: number | null,
  propertyRent: number | null
): number => {
  if (!tenantBudget || !propertyRent) return 50;

  if (propertyRent <= tenantBudget) return 100;
  if (propertyRent <= tenantBudget * 1.10) return 80;
  if (propertyRent <= tenantBudget * 1.20) return 60;
  if (propertyRent <= tenantBudget * 1.30) return 40;
  return 15;
};

/**
 * Calculate bedroom score with voucher-directional rule.
 */
export const calculateBedroomScoreV2 = (
  tenantNeeds: number | number[] | null,
  propertyBedrooms: number | null,
  isVoucherHolder: boolean = false
): number => {
  if (!propertyBedrooms) return 50;

  if (Array.isArray(tenantNeeds)) {
    if (tenantNeeds.length === 0) return 50;
    if (tenantNeeds.includes(propertyBedrooms)) return 100;

    if (isVoucherHolder) {
      const bestUp = tenantNeeds.some(n => propertyBedrooms === n + 1);
      if (bestUp) return 80;
      const bestDown = tenantNeeds.some(n => propertyBedrooms === n - 1);
      if (bestDown) return 20;
      return 30;
    }

    const closestDiff = Math.min(...tenantNeeds.map(n => Math.abs(n - propertyBedrooms)));
    if (closestDiff === 1) return 80;
    if (closestDiff === 2) return 50;
    return 30;
  }

  if (!tenantNeeds) return 50;

  const diff = propertyBedrooms - tenantNeeds;
  if (diff === 0) return 100;

  if (isVoucherHolder) {
    if (diff === 1) return 80;
    if (diff === -1) return 20;
    return 30;
  }

  if (Math.abs(diff) === 1) return 80;
  if (Math.abs(diff) === 2) return 50;
  return 30;
};

/**
 * Calculate timing score — compares move-in window with property availability.
 */
export const calculateTimingScoreV2 = (
  moveInWindow: string | null,
  moveInDate: string | null,
  propertyAvailable: string | null
): number => {
  if (!moveInWindow && !moveInDate) return 50;

  if (moveInWindow === 'immediately' || moveInWindow === 'asap') {
    if (!propertyAvailable) return 100;
    const daysUntilAvailable = Math.max(0, (new Date(propertyAvailable).getTime() - Date.now()) / 86400000);
    if (daysUntilAvailable <= 14) return 100;
    if (daysUntilAvailable <= 30) return 85;
    return 60;
  }

  if (moveInWindow === '30_days') {
    if (!propertyAvailable) return 90;
    const daysUntilAvailable = Math.max(0, (new Date(propertyAvailable).getTime() - Date.now()) / 86400000);
    if (daysUntilAvailable <= 30) return 85;
    if (daysUntilAvailable <= 60) return 60;
    return 40;
  }

  if (moveInWindow === '60_days' || moveInWindow === '90_days') {
    if (!propertyAvailable) return 80;
    const daysUntilAvailable = Math.max(0, (new Date(propertyAvailable).getTime() - Date.now()) / 86400000);
    if (daysUntilAvailable <= 60) return 80;
    if (daysUntilAvailable <= 90) return 60;
    return 40;
  }

  if (moveInDate && propertyAvailable) {
    const daysDiff = Math.abs((new Date(moveInDate).getTime() - new Date(propertyAvailable).getTime()) / 86400000);
    if (daysDiff <= 14) return 100;
    if (daysDiff <= 30) return 85;
    if (daysDiff <= 60) return 60;
    return 40;
  }

  return 60;
};

/**
 * Pets is a HARD FILTER, not a score component (v4).
 * Returns true if the unit should be EXCLUDED for this tenant.
 */
export const isPetsExcluded = (
  hasPets: boolean | null,
  petsAllowed: boolean | null
): boolean => {
  return hasPets === true && petsAllowed === false;
};

/**
 * @deprecated v4 removed pets from scoring. Use isPetsExcluded as a hard filter instead.
 * Kept as a no-op alias returning 100 so legacy callers still compile.
 */
export const calculatePetScoreV2 = (
  _hasPets: boolean | null,
  _petsAllowed: boolean | null
): number => 100;

/**
 * @deprecated v4 removed freshness from scoring. Returns neutral 50 for legacy callers.
 */
export const calculateFreshnessScore = (
  _listedDate: string | null,
  _createdAt: string | null
): number => 50;

/**
 * Calculate location score based on drive time.
 */
export const calculateLocationScoreFromDriveTime = (
  driveTimeMinutes: number | null
): { score: number; excluded: boolean; label: string } => {
  if (driveTimeMinutes === null) {
    return { score: 50, excluded: false, label: 'Unknown' };
  }

  if (driveTimeMinutes > 45) {
    return { score: 20, excluded: true, label: `${driveTimeMinutes} min (too far)` };
  }

  if (driveTimeMinutes <= 10) {
    return { score: 100, excluded: false, label: `${driveTimeMinutes} min` };
  }

  const score = Math.round(100 - ((driveTimeMinutes - 10) * 1.43));
  return { score: Math.max(50, score), excluded: false, label: `${driveTimeMinutes} min` };
};

/**
 * Simple location fallback score (when no drive time available).
 */
export const calculateLocationScoreFallback = (
  tenantCity: string | null,
  tenantState: string | null,
  tenantZip: string | null,
  propertyCity: string | null,
  propertyState: string | null,
  propertyZip: string | null
): number => {
  const normalize = (s: string | null) => (s || '').toLowerCase().trim();

  const tCity = normalize(tenantCity);
  const tState = normalize(tenantState);
  const tZip = normalize(tenantZip);
  const pCity = normalize(propertyCity);
  const pState = normalize(propertyState);
  const pZip = normalize(propertyZip);

  if (!tCity && !tState && !tZip) return 50;
  if (tZip && pZip && tZip === pZip) return 100;
  if (tCity && tState && pCity && pState && tCity === pCity && tState === pState) return 85;
  if (tState && pState && tState === pState) return 50;
  return 0;
};
