import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Schema = z.object({
  lead_id: z.string().uuid(),
  agency_name: z.string().trim().min(1).max(255),
  agency_state: z.string().trim().max(50).optional().nullable(),
  agency_city: z.string().trim().max(100).optional().nullable(),
  invite_admin_email: z.string().trim().email().max(255),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await supabaseAuth.auth.getUser();
    if (!userRes.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { check_user_id: userRes.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Admin required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { lead_id, agency_name, agency_state, agency_city, invite_admin_email } = parsed.data;

    // Create housing authority row
    const baseSlug = slugify(agency_name);
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 5) {
      const { data: existing } = await supabase
        .from("housing_authorities")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const { data: agency, error: agencyErr } = await supabase
      .from("housing_authorities")
      .insert({
        name: agency_name,
        slug,
        state: agency_state || null,
        city: agency_city || null,
        is_onboarded: false,
      })
      .select()
      .single();

    if (agencyErr) {
      return new Response(
        JSON.stringify({ success: false, error: `Agency create failed: ${agencyErr.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Init onboarding progress
    await supabase.from("agency_onboarding_progress").insert({
      agency_id: agency.id,
      current_step: 1,
      completed_steps: [],
      step_data: { initial_admin_email: invite_admin_email },
      started_by: userRes.user.id,
    });

    // Mark lead as won + linked
    await supabase
      .from("agency_leads")
      .update({
        status: "won",
        converted_agency_id: agency.id,
        converted_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    // Activity log
    await supabase.from("agency_lead_activities").insert({
      lead_id,
      actor_id: userRes.user.id,
      activity_type: "converted",
      description: `Converted to agency: ${agency_name}`,
      metadata: { agency_id: agency.id, slug },
    });

    // Schedule welcome email sequence (day 0/3/7/14). Fire-and-forget — don't block conversion on email errors.
    try {
      await supabase.functions.invoke("send-welcome-email-sequence", {
        body: {
          action: "schedule",
          agency_id: agency.id,
          recipient_email: invite_admin_email,
        },
      });
    } catch (emailErr) {
      console.error("Welcome email schedule failed (non-fatal):", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, agency_id: agency.id, slug }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Convert error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
