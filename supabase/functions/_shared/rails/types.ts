// Payment rail adapter contract.
// Each rail (Checkbook, NACHA, Modern Treasury) implements this interface
// so the bulk-payout edge function can route through any provider.

export interface PayoutItem {
  id: string;
  amount: number;
  recipient_details: any;
  payout_method: string;
  property_id?: string | null;
  landlord_id: string;
}

export interface RailCredentials {
  [key: string]: any;
}

export interface RailSendResult {
  success: boolean;
  external_id?: string;
  processor_fee?: number;
  raw_response?: any;
  error?: string;
}

export interface RailBalanceResult {
  success: boolean;
  available_balance?: number; // in dollars
  currency?: string;
  raw_response?: any;
  error?: string;
}

export interface PaymentRailAdapter {
  type: "checkbook" | "nacha" | "modern_treasury";
  sendPayout(item: PayoutItem, credentials: RailCredentials): Promise<RailSendResult>;
  getBalance?(credentials: RailCredentials): Promise<RailBalanceResult>;
}
