import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyOwner } from "../_shared/notify-owner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { push_id, old_status, new_status, tenant_id, property_id, pushed_at } =
      await req.json();

    if (!push_id || !new_status || !tenant_id || !property_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up tenant name and property address
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [tenantRes, propertyRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", tenant_id)
        .single(),
      supabase
        .from("properties")
        .select("address")
        .eq("id", property_id)
        .single(),
    ]);

    const tenantName =
      tenantRes.data
        ? `${tenantRes.data.first_name || ""} ${tenantRes.data.last_name || ""}`.trim() || "Unknown Tenant"
        : "Unknown Tenant";

    const propertyAddress = propertyRes.data?.address || "Unknown Property";

    // Calculate time since push
    let timeSince = "";
    if (pushed_at) {
      const diffMs = Date.now() - new Date(pushed_at).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHours > 0) {
        timeSince = `${diffHours}h ${diffMins}m ago`;
      } else {
        timeSince = `${diffMins}m ago`;
      }
    }

    const statusEmoji = new_status === "interested" ? "✅" : 
                        new_status === "denied" ? "❌" : 
                        new_status === "viewing_scheduled" ? "📅" : "🔔";

    const subject = `PUSH UPDATE`;
    const body = [
      `${statusEmoji} ${tenantName} → ${propertyAddress}`,
      `Status: "${old_status || "unknown"}" → "${new_status}"`,
      timeSince ? `Pushed ${timeSince}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await notifyOwner({ subject, body });

    console.log(`[push-status-alert] Sent alert for push ${push_id}: ${old_status} → ${new_status}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[push-status-alert] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
