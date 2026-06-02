// Reconciliation cron: catches placement-fee Stripe payments where the
// webhook never fired. Re-asks Stripe for each pending session and, if
// paid, invokes backfill-placement-fee-payment (which is idempotent).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ success: false, error: "STRIPE_SECRET_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Look back up to 30 days; only fees with a session that's at least 5 minutes old
    const cutoffNew = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const cutoffOld = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from("landlord_placement_fees")
      .select("id, stripe_session_id, stripe_checkout_created_at")
      .eq("payment_status", "pending")
      .not("stripe_session_id", "is", null)
      .lte("stripe_checkout_created_at", cutoffNew)
      .gte("stripe_checkout_created_at", cutoffOld)
      .limit(200);

    if (error) throw error;

    const results: Array<{ id: string; status: string; note?: string }> = [];

    for (const fee of pending || []) {
      try {
        const session = await stripe.checkout.sessions.retrieve(fee.stripe_session_id!);
        if (session.payment_status !== "paid") {
          results.push({ id: fee.id, status: "skipped", note: session.payment_status });
          continue;
        }

        const resp = await fetch(`${supabaseUrl}/functions/v1/backfill-placement-fee-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ placement_fee_id: fee.id }),
        });
        const body = await resp.json().catch(() => ({}));
        results.push({
          id: fee.id,
          status: resp.ok && body?.success ? "reconciled" : "error",
          note: body?.error || body?.message,
        });
      } catch (e: any) {
        results.push({ id: fee.id, status: "error", note: e?.message || String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: pending?.length || 0,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("reconcile-placement-fee-payments error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
