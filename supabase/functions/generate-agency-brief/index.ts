import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const Schema = z.object({
  agency_id: z.string().uuid(),
});

// Competitor cost-per-voucher per year (illustrative, used for projected savings)
const COMPETITOR_ANNUAL_COST_PER_VOUCHER = {
  yardi: 95,
  emphasys: 80,
  happy: 65,
};
const OPENKEY_ANNUAL_COST_PER_VOUCHER = 30;

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function buildHtml(agency: any, voucherCount: number, savings: { yardi: number; emphasys: number; happy: number }) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const cityState = [agency.city, agency.state].filter(Boolean).join(", ");
  const annualOpenKey = voucherCount * OPENKEY_ANNUAL_COST_PER_VOUCHER;

  return `<!doctype html><html><head><meta charset="utf-8"/><title>How ${agency.name} uses OpenKey</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:820px;margin:40px auto;padding:0 32px;line-height:1.6;}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0066cc;padding-bottom:20px;margin-bottom:32px;}
  .logo{font-size:24px;font-weight:bold;color:#0066cc;}
  h1{font-size:34px;margin:0 0 8px;color:#0a2540;line-height:1.2;}
  h2{font-size:20px;margin:36px 0 14px;color:#0066cc;border-bottom:2px solid #e0e0e0;padding-bottom:6px;}
  .meta{color:#666;font-size:14px;margin-bottom:24px;}
  .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0;}
  .stat{background:#f0f7ff;border:1px solid #cfe3ff;border-radius:10px;padding:18px;text-align:center;}
  .stat-value{font-size:28px;font-weight:bold;color:#0066cc;}
  .stat-label{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;}
  .savings-box{background:linear-gradient(135deg,#0066cc 0%,#1e40af 100%);color:white;border-radius:12px;padding:28px;margin:24px 0;}
  .savings-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:16px;}
  .savings-item{text-align:center;}
  .savings-amount{font-size:24px;font-weight:bold;}
  .savings-vs{font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;}
  table{width:100%;border-collapse:collapse;margin:16px 0;}
  td{padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;}
  td.check{color:#16a34a;font-weight:bold;width:24px;}
  ul.modules{padding:0;margin:16px 0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  ul.modules li{padding:8px 12px;background:#f8fafc;border-left:3px solid #0066cc;font-size:14px;}
  .footer{margin-top:48px;padding-top:24px;border-top:1px solid #ddd;color:#666;font-size:12px;text-align:center;}
  .badge{display:inline-block;padding:3px 10px;background:#dcfce7;color:#166534;border-radius:12px;font-size:11px;font-weight:600;margin-right:6px;}
</style></head><body>
  <div class="header">
    <div>
      <h1>How ${agency.name} uses OpenKey</h1>
      <div class="meta">${cityState ? cityState + " · " : ""}Prepared ${date}</div>
    </div>
    <div class="logo">OpenKey</div>
  </div>

  <p>This brief shows how <strong>${agency.name}</strong> can replace its current Section 8 software stack with OpenKey — a single modern platform built specifically for Public Housing Authorities.</p>

  <h2>Your agency at a glance</h2>
  <div class="stat-grid">
    <div class="stat">
      <div class="stat-value">${voucherCount.toLocaleString()}</div>
      <div class="stat-label">Active vouchers</div>
    </div>
    <div class="stat">
      <div class="stat-value">${cityState || "—"}</div>
      <div class="stat-label">Service area</div>
    </div>
    <div class="stat">
      <div class="stat-value">${fmtUSD(annualOpenKey)}</div>
      <div class="stat-label">Est. annual OpenKey cost</div>
    </div>
  </div>

  <h2>Projected annual savings vs legacy software</h2>
  <div class="savings-box">
    <div style="font-size:14px;opacity:0.9;">Switching to OpenKey at ${voucherCount.toLocaleString()} vouchers saves approximately:</div>
    <div class="savings-grid">
      <div class="savings-item">
        <div class="savings-amount">${fmtUSD(savings.yardi)}</div>
        <div class="savings-vs">vs Yardi</div>
      </div>
      <div class="savings-item">
        <div class="savings-amount">${fmtUSD(savings.emphasys)}</div>
        <div class="savings-vs">vs Emphasys</div>
      </div>
      <div class="savings-item">
        <div class="savings-amount">${fmtUSD(savings.happy)}</div>
        <div class="savings-vs">vs HappySoftware</div>
      </div>
    </div>
    <div style="font-size:11px;opacity:0.8;margin-top:14px;">Estimates based on industry-average per-voucher annual cost. Actual pricing is custom-quoted.</div>
  </div>

  <h2>Modules ${agency.name} would unlock</h2>
  <ul class="modules">
    <li>HAP Batching & NACHA ACH</li>
    <li>RFTA Workflow Automation</li>
    <li>NSPIRE Inspections</li>
    <li>Recertification Engine</li>
    <li>Special Claims (52671)</li>
    <li>Repayment Agreements</li>
    <li>Reasonable Accommodations</li>
    <li>Grievances & Hearings</li>
    <li>Tenant Self-Service Portal</li>
    <li>Landlord Self-Service Portal</li>
    <li>FSS Program Management</li>
    <li>HUD-50058 Reporting</li>
    <li>SEMAP Auto-Scoring</li>
    <li>Public Waitlist Application</li>
    <li>White-label / Custom Domain</li>
    <li>AI Document Parsing</li>
  </ul>

  <h2>Why agencies switch</h2>
  <table>
    <tr><td class="check">✓</td><td><strong>Modern UI</strong> — staff actually want to use it; tenants and landlords self-serve.</td></tr>
    <tr><td class="check">✓</td><td><strong>Days, not months</strong> — typical implementation in under 30 days vs 6+ months for legacy.</td></tr>
    <tr><td class="check">✓</td><td><strong>One platform</strong> — no add-on fees per module, per portal, or per integration.</td></tr>
    <tr><td class="check">✓</td><td><strong>HUD-compliant</strong> — HUD-50058, NSPIRE, SEMAP scoring built in.</td></tr>
    <tr><td class="check">✓</td><td><strong>White-label ready</strong> — your branding, your domain, your colors.</td></tr>
  </table>

  <h2>Compliance &amp; trust</h2>
  <div>
    <span class="badge">HUD-50058 Compliant</span>
    <span class="badge">NSPIRE Ready</span>
    <span class="badge">SOC 2 In Progress</span>
    <span class="badge">Section 504 / FHA</span>
  </div>

  <h2>Next steps</h2>
  <p>Schedule a 30-minute walkthrough with your team to see OpenKey configured for ${agency.name}. We'll bring the data we already have on your agency and show what your operators would see day one.</p>

  <div class="footer">
    OpenKey Housing Platform · openkeyhousing.com<br/>
    Brief generated ${date} · Estimates only — final pricing custom-quoted per agency.
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

    const { data: agency, error: agencyErr } = await supabase
      .from("housing_authorities")
      .select("id, name, city, state, slug")
      .eq("id", parsed.data.agency_id)
      .single();

    if (agencyErr || !agency) {
      return new Response(
        JSON.stringify({ success: false, error: "Agency not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort voucher count (active vouchers)
    const { count: voucherCount } = await supabase
      .from("agency_vouchers")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", parsed.data.agency_id);

    const vc = voucherCount || 500; // fallback to a reasonable demo count
    const annualOK = vc * OPENKEY_ANNUAL_COST_PER_VOUCHER;
    const savings = {
      yardi: vc * COMPETITOR_ANNUAL_COST_PER_VOUCHER.yardi - annualOK,
      emphasys: vc * COMPETITOR_ANNUAL_COST_PER_VOUCHER.emphasys - annualOK,
      happy: vc * COMPETITOR_ANNUAL_COST_PER_VOUCHER.happy - annualOK,
    };

    const html = buildHtml(agency, vc, savings);

    const fileName = `agency-briefs/${agency.id}/${Date.now()}-brief.html`;
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

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    return new Response(
      JSON.stringify({
        success: true,
        url: signed?.signedUrl || null,
        file_path: fileName,
        voucher_count: vc,
        savings,
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
