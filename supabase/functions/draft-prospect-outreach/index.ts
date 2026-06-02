import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Schema = z.object({
  housing_authority_id: z.string().uuid(),
  template: z.enum(["intro", "follow_up_after_brief", "rfp_response"]).default("intro"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await supabase.rpc("is_admin", { check_user_id: userRes.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Admin required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { housing_authority_id, template } = parsed.data;

    // Pull authority + enrichment
    const { data: ha } = await supabase
      .from("housing_authorities")
      .select("name, city, state, pha_code, metadata")
      .eq("id", housing_authority_id)
      .maybeSingle();
    if (!ha) {
      return new Response(JSON.stringify({ success: false, error: "Authority not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let enr: any = null;
    if (ha.pha_code) {
      const { data } = await supabase
        .from("pha_enrichment")
        .select("*")
        .eq("pha_code", ha.pha_code)
        .maybeSingle();
      enr = data;
    }

    const facts: string[] = [];
    if (enr?.leased_units) facts.push(`~${enr.leased_units.toLocaleString()} leased vouchers`);
    if (enr?.utilization_pct != null) facts.push(`${Math.round(enr.utilization_pct)}% voucher utilization`);
    if (enr?.semap_tier) facts.push(`SEMAP: ${enr.semap_tier}`);
    if (enr?.is_mtw) facts.push("Moving-To-Work agency");
    if (enr?.detected_software?.length) facts.push(`Current stack: ${enr.detected_software.join(", ")}`);
    if (enr?.has_online_portal === false) facts.push("No tenant portal detected (greenfield)");
    if (enr?.portal_vendor && enr.portal_vendor !== "none-detected") facts.push(`Portal vendor: ${enr.portal_vendor}`);

    const templateGuide: Record<string, string> = {
      intro: "Cold first-touch. Friendly, concise (under 130 words). Lead with 1 specific observation about THIS PHA. Offer a 15-min call. No marketing fluff.",
      follow_up_after_brief:
        "Follow-up after sending a one-pager brief. Reference the brief, ask if they had a chance to review, propose a time. Under 100 words.",
      rfp_response:
        "Response to an RFP/procurement page. Note we saw their RFP, mention 1-2 capabilities that match, ask for the RFP doc / contact. Under 130 words.",
    };

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) {
      // Graceful fallback: deterministic template
      const subject =
        template === "intro"
          ? `Quick idea for ${ha.name}`
          : template === "follow_up_after_brief"
          ? `Following up — ${ha.name}`
          : `Re: your RFP — ${ha.name}`;
      const body = [
        `Hi there,`,
        ``,
        `I noticed ${ha.name}${facts.length ? ` — ${facts.slice(0, 2).join(", ")}.` : "."}`,
        ``,
        `OpenKey is built specifically for HCV operations. Worth a 15-min look?`,
        ``,
        `— OpenKey Team`,
      ].join("\n");
      return new Response(JSON.stringify({ success: true, subject, body }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Draft a sales outreach email to a US Public Housing Authority.
Template type: ${template} — ${templateGuide[template]}

PHA: ${ha.name}${ha.city ? `, ${ha.city}, ${ha.state}` : ""}
Specific facts about THIS PHA${facts.length ? ":" : " (limited data, keep generic)"}:
${facts.map((f) => `- ${f}`).join("\n")}

Sender: OpenKey — modern Section 8 / HCV operating system for PHAs (HAP batches, NACHA, SEMAP reporting, landlord/tenant portals).

Output strict JSON: {"subject": "...", "body": "..."}.
- subject: under 60 chars, no spammy words.
- body: plain text (no HTML), use \\n for line breaks, sign as "— OpenKey Team".
- Reference at least one specific fact if available.
- No emojis, no exclamation marks.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write concise B2B sales outreach. Reply with JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: `AI draft failed (${aiRes.status})` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let draft: { subject?: string; body?: string } = {};
    try {
      draft = JSON.parse(content);
    } catch {
      draft = {};
    }

    return new Response(
      JSON.stringify({
        success: true,
        subject: draft.subject || `Quick idea for ${ha.name}`,
        body: draft.body || `Hi,\n\nWanted to reach out about ${ha.name}.\n\n— OpenKey Team`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
