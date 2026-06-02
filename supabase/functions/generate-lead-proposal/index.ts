import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Schema = z.object({
  lead_id: z.string().uuid(),
  agency_name: z.string().min(1).max(255),
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().email().max(255),
  voucher_count: z.number().int().min(0).max(1000000),
  monthly_price: z.number().min(0).max(1000000),
});

function buildHtml(d: z.infer<typeof Schema>) {
  const annual = d.monthly_price * 12;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!doctype html><html><head><meta charset="utf-8"/><title>OpenKey Proposal — ${d.agency_name}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;max-width:780px;margin:40px auto;padding:0 32px;line-height:1.6;}
  h1{font-size:32px;margin:0 0 8px;color:#0066cc;}
  h2{font-size:20px;margin:32px 0 12px;border-bottom:2px solid #e0e0e0;padding-bottom:6px;}
  .meta{color:#666;font-size:14px;margin-bottom:32px;}
  .price-box{background:#f0f7ff;border:2px solid #0066cc;border-radius:12px;padding:24px;margin:24px 0;text-align:center;}
  .price-amount{font-size:48px;font-weight:bold;color:#0066cc;}
  .price-period{color:#666;font-size:16px;}
  table{width:100%;border-collapse:collapse;margin:16px 0;}
  td{padding:10px;border-bottom:1px solid #eee;}
  ul{padding-left:20px;}
  li{margin:6px 0;}
  .footer{margin-top:48px;padding-top:24px;border-top:1px solid #ddd;color:#666;font-size:12px;}
</style></head><body>
  <h1>OpenKey Proposal</h1>
  <div class="meta">Prepared for <strong>${d.agency_name}</strong> — ${date}</div>

  <p>Dear ${d.contact_name},</p>
  <p>Thank you for considering OpenKey as the platform for ${d.agency_name}. This proposal outlines pricing, scope, and implementation for replacing your current Section 8 software.</p>

  <h2>Pricing</h2>
  <div class="price-box">
    <div class="price-amount">$${d.monthly_price.toLocaleString()}<span style="font-size:24px">/mo</span></div>
    <div class="price-period">$${annual.toLocaleString()}/year — billed monthly</div>
  </div>
  <p style="text-align:center;color:#666;font-size:14px;">Sized for ~${d.voucher_count.toLocaleString()} active vouchers</p>

  <h2>What's Included</h2>
  <ul>
    <li>Full RFTA, HAP, recertification, and SEMAP modules</li>
    <li>Tenant and landlord self-service portals (white-labeled)</li>
    <li>AI document parsing (pay stubs, leases, W-9s)</li>
    <li>Public waitlist application page</li>
    <li>Unlimited staff seats — caseworkers, inspectors, admins</li>
    <li>White-glove data migration from your current system</li>
    <li>Dedicated implementation specialist for first 90 days</li>
    <li>Email and chat support, 1-business-day SLA</li>
  </ul>

  <h2>Implementation Timeline</h2>
  <table>
    <tr><td><strong>Week 1</strong></td><td>Kickoff call, data export from current system, branding setup</td></tr>
    <tr><td><strong>Week 2-3</strong></td><td>Data migration, payment standards configured, staff invited</td></tr>
    <tr><td><strong>Week 4</strong></td><td>Staff training, parallel-run with current system</td></tr>
    <tr><td><strong>Week 5+</strong></td><td>Full cutover — go live with portals open to tenants &amp; landlords</td></tr>
  </table>

  <h2>Terms</h2>
  <ul>
    <li>Month-to-month — no multi-year lock-in</li>
    <li>30-day cancellation notice</li>
    <li>No setup fees, no per-feature add-ons</li>
    <li>Pricing reviewed annually based on portfolio growth</li>
  </ul>

  <h2>Next Steps</h2>
  <p>Reply to this email to accept and we'll send a signable service agreement within 24 hours. Implementation kickoff begins as soon as the agreement is executed.</p>

  <div class="footer">
    OpenKey Housing Platform · openkeyhousing.com<br/>
    This proposal is valid for 30 days from the date above.
  </div>
</body></html>`;
}

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

    const html = buildHtml(parsed.data);

    // Upload to documents bucket as HTML (browser-renderable proposal)
    const fileName = `proposals/${parsed.data.lead_id}/${Date.now()}-proposal.html`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(fileName, new Blob([html], { type: "text/html" }), {
        contentType: "text/html",
        upsert: false,
      });

    if (upErr) {
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${upErr.message}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Signed URL (7 days)
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    const pdfUrl = signed?.signedUrl || null;

    await supabase.from("agency_leads").update({
      proposal_pdf_url: pdfUrl,
      proposal_amount: parsed.data.monthly_price,
      proposal_sent_at: new Date().toISOString(),
      status: "proposal_sent",
    }).eq("id", parsed.data.lead_id);

    await supabase.from("agency_lead_activities").insert({
      lead_id: parsed.data.lead_id,
      actor_id: userRes.user.id,
      activity_type: "proposal_generated",
      description: `Generated proposal: $${parsed.data.monthly_price.toLocaleString()}/mo`,
      metadata: { monthly_price: parsed.data.monthly_price, voucher_count: parsed.data.voucher_count, file: fileName },
    });

    return new Response(
      JSON.stringify({ success: true, pdf_url: pdfUrl, file_path: fileName }),
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
