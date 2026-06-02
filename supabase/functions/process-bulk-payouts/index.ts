import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getRailAdapter } from "../_shared/rails/index.ts";

interface ProcessBulkPayoutRequest {
  batch_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fallbackCheckbookKey = Deno.env.get("CHECKBOOK_API_KEY"); // legacy fallback only

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { batch_id }: ProcessBulkPayoutRequest = await req.json();
    console.log(`Processing bulk payout batch: ${batch_id}`);

    // Load batch (need agency_id, payment_rail_id, platform fee config)
    const { data: batch, error: batchError } = await supabase
      .from("bulk_payout_batches")
      .select("*")
      .eq("id", batch_id)
      .single();

    if (batchError || !batch) {
      return new Response(
        JSON.stringify({ success: false, error: "Batch not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve which payment rail to use for this agency
    // NOTE: We deliberately do NOT select credentials/credentials_encrypted columns —
    // those are now revoked from anon/authenticated and only readable via the
    // decrypt_payment_rail_credentials() RPC (service-role only).
    let rail: any = null;
    if (batch.payment_rail_id) {
      const { data } = await supabase
        .from("agency_payment_rails")
        .select("id, agency_id, rail_type, display_name, is_default, is_active, config, verification_status, credentials_is_encrypted")
        .eq("id", batch.payment_rail_id)
        .maybeSingle();
      rail = data;
    } else if (batch.agency_id) {
      const { data } = await supabase
        .from("agency_payment_rails")
        .select("id, agency_id, rail_type, display_name, is_default, is_active, config, verification_status, credentials_is_encrypted")
        .eq("agency_id", batch.agency_id)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      rail = data;
    }

    // Decrypt credentials via RPC (works for both legacy plaintext and encrypted rows)
    let railType = rail?.rail_type ?? "checkbook";
    let credentials: Record<string, any> = {};
    if (rail) {
      const { data: decrypted, error: decryptErr } = await supabase
        .rpc("decrypt_payment_rail_credentials", { _rail_id: rail.id });
      if (decryptErr) {
        console.error("Failed to decrypt rail credentials:", decryptErr);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to decrypt payment rail credentials" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      credentials = (decrypted as Record<string, any>) ?? {};
    } else if (fallbackCheckbookKey) {
      console.warn("No agency rail configured — falling back to platform Checkbook key");
      credentials = { api_key: fallbackCheckbookKey };
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No payment rail configured for this agency. Connect a Checkbook account first.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adapter = getRailAdapter(railType);
    if (!adapter) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported rail type: ${railType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const platformFee = Number(batch.platform_fee_per_transaction ?? 0);

    // Pre-flight balance check — refuse to send if the rail account doesn't
    // have enough money to cover the batch (+ estimated fees). This prevents
    // partially-processed batches and bounced transactions.
    if (typeof adapter.getBalance === "function") {
      const estFeesPerItem = 1.5; // conservative upper bound (digital_check $0.99, ach $1, check $1.49)
      const requiredAmount = Number(batch.total_amount ?? 0) + (Number(batch.total_payouts ?? 0) * estFeesPerItem);

      const balanceResult = await adapter.getBalance(credentials);
      if (!balanceResult.success) {
        console.warn(`Balance check failed for batch ${batch_id}: ${balanceResult.error}`);
        // Don't hard-fail the batch on a balance API hiccup — log and continue.
        // Real processor will reject if funds are insufficient.
      } else if ((balanceResult.available_balance ?? 0) < requiredAmount) {
        const available = (balanceResult.available_balance ?? 0).toFixed(2);
        const needed = requiredAmount.toFixed(2);
        const errMsg = `Insufficient ${railType} balance: $${available} available, $${needed} needed (batch + estimated fees).`;
        console.error(errMsg);
        await supabase
          .from("bulk_payout_batches")
          .update({
            status: "failed",
            processing_completed_at: new Date().toISOString(),
          })
          .eq("id", batch_id);
        return new Response(
          JSON.stringify({
            success: false,
            error: errMsg,
            available_balance: balanceResult.available_balance,
            required_amount: requiredAmount,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        console.log(`Balance OK for batch ${batch_id}: $${balanceResult.available_balance} available, $${requiredAmount} needed`);
      }
    }

    // Mark batch as processing
    await supabase
      .from("bulk_payout_batches")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", batch_id);

    // Pull pending items
    const { data: items, error: fetchError } = await supabase
      .from("bulk_payout_items")
      .select("*")
      .eq("batch_id", batch_id)
      .eq("status", "pending");

    if (fetchError) throw new Error(`Failed to fetch payout items: ${fetchError.message}`);

    if (!items || items.length === 0) {
      await supabase
        .from("bulk_payout_batches")
        .update({ status: "completed", processing_completed_at: new Date().toISOString() })
        .eq("id", batch_id);
      return new Response(
        JSON.stringify({ success: true, message: "No pending items to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failCount = 0;
    let totalProcessorFees = 0;
    let totalPlatformFees = 0;

    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);

      await Promise.all(
        slice.map(async (item) => {
          try {
            await supabase
              .from("bulk_payout_items")
              .update({ status: "processing", rail_type: railType })
              .eq("id", item.id);

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

            const processorFee = result.processor_fee ?? 0;
            totalProcessorFees += processorFee;
            totalPlatformFees += platformFee;

            const { data: payout, error: payoutError } = await supabase
              .from("payouts")
              .insert({
                landlord_id: item.landlord_id,
                property_id: item.property_id,
                total_amount: item.amount,
                recipient_details: item.recipient_details,
                payout_method: item.payout_method,
                status: "sent",
                checkbook_payout_id: result.external_id,
              })
              .select()
              .single();

            if (payoutError) throw new Error(`Failed to create payout record: ${payoutError.message}`);

            await supabase
              .from("bulk_payout_items")
              .update({
                status: "sent",
                payout_id: payout.id,
                sent_at: new Date().toISOString(),
                processor_fee: processorFee,
                platform_fee: platformFee,
                rail_response: result.raw_response ?? null,
              })
              .eq("id", item.id);

            // Append to platform fee ledger (only if we have an agency_id)
            if (batch.agency_id && platformFee > 0) {
              await supabase.from("platform_fee_ledger").insert({
                agency_id: batch.agency_id,
                batch_id: batch_id,
                item_id: item.id,
                rail_type: railType,
                payout_amount: item.amount,
                platform_fee: platformFee,
                processor_fee: processorFee,
              });
            }

            successCount++;
          } catch (err: any) {
            console.error(`Failed to process payout item ${item.id}:`, err);
            const errMsg = err?.message ?? String(err);
            const category = categorizeFailure(errMsg);
            // Auto-retry transient failures in 24h (single auto-retry attempt)
            const nextRetryAt = category === "transient"
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : null;
            await supabase
              .from("bulk_payout_items")
              .update({
                status: "failed",
                error_message: errMsg,
                failure_category: category,
                next_retry_at: nextRetryAt,
              })
              .eq("id", item.id);
            failCount++;
          }
        }),
      );
    }

    const batchStatus =
      failCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";

    await supabase
      .from("bulk_payout_batches")
      .update({
        status: batchStatus,
        successful_payouts: successCount,
        failed_payouts: failCount,
        total_processor_fees: totalProcessorFees,
        total_platform_fees: totalPlatformFees,
        processing_completed_at: new Date().toISOString(),
      })
      .eq("id", batch_id);

    console.log(
      `Batch ${batch_id} done: ${successCount} ok, ${failCount} failed, $${totalPlatformFees} platform fees`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        batch_id,
        successful_payouts: successCount,
        failed_payouts: failCount,
        total_platform_fees: totalPlatformFees,
        total_processor_fees: totalProcessorFees,
        rail_type: railType,
        status: batchStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in process-bulk-payouts function:", error);
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
  const lower = (message ?? "").toLowerCase();
  const permanentSignals = [
    "insufficient funds", "insufficient balance", "invalid email", "invalid recipient",
    "invalid address", "invalid account", "account closed", "unauthorized", "forbidden",
    "not found", "bad request", "validation", "duplicate",
  ];
  if (permanentSignals.some((s) => lower.includes(s))) return "permanent";
  const transientSignals = [
    "timeout", "timed out", "network", "econnreset", "econnrefused", "rate limit",
    "too many requests", "503", "502", "504", "500", "internal server error",
    "service unavailable", "gateway",
  ];
  if (transientSignals.some((s) => lower.includes(s))) return "transient";
  return "unknown";
}
