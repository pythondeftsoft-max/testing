import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Cron-invoked. Picks up failed items whose next_retry_at has elapsed and
 * dispatches them to retry-bulk-payout-item one at a time. Only retries items
 * marked as "transient" failures.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: due, error } = await supabase
      .from("bulk_payout_items")
      .select("id, retry_count")
      .eq("status", "failed")
      .eq("failure_category", "transient")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", new Date().toISOString())
      .lt("retry_count", 3)
      .limit(50);

    if (error) throw error;

    console.log(`auto-retry: found ${due?.length ?? 0} items due for retry`);

    let retried = 0;
    let failed = 0;

    for (const item of due ?? []) {
      try {
        const { error: invokeErr } = await supabase.functions.invoke(
          "retry-bulk-payout-item",
          { body: { item_id: item.id, automated: true } },
        );
        if (invokeErr) throw invokeErr;
        retried++;
      } catch (err: any) {
        console.error(`auto-retry failed for item ${item.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, retried, failed, total_due: due?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("auto-retry-failed-payouts error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
