// supabase/functions/process-inspection-sync/index.ts
// Receives queued inspection payloads and materializes them into inspections + deficiencies
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ success: false, error: "Unauthorized" });

    const body = await req.json();
    const { client_uuid, inspection_id, agency_id, device_captured_at, payload } = body;
    if (!client_uuid || !inspection_id || !agency_id || !payload) {
      return j({ success: false, error: "Missing fields" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify inspector belongs to agency
    const { data: staffOk } = await admin.rpc("is_agency_staff", {
      _user_id: user.id,
      _agency_id: agency_id,
    });
    if (!staffOk) return j({ success: false, error: "Forbidden" });

    // Idempotency: check for existing queue row with same client_uuid
    const { data: existingQ } = await admin
      .from("inspection_sync_queue")
      .select("id, status")
      .eq("client_uuid", client_uuid)
      .maybeSingle();
    if (existingQ?.status === "synced") {
      return j({ success: true, already: true });
    }

    // Update inspection record
    const { error: insErr } = await admin
      .from("inspections")
      .update({
        status: "completed",
        result: payload.overall_result || "pass",
        completed_date: new Date().toISOString(),
        notes: payload.notes || null,
        checklist_data: {
          inspector_signature: payload.inspector_signature,
          landlord_signature: payload.landlord_signature,
          captured_at: device_captured_at,
        },
      })
      .eq("id", inspection_id);
    if (insErr) return j({ success: false, error: insErr.message });

    // Insert deficiencies
    const defs = (payload.deficiencies || []).map((d: any) => ({
      agency_id,
      inspection_id,
      category: d.category || "Other",
      nspire_code: d.nspire_code || null,
      description: d.description || "",
      severity: d.severity || "moderate",
      location: d.location || null,
      photo_urls: d.photo_paths || [],
      cure_deadline: d.cure_days
        ? new Date(Date.now() + d.cure_days * 86400 * 1000).toISOString()
        : null,
    }));
    if (defs.length > 0) {
      const { error: dErr } = await admin.from("agency_inspection_deficiencies").insert(defs);
      if (dErr) console.error("Deficiency insert error:", dErr);
    }

    // Upsert queue row marked synced
    if (existingQ) {
      await admin
        .from("inspection_sync_queue")
        .update({ status: "synced", synced_at: new Date().toISOString(), inspection_id })
        .eq("id", existingQ.id);
    } else {
      await admin.from("inspection_sync_queue").insert({
        client_uuid,
        inspection_id,
        agency_id,
        inspector_id: user.id,
        device_captured_at,
        payload,
        status: "synced",
        synced_at: new Date().toISOString(),
      });
    }

    return j({ success: true });
  } catch (e: any) {
    console.error(e);
    return j({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" });
  }
});

function j(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
