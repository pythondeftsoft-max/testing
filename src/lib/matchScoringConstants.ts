/**
 * Match Scoring Engine V4 — Single source of truth
 *
 * v4 changes from v3:
 * - Location: 30 → 40 (biggest predictor of close)
 * - Budget: 15 → 20 (second-biggest deal-killer)
 * - Freshness: 10 → 0 (REMOVED — older units are still valid; auto-push cancellation handles staleness)
 * - Pets: 5 → 0 (REMOVED from scoring; remains a HARD FILTER only)
 *
 * DO NOT modify without also updating:
 * - src/lib/matchScoring.ts
 * - supabase/functions/agent-matchmaker-api/index.ts
 * - supabase/functions/compute-match-queue/index.ts (if applicable)
 */

// Weights as fractions (sum to 1.0)
export const MATCH_WEIGHTS = {
  location: 0.40,
  bedrooms: 0.30,
  budget: 0.20,
  timing: 0.10,
} as const;

// Point allocations on the 100-point scale (sum to 100)
export const MATCH_POINTS = {
  location: 40,
  bedrooms: 30,
  budget: 20,
  timing: 10,
} as const;

// Tier thresholds (out of 100)
export const TIER_THRESHOLDS = {
  hot: 80,     // ≥80 → hot_match
  decent: 60,  // ≥60 → decent_match; otherwise no_match (or excluded by hard filter)
} as const;

export type MatchTier = 'hot_match' | 'decent_match' | 'no_match' | 'excluded';

export const getTierFromScore = (score: number): MatchTier => {
  if (score >= TIER_THRESHOLDS.hot) return 'hot_match';
  if (score >= TIER_THRESHOLDS.decent) return 'decent_match';
  return 'no_match';
};
