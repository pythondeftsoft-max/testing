// Payment rail registry. Phase 2 (NACHA) and Phase 3 (Modern Treasury)
// adapters drop in here without touching the bulk-payout edge function.
import type { PaymentRailAdapter } from "./types.ts";
import { checkbookAdapter } from "./checkbook.ts";

const adapters: Record<string, PaymentRailAdapter> = {
  checkbook: checkbookAdapter,
  // nacha: nachaAdapter,           // Phase 2
  // modern_treasury: mtAdapter,    // Phase 3
};

export function getRailAdapter(railType: string): PaymentRailAdapter | null {
  return adapters[railType] ?? null;
}

export type { PaymentRailAdapter, PayoutItem, RailCredentials, RailSendResult } from "./types.ts";
