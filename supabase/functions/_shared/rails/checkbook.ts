import type { PaymentRailAdapter, PayoutItem, RailBalanceResult, RailCredentials, RailSendResult } from "./types.ts";

// Checkbook.io fee schedule (flat per transaction)
const CHECKBOOK_FEES: Record<string, number> = {
  digital_check: 0.99,
  ach: 1.0,
  check: 1.49,
};

export const checkbookAdapter: PaymentRailAdapter = {
  type: "checkbook",

  async sendPayout(item: PayoutItem, credentials: RailCredentials): Promise<RailSendResult> {
    const apiKey = credentials?.api_key;
    if (!apiKey) {
      return { success: false, error: "Checkbook credentials missing api_key" };
    }

    try {
      const res = await fetch("https://api.checkbook.io/v3/check", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: item.amount,
          recipient: item.recipient_details,
          description: `Owner payout for ${item.property_id ?? "property"}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: `Checkbook API error: ${JSON.stringify(data)}`,
          raw_response: data,
        };
      }

      return {
        success: true,
        external_id: data.id,
        processor_fee: CHECKBOOK_FEES[item.payout_method] ?? 1.0,
        raw_response: data,
      };
    } catch (err: any) {
      return { success: false, error: (err instanceof Error ? err.message : String(err)) ?? "Unknown checkbook error" };
    }
  },

  async getBalance(credentials: RailCredentials): Promise<RailBalanceResult> {
    const apiKey = credentials?.api_key;
    if (!apiKey) {
      return { success: false, error: "Checkbook credentials missing api_key" };
    }

    try {
      const res = await fetch("https://api.checkbook.io/v3/account", {
        method: "GET",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: `Checkbook balance API error: ${JSON.stringify(data)}`,
          raw_response: data,
        };
      }

      // Checkbook returns balances on the account object. Field names vary by
      // account type — we try the most common shapes and fall back gracefully.
      const balance =
        Number(data?.balance) ||
        Number(data?.available_balance) ||
        Number(data?.account?.balance) ||
        Number(data?.checkbook_balance) ||
        0;

      return {
        success: true,
        available_balance: balance,
        currency: data?.currency ?? "USD",
        raw_response: data,
      };
    } catch (err: any) {
      return { success: false, error: (err instanceof Error ? err.message : String(err)) ?? "Unknown checkbook balance error" };
    }
  },
};
