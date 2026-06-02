import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check admin
      const { data: adminRole } = await supabase
        .from("account_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role_name", "admin")
        .eq("is_active", true)
        .maybeSingle();

      if (!adminRole) {
        return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { recipients } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No recipients provided" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quoApiKey = Deno.env.get("QUO_API_KEY");
    const quoFromNumber = Deno.env.get("QUO_FROM_NUMBER");

    if (!quoApiKey || !quoFromNumber) {
      return new Response(JSON.stringify({ success: false, error: "SMS not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromNumber = toE164(quoFromNumber);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const { phone, first_name, message_template } = recipients[i];
      if (!phone) { failed++; continue; }

      const personalizedMessage = (message_template || "")
        .replace(/\{\{first_name\}\}/g, first_name || "there");

      try {
        const res = await fetch("https://api.openphone.com/v1/messages", {
          method: "POST",
          headers: {
            "Authorization": quoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: personalizedMessage.substring(0, 1600),
            from: fromNumber,
            to: [toE164(phone)],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`[revival-sms] Sent to ${phone.slice(0, 6)}*** — msgId: ${data?.data?.id || "ok"}`);
          sent++;
        } else {
          const err = await res.text();
          console.error(`[revival-sms] Failed ${phone.slice(0, 6)}***:`, res.status, err);
          failed++;
        }
      } catch (err) {
        console.error(`[revival-sms] Error for ${phone.slice(0, 6)}***:`, err);
        failed++;
      }

      // 5s spacing between recipients
      if (i < recipients.length - 1) {
        await delay(5000);
      }
    }

    console.log(`[revival-sms] Complete: ${sent} sent, ${failed} failed of ${recipients.length}`);

    return new Response(JSON.stringify({ success: true, sent, failed, total: recipients.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[revival-sms] Error:", err);
    return new Response(JSON.stringify({ success: false, error: (err instanceof Error ? err.message : String(err)) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
