import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

interface SavePaymentRailRequest {
  agency_id: string;
  rail_type: "checkbook" | "nacha" | "modern_treasury";
  display_name: string;
  is_default: boolean;
  credentials: Record<string, unknown>; // e.g. { api_key: "..." }
  config?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller from their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: SavePaymentRailRequest = await req.json();
    if (!body.agency_id || !body.rail_type || !body.display_name || !body.credentials) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an agency staff member for this agency
    const { data: isStaff, error: staffErr } = await admin.rpc("is_agency_staff", {
      _user_id: user.id,
      _agency_id: body.agency_id,
    });
    if (staffErr || !isStaff) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized for this agency" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If marking default, unset existing default
    if (body.is_default) {
      await admin
        .from("agency_payment_rails")
        .update({ is_default: false })
        .eq("agency_id", body.agency_id)
        .eq("is_default", true);
    }

    // Insert the row WITHOUT plaintext credentials
    const { data: inserted, error: insertErr } = await admin
      .from("agency_payment_rails")
      .insert({
        agency_id: body.agency_id,
        rail_type: body.rail_type,
        display_name: body.display_name,
        is_default: body.is_default,
        is_active: true,
        config: body.config ?? {},
        verification_status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message ?? "Failed to create payment rail");
    }

    // Encrypt credentials in place
    const { error: encErr } = await admin.rpc("encrypt_payment_rail_credentials", {
      _rail_id: inserted.id,
      _credentials: body.credentials,
    });

    if (encErr) {
      // Roll back the row to avoid leaving an empty rail
      await admin.from("agency_payment_rails").delete().eq("id", inserted.id);
      throw new Error(`Encryption failed: ${encErr.message}`);
    }

    // Audit log
    await admin.rpc("log_payout_event", {
      _event_type: "rail_credentials_updated",
      _agency_id: body.agency_id,
      _actor_id: user.id,
      _actor_email: user.email ?? null,
      _actor_ip: req.headers.get("x-forwarded-for") ?? null,
      _metadata: {
        rail_id: inserted.id,
        rail_type: body.rail_type,
        action: "created",
      },
    });

    return new Response(
      JSON.stringify({ success: true, rail_id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("save-payment-rail error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
