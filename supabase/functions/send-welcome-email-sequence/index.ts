import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STEP_TEMPLATES: Record<number, { subject: (n: string) => string; body: (n: string) => string }> = {
  0: {
    subject: (n) => `Welcome to OpenKey, ${n}!`,
    body: (n) =>
      `Hi there,\n\nWelcome to OpenKey! Your agency portal for ${n} is ready.\n\nLog in here: https://openkeyhousing.com/agency/login\n\nIn the next few days you'll get a couple emails with tips on how to get up and running fast. Reply to any of them if you need help — a real human reads them.\n\n— The OpenKey Team`,
  },
  3: {
    subject: () => `Quick setup tips — Day 3`,
    body: (n) =>
      `Hi ${n} team,\n\nThree days in! Here are the most-skipped setup steps that pay off later:\n\n1. Set your payment standards by bedroom size (Finance tab)\n2. Customize your default notice templates (Communications tab)\n3. Invite your caseworkers and inspectors (Admin tab)\n\nDoing these now means less work when you go live.\n\nQuestions? Hit reply.\n\n— OpenKey`,
  },
  7: {
    subject: () => `One week in — how's it going?`,
    body: (n) =>
      `Hi ${n} team,\n\nYou're a week into OpenKey. A few things most agencies find useful by now:\n\n• The Setup Health banner on your dashboard shows your % complete\n• The Support widget (bottom right) opens a ticket directly to us\n• You can import existing voucher rosters via the Caseload → Import wizard\n\nNeed a 15-min walkthrough of any module? Just reply.\n\n— OpenKey`,
  },
  14: {
    subject: () => `Two-week check-in`,
    body: (n) =>
      `Hi ${n} team,\n\nTwo weeks in. By now most agencies have:\n• Imported their landlord registry\n• Set up their first HAP batch\n• Sent their first automated recertification reminder\n\nIf any of those aren't done, hit reply and we'll get you unstuck. We also offer free white-glove data migration if you're still wrestling with imports.\n\nThanks for being one of our early agencies — your feedback shapes the product.\n\n— The OpenKey Team`,
  },
};

const STEP_OFFSETS_DAYS: Record<number, number> = { 0: 0, 3: 3, 7: 7, 14: 14 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* allow empty */ }

    // Mode 1: schedule a fresh sequence for a newly converted agency
    if (body?.action === "schedule" && body?.agency_id && body?.recipient_email) {
      const rows = Object.entries(STEP_OFFSETS_DAYS).map(([step, days]) => {
        const scheduled = new Date(Date.now() + Number(days) * 86400 * 1000);
        return {
          agency_id: body.agency_id,
          recipient_email: body.recipient_email,
          sequence_step: Number(step),
          scheduled_for: scheduled.toISOString(),
          status: "pending",
        };
      });
      const { error } = await supabase.from("agency_welcome_emails").insert(rows);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, scheduled: rows.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2 (default / cron): dispatch any pending emails whose time has come
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await supabase
      .from("agency_welcome_emails")
      .select("id, agency_id, recipient_email, sequence_step, housing_authorities(name)")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .limit(100);

    if (dueErr) throw dueErr;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    let sent = 0, failed = 0;

    for (const row of (due || []) as any[]) {
      const tpl = STEP_TEMPLATES[row.sequence_step];
      if (!tpl) continue;
      const agencyName = row.housing_authorities?.name || "your agency";

      try {
        if (resendKey) {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "OpenKey <onboarding@openkeyhousing.com>",
              to: [row.recipient_email],
              subject: tpl.subject(agencyName),
              text: tpl.body(agencyName),
            }),
          });
          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Resend ${resp.status}: ${errText.slice(0, 200)}`);
          }
        } else {
          console.log(`[dry-run] would send step ${row.sequence_step} to ${row.recipient_email}`);
        }

        await supabase
          .from("agency_welcome_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        sent++;
      } catch (e: any) {
        await supabase
          .from("agency_welcome_emails")
          .update({ status: "failed", error_message: (e instanceof Error ? e.message : String(e))?.slice(0, 500) })
          .eq("id", row.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, examined: due?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("welcome-sequence error:", e);
    return new Response(JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
