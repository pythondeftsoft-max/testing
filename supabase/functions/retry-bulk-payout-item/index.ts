import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getRailAdapter } from "../_shared/rails/index.ts";

interface RetryRequest {
  item_id: string;
  /** When true, this is an automated retry (called by cron). When false, a human clicked "Retry". */
  automated?: boolean;
}

const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as RetryRequest;
    const { item_id, automated = false } = body;

    if (!item_id) {
      return new Response(
        JSON.stringify({ success: false, error: "item_id is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load item + parent batch (we need the agency's payment rail)
    const { data: item, error: itemError } = await supabase
      .from("bulk_payout_items")
      .select("*, batch:bulk_payout_batches(id, agency_id, payment_rail_id)")
      .eq("id", item_id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ success: false, error: "Item not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (item.status === "sent") {
      return new Response(
        JSON.stringify({ success: false, error: "Item already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((item.retry_count ?? 0) >= MAX_RETRIES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Retry limit reached (${MAX_RETRIES}). Item needs manual review.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (automated && item.failure_category === "permanent") {
      // Cron should never auto-retry permanent failures. Clear the queue.
      await supabase
        .from("bulk_payout_items")
        .update({ next_retry_at: null })
        .eq("id", item_id);
      return new Response(
        JSON.stringify({ success: false, error: "Permanent failure — auto-retry skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const batch = (item as any).batch;

    // Resolve agency rail (same logic as process-bulk-payouts)
    let rail: any = null;
    if (batch?.payment_rail_id) {
      const { data } = await supabase
        .from("agency_payment_rails")
        .select("id, agency_id, rail_type, is_active")
        .eq("id", batch.payment_rail_id)
        .maybeSingle();
      rail = data;
    } else if (batch?.agency_id) {
      const { data } = await supabase
        .from("agency_payment_rails")
        .select("id, agency_id, rail_type, is_active")
        .eq("agency_id", batch.agency_id)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      rail = data;
    }

    let credentials: Record<string, any> = {};
    let railType = rail?.rail_type ?? "checkbook";

    if (rail) {
      const { data: decrypted, error: decryptErr } = await supabase
        .rpc("decrypt_payment_rail_credentials", { _rail_id: rail.id });
      if (decryptErr) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to decrypt credentials" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      credentials = (decrypted as Record<string, any>) ?? {};
    } else {
      const fallback = Deno.env.get("CHECKBOOK_API_KEY");
      if (!fallback) {
        return new Response(
          JSON.stringify({ success: false, error: "No payment rail configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      credentials = { api_key: fallback };
    }

    const adapter = getRailAdapter(railType);
    if (!adapter) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported rail: ${railType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark as processing + bump retry counter
    const newRetryCount = (item.retry_count ?? 0) + 1;
    await supabase
      .from("bulk_payout_items")
      .update({
        status: "processing",
        retry_count: newRetryCount,
        last_retry_at: new Date().toISOString(),
        next_retry_at: null,
        error_message: null,
      })
      .eq("id", item_id);

    try {
      const result = await adapter.sendPayout(
        {
          id: item.id,
          amount: item.amount,
          recipient_details: item.recipient_details,
          payout_method: item.payout_method,
          property_id: item.property_id,
          landlord_id: item.landlord_id,
        },
        credentials,
      );

      if (!result.success) throw new Error(result.error ?? "Rail send failed");

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from("payouts")
        .insert({
          landlord_id: item.landlord_id,
          property_id: item.property_id,
          total_amount: item.amount,
          recipient_details: item.recipient_details,
          payout_method: item.payout_method,
          status: "sent",
          checkbook_id: result.external_id,
        })
        .select()
        .single();

      if (payoutError) throw new Error(`Payout record failed: ${payoutError.message}`);

      await supabase
        .from("bulk_payout_items")
        .update({
          status: "sent",
          payout_id: payout.id,
          sent_at: new Date().toISOString(),
          processor_fee: result.processor_fee ?? 0,
          rail_response: result.raw_response ?? null,
          failure_category: null,
        })
        .eq("id", item_id);

      // Update batch totals
      if (batch?.id) {
        const { data: counts } = await supabase
          .from("bulk_payout_items")
          .select("status")
          .eq("batch_id", batch.id);
        if (counts) {
          const successful = counts.filter((c: any) => c.status === "sent").length;
          const failed = counts.filter((c: any) => c.status === "failed").length;
          const allDone = counts.every((c: any) => c.status === "sent" || c.status === "failed");
          const status = !allDone ? "processing" : failed === 0 ? "completed" : successful === 0 ? "failed" : "partial";
          await supabase
            .from("bulk_payout_batches")
            .update({ successful_payouts: successful, failed_payouts: failed, status })
            .eq("id", batch.id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, item_id, retry_count: newRetryCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      const category = categorizeFailure(errMsg);

      // If still under retry budget AND transient, queue another auto-retry
      const shouldQueueAutoRetry = category === "transient" && newRetryCount < MAX_RETRIES;
      const nextRetryAt = shouldQueueAutoRetry
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +24h
        : null;

      await supabase
        .from("bulk_payout_items")
        .update({
          status: "failed",
          error_message: errMsg,
          failure_category: category,
          next_retry_at: nextRetryAt,
        })
        .eq("id", item_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg,
          failure_category: category,
          retry_count: newRetryCount,
          will_auto_retry: shouldQueueAutoRetry,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error: any) {
    console.error("retry-bulk-payout-item error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/**
 * Classify a failure as transient (auto-retry safe) vs permanent (needs human).
 * Conservative: when in doubt, mark "unknown" so a human reviews it.
 */
function categorizeFailure(message: string): "transient" | "permanent" | "unknown" {
  const lower = message.toLowerCase();

  // Permanent — never auto-retry, will fail the same way every time
  const permanentSignals = [
    "insufficient funds",
    "insufficient balance",
    "invalid email",
    "invalid recipient",
    "invalid address",
    "invalid account",
    "account closed",
    "unauthorized",
    "forbidden",
    "not found",
    "bad request",
    "validation",
    "duplicate",
  ];
  if (permanentSignals.some((s) => lower.includes(s))) return "permanent";

  // Transient — worth retrying
  const transientSignals = [
    "timeout",
    "timed out",
    "network",
    "econnreset",
    "econnrefused",
    "rate limit",
    "too many requests",
    "503",
    "502",
    "504",
    "500",
    "internal server error",
    "service unavailable",
    "gateway",
  ];
  if (transientSignals.some((s) => lower.includes(s))) return "transient";

  return "unknown";
}
