// Feature flags to control UI visibility
// Stable, battle-tested modules are no longer flagged. Flags are reserved
// for rollouts that still need cost or per-tenant gating.
export const featureFlags = {
  landlordSubscriptionUiEnabled: true,
  landlordPropertyLimitWarningEnabled: false,

  // Still gated:
  irsEfilingEnabled: true,              // Requires IRIS_* secrets in production
  aiOcrEnabled: true,                   // Cost control on Lovable AI Gateway
  publicWaitlistEnabled: true,          // Per-agency rollout of public /apply/:slug
} as const;
