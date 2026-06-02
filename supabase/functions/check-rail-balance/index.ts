// check-rail-balance — used by the onboarding wizard's "test connection" step
// AND can be called by the UI to surface live balance before approving a batch.
// Accepts either a saved rail_id (decrypts via RPC) or raw credentials (test mode).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getRailAdapter } from "../_shared/rails/index.ts";

interface CheckBalanceRequest {
  rail_id?: string;
  // Test mode (wizard step 3 → 4): caller passes credentials directly to
  // validate them BEFORE persisting. Edge function never logs them.
  rail_type?: string;
  credentials?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require auth for either mode — wizard call has the user's JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: CheckBalanceRequest = await req.json();

    let railType = body.rail_type ?? "checkbook";
    let credentials: Record<string, any> = {};

    if (body.rail_id) {
      // Saved rail — decrypt via service-role RPC
      const { data: rail } = await supabase
        .from("agency_payment_rails")
        .select("id, rail_type, agency_id")
        .eq("id", body.rail_id)
        .maybeSingle();
      if (!rail) {
        return new Response(
          JSON.stringify({ success: false, error: "Rail not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      railType = rail.rail_type;
      const { data: decrypted, error: decryptErr } = await supabase
        .rpc("decrypt_payment_rail_credentials", { _rail_id: rail.id });
      if (decryptErr) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to decrypt credentials" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      credentials = (decrypted as Record<string, any>) ?? {};
    } else if (body.credentials) {
      // Test mode — wizard sending unsaved credentials for validation
      credentials = body.credentials;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Provide either rail_id or credentials" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adapter = getRailAdapter(railType);
    if (!adapter || typeof adapter.getBalance !== "function") {
      return new Response(
        JSON.stringify({ success: false, error: `Balance check not supported for rail: ${railType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await adapter.getBalance(credentials);

    return new Response(
      JSON.stringify({
        success: result.success,
        available_balance: result.available_balance ?? null,
        currency: result.currency ?? "USD",
        error: result.error ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("check-rail-balance error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err instanceof Error ? err.message : String(err)) ?? "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
