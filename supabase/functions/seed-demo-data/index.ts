import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SizesSchema = z.object({
  micro: z.number().int().min(0).max(20).optional(),
  small: z.number().int().min(0).max(20).optional(),
  mid: z.number().int().min(0).max(10).optional(),
  large: z.number().int().min(0).max(5).optional(),
  mega: z.number().int().min(0).max(2).optional(),
  stress: z.number().int().min(0).max(1).optional(),
}).default({});

const Schema = z.object({
  agency_id: z.string().uuid().optional(),
  mode: z.enum(['single', 'multi_agency', 'teardown_multi', 'portfolio']).default('single'),
  sizes: SizesSchema.optional(),
  run_id: z.string().uuid().optional(),
});

const SIZE_TENANT_COUNTS: Record<string, number> = {
  micro: 50, small: 250, mid: 1500, large: 8000, mega: 50000, stress: 250000,
};
const SIZE_LANDLORD_COUNTS: Record<string, number> = {
  micro: 8, small: 30, mid: 120, large: 500, mega: 2500, stress: 10000,
};
const SIZE_HAP_COUNTS: Record<string, number> = {
  micro: 30, small: 150, mid: 800, large: 4000, mega: 20000, stress: 80000,
};
const SYNC_SIZES = new Set(['micro', 'small', 'mid']);
const FIRSTS = ['Maria','James','Aisha','Carlos','Linda','Devon','Sofia','Marcus','Tasha','Eli','Priya','Jamal','Nina','Omar','Grace','Hector','Ivy','Kenji','Luz','Mateo'];
const LASTS = ['Rodriguez','Washington','Patel','Mendez','Chen','Brooks','Nguyen','Johnson','Garcia','Lopez','Singh','Khan','Carter','Reed','Hayes','Bell','Diaz','Park','Cole','Wells'];
const LL_PREFIXES = ['Sunset','Riverside','Greenleaf','Oakwood','Skyline','Lakeside','Hillcrest','Bayview','Summit','Ironwood'];
const LL_SUFFIXES = ['Property Mgmt','Holdings LLC','Realty','Investments','Properties','Capital','Group','Partners'];
const CITIES = [
  { city: 'Atlanta', state: 'GA' }, { city: 'Phoenix', state: 'AZ' }, { city: 'Denver', state: 'CO' },
  { city: 'Tampa', state: 'FL' }, { city: 'Austin', state: 'TX' }, { city: 'Cleveland', state: 'OH' },
  { city: 'Boise', state: 'ID' }, { city: 'Reno', state: 'NV' }, { city: 'Mobile', state: 'AL' },
  { city: 'Tulsa', state: 'OK' },
];

const TENANTS = [
  { first: "Maria", last: "Rodriguez" }, { first: "James", last: "Washington" },
  { first: "Aisha", last: "Patel" },     { first: "Carlos", last: "Mendez" },
  { first: "Linda", last: "Chen" },      { first: "Devon", last: "Brooks" },
  { first: "Sofia", last: "Nguyen" },    { first: "Marcus", last: "Johnson" },
];
const LANDLORDS = [
  { name: "Sunset Property Mgmt" },  { name: "Riverside Holdings LLC" },
  { name: "Greenleaf Realty" },      { name: "Oakwood Investments" },
  { name: "Skyline Properties" },
];
const STREETS = ["Main", "Oak", "Maple", "Pine", "Cedar", "Elm", "Walnut", "Birch"];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * 86400000).toISOString().slice(0, 10);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

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

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error.flatten().fieldErrors }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { agency_id, mode } = parsed.data;

    // ---------- Multi-agency QA harness ----------
    if (mode === "multi_agency") {
      const created: Array<{ id: string; name: string }> = [];
      const cities = [
        { name: "QA-Demo PHA Alpha", city: "Atlanta", state: "GA", slug: `qa-alpha-${Date.now()}` },
        { name: "QA-Demo PHA Beta",  city: "Phoenix", state: "AZ", slug: `qa-beta-${Date.now()}` },
        { name: "QA-Demo PHA Gamma", city: "Denver",  state: "CO", slug: `qa-gamma-${Date.now()}` },
      ];
      for (const c of cities) {
        const { data: ag, error: agErr } = await supabase.from("housing_authorities").insert({
          name: c.name, slug: c.slug, city: c.city, state: c.state,
          email: `${c.slug}@openkey.dev`, is_onboarded: true, is_active: true,
          metadata: { is_demo: true, qa_seed: true },
        } as any).select().single();
        if (agErr) {
          return new Response(JSON.stringify({ success: false, error: `Agency create failed: ${agErr.message}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        created.push({ id: ag.id, name: ag.name });

        // Shared landlord (overlaps across agencies for porting tests)
        await supabase.from("agency_landlords").insert({
          agency_id: ag.id,
          landlord_name: "Shared Multi-PHA Holdings LLC",
          landlord_email: "shared+multi@openkey.dev",
          onboarding_status: "active", payment_method: "ach",
          properties_count: 4, w9_status: "approved",
          notes: JSON.stringify({ is_demo: true, shared_landlord: true }),
        } as any);
        // Local landlord
        await supabase.from("agency_landlords").insert({
          agency_id: ag.id,
          landlord_name: `${c.city} Local Realty`,
          landlord_email: `local+${c.slug}@openkey.dev`,
          onboarding_status: "active", payment_method: "check",
          properties_count: 2, w9_status: "approved",
          notes: JSON.stringify({ is_demo: true }),
        } as any);

        // Quick HAP contracts
        const hap = [0, 1, 2].map(i => ({
          agency_id: ag.id,
          tenant_id: crypto.randomUUID(),
          property_address: `${100 + i * 11} Demo St, ${c.city}`,
          bedroom_count: i + 1,
          gross_rent: 1100 + i * 200,
          hap_amount: 800 + i * 150,
          tenant_rent: 300 + i * 50,
          utility_allowance: 75,
          contract_number: `${c.slug}-${1000 + i}`,
          status: "active",
          effective_date: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
          expiration_date: new Date(Date.now() + 270 * 86400000).toISOString().slice(0, 10),
          notes: JSON.stringify({ is_demo: true }),
        }));
        await supabase.from("agency_hap_contracts").insert(hap);
      }
      return new Response(JSON.stringify({ success: true, mode, agencies: created }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- Portfolio harness (parameterized size×count) ----------
    if (mode === "portfolio") {
      const sizes = parsed.data.sizes || {};
      const totalAgencies = Object.values(sizes).reduce((a: number, b: any) => a + (b || 0), 0);
      if (totalAgencies === 0) {
        return new Response(JSON.stringify({ success: false, error: "Pick at least one size" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const isAsync = (sizes.large || 0) + (sizes.mega || 0) + (sizes.stress || 0) > 0;

      // Create or look up the run row
      let runId = parsed.data.run_id;
      if (!runId) {
        const { data: runRow, error: runErr } = await supabase.from("qa_pipeline_runs").insert({
          profile_mix: sizes,
          status: isAsync ? "running" : "running",
          progress_pct: 0,
          created_by: userRes.user.id,
        }).select().single();
        if (runErr || !runRow) {
          return new Response(JSON.stringify({ success: false, error: `Run create failed: ${runErr?.message}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        runId = runRow.id;
      }

      const work = async () => {
        const summary: Record<string, any> = { agencies: [], counts: { agencies: 0, landlords: 0, hap_contracts: 0 } };
        try {
          const stamp = Date.now();
          let agencyIndex = 0;
          for (const sizeKey of ["micro","small","mid","large","mega","stress"] as const) {
            const n = (sizes as any)[sizeKey] || 0;
            for (let i = 0; i < n; i++) {
              const cityIdx = agencyIndex % CITIES.length;
              const c = CITIES[cityIdx];
              const slug = `qa-port-${sizeKey}-${stamp}-${agencyIndex}`;
              const name = `QA-Port ${sizeKey.toUpperCase()} ${c.city} ${i + 1}`;
              const { data: ag, error: agErr } = await supabase.from("housing_authorities").insert({
                name, slug, city: c.city, state: c.state,
                email: `${slug}@openkey.dev`,
                is_onboarded: true, is_active: true,
                metadata: { is_demo: true, qa_seed: true, qa_portfolio: true, size: sizeKey, run_id: runId },
              } as any).select().single();
              if (agErr) throw new Error(`Agency create failed: ${agErr.message}`);
              summary.agencies.push({ id: ag.id, name, size: sizeKey });
              summary.counts.agencies++;

              // Landlords
              const llCount = SIZE_LANDLORD_COUNTS[sizeKey];
              const llRows: any[] = [];
              for (let j = 0; j < llCount; j++) {
                const llName = `${LL_PREFIXES[j % LL_PREFIXES.length]} ${LL_SUFFIXES[j % LL_SUFFIXES.length]} ${j+1}`;
                llRows.push({
                  agency_id: ag.id,
                  landlord_name: llName,
                  landlord_email: `qa+${slug}+ll${j}@openkey.dev`,
                  onboarding_status: "active",
                  payment_method: j % 2 === 0 ? "ach" : "check",
                  properties_count: (j % 5) + 1,
                  w9_status: "approved",
                  notes: JSON.stringify({ is_demo: true, qa_portfolio: true, run_id: runId }),
                });
              }
              // Cross-PHA realism: one shared landlord + one duplicate-email landlord on first 3 agencies
              if (agencyIndex < 4) {
                llRows.push({
                  agency_id: ag.id,
                  landlord_name: "Shared Multi-PHA Holdings LLC",
                  landlord_email: "shared+portfolio@openkey.dev",
                  onboarding_status: "active", payment_method: "ach",
                  properties_count: 4, w9_status: "approved",
                  notes: JSON.stringify({ is_demo: true, qa_portfolio: true, shared_landlord: true, run_id: runId }),
                });
              }
              if (agencyIndex < 2) {
                llRows.push({
                  agency_id: ag.id,
                  landlord_name: "Duplicate Email Realty",
                  landlord_email: "duplicate+merge@openkey.dev",
                  onboarding_status: "pending", payment_method: "ach",
                  properties_count: 2, w9_status: "pending",
                  notes: JSON.stringify({ is_demo: true, qa_portfolio: true, duplicate_email: true, run_id: runId }),
                });
              }
              // Insert landlords in chunks
              for (let k = 0; k < llRows.length; k += 500) {
                const chunk = llRows.slice(k, k + 500);
                const { error: llErr } = await supabase.from("agency_landlords").insert(chunk);
                if (llErr) throw new Error(`Landlord insert failed: ${llErr.message}`);
              }
              summary.counts.landlords += llRows.length;

              // HAP contracts (chunked)
              const hapCount = SIZE_HAP_COUNTS[sizeKey];
              const hapRows: any[] = [];
              for (let h = 0; h < hapCount; h++) {
                const br = (h % 4) + 1;
                hapRows.push({
                  agency_id: ag.id,
                  tenant_id: crypto.randomUUID(),
                  property_address: `${100 + (h % 9000)} Demo St #${h + 1}, ${c.city}`,
                  bedroom_count: br,
                  gross_rent: 900 + (h % 12) * 75,
                  hap_amount: 700 + (h % 12) * 60,
                  tenant_rent: 200 + (h % 6) * 50,
                  utility_allowance: 75,
                  contract_number: `${slug}-${10000 + h}`,
                  status: h % 23 === 0 ? "draft" : "active",
                  effective_date: new Date(Date.now() - (90 + (h % 365)) * 86400000).toISOString().slice(0, 10),
                  expiration_date: new Date(Date.now() + (180 + (h % 365)) * 86400000).toISOString().slice(0, 10),
                  notes: JSON.stringify({ is_demo: true, qa_portfolio: true, run_id: runId }),
                });
              }
              for (let k = 0; k < hapRows.length; k += 500) {
                const chunk = hapRows.slice(k, k + 500);
                const { error: hapErr } = await supabase.from("agency_hap_contracts").insert(chunk);
                if (hapErr) throw new Error(`HAP insert failed: ${hapErr.message}`);
              }
              summary.counts.hap_contracts += hapRows.length;

              agencyIndex++;
              const progress = Math.round((agencyIndex / totalAgencies) * 100);
              await supabase.from("qa_pipeline_runs").update({ progress_pct: progress, summary }).eq("id", runId);
            }
          }

          await supabase.from("qa_pipeline_runs").update({
            status: "completed", progress_pct: 100, summary, finished_at: new Date().toISOString(),
          }).eq("id", runId);
        } catch (e: any) {
          await supabase.from("qa_pipeline_runs").update({
            status: "failed", error: e?.message || String(e), finished_at: new Date().toISOString(),
          }).eq("id", runId);
        }
      };

      if (isAsync) {
        // Background — return run id immediately
        // @ts-ignore
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(work());
        } else {
          work().catch((e) => console.error('async portfolio work failed', e));
        }
        return new Response(JSON.stringify({ success: true, mode, run_id: runId, async: true, total_agencies: totalAgencies }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await work();
      const { data: finalRun } = await supabase.from("qa_pipeline_runs").select("*").eq("id", runId).single();
      return new Response(JSON.stringify({
        success: finalRun?.status === 'completed',
        mode, run_id: runId, async: false,
        summary: finalRun?.summary, error: finalRun?.error,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "teardown_multi") {
      const { data: dems } = await supabase.from("housing_authorities")
        .select("id, name").or("slug.like.qa-%,slug.like.qa-port-%");
      const ids = (dems || []).map((d: any) => d.id);
      let removed = 0;
      // Delete in chunks to avoid timeouts on large portfolios
      for (const id of ids) {
        // Bulk-delete child rows in chunks (some tables may not have all rows)
        await supabase.from("agency_hap_contracts").delete().eq("agency_id", id);
        await supabase.from("agency_landlords").delete().eq("agency_id", id);
        await supabase.from("housing_authorities").delete().eq("id", id);
        removed++;
      }
      return new Response(JSON.stringify({ success: true, mode, removed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (!agency_id) {
      return new Response(JSON.stringify({ success: false, error: "agency_id required for single mode" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const counts: Record<string, number> = {};
    const demoMeta = { is_demo: true, seeded_at: new Date().toISOString() };
    const note = JSON.stringify(demoMeta);

    // -------- Landlords (5) --------
    const landlordRows = LANDLORDS.map((l, i) => ({
      agency_id,
      landlord_name: l.name,
      landlord_email: `demo+ll${i}@openkey.dev`,
      onboarding_status: "active" as const,
      payment_method: "ach" as const,
      properties_count: Math.floor(Math.random() * 8) + 1,
      w9_status: "verified" as const,
      notes: note,
    }));
    const { data: ll } = await supabase.from("agency_landlords").insert(landlordRows).select();
    counts.landlords = ll?.length || 0;

    // -------- HAP Contracts (8) --------
    const hapRows = TENANTS.map((t, i) => ({
      agency_id,
      tenant_id: crypto.randomUUID(),
      property_address: `${100 + i * 11} ${pick(STREETS)} St, Demo City`,
      bedroom_count: (i % 3) + 1,
      gross_rent: 1200 + i * 150,
      hap_amount: 900 + i * 100,
      tenant_rent: 300 + i * 50,
      utility_allowance: 75,
      contract_number: `DEMO-${1000 + i}`,
      status: "active",
      effective_date: monthsAgo(3 + (i % 9)),
      expiration_date: daysAhead(180 + i * 15),
      notes: note,
    }));
    const { data: hap } = await supabase.from("agency_hap_contracts").insert(hapRows).select();
    counts.hap_contracts = hap?.length || 0;

    // -------- Recertifications (8 staggered next 6 months) --------
    const recertRows = TENANTS.map((t, i) => ({
      agency_id,
      tenant_id: crypto.randomUUID(),
      type: "annual" as const,
      status: (["initiated", "docs_requested", "under_review", "completed"] as const)[i % 4],
      due_date: daysAhead(30 + i * 22),
      workflow_step: "initiated",
      notes: note,
    }));
    const { data: rc } = await supabase.from("agency_recertifications").insert(recertRows).select();
    counts.recertifications = rc?.length || 0;

    // -------- Special Claims (mixed statuses) --------
    if (ll && ll.length > 0) {
      const claimRows = [
        { type: "unpaid_rent",      amount: 1850, status: "submitted" },
        { type: "vacancy_loss",     amount: 1200, status: "under_review" },
        { type: "tenant_damages",   amount: 2400, status: "approved" },
        { type: "unpaid_rent",      amount: 950,  status: "paid" },
        { type: "tenant_damages",   amount: 3200, status: "submitted" },
        { type: "vacancy_loss",     amount: 1500, status: "denied" },
      ].map((c, i) => ({
        agency_id,
        landlord_id: ll[i % ll.length].id,
        claim_type: c.type,
        claim_amount: c.amount,
        approved_amount: c.status === "approved" || c.status === "paid" ? c.amount : null,
        paid_amount: c.status === "paid" ? c.amount : 0,
        status: c.status,
        submitted_date: daysAgo(15 + i * 8),
        unit_address: `${200 + i * 7} ${pick(STREETS)} Ave, Demo City`,
        former_tenant_name: `${pick(TENANTS).first} ${pick(TENANTS).last}`,
        notes: note,
      }));
      // Best-effort insert; ignore schema mismatches gracefully
      const { data: sc, error: scErr } = await supabase
        .from("agency_special_claims" as any)
        .insert(claimRows as any)
        .select();
      if (scErr) console.warn("Special claims warn:", scErr.message);
      counts.special_claims = sc?.length || 0;
    }

    // -------- Repayment Agreements --------
    const repayRows = [
      { total: 2400, monthly: 100, balance: 1900 },
      { total: 1200, monthly: 75,  balance: 525 },
      { total: 3600, monthly: 150, balance: 3300 },
      { total: 800,  monthly: 50,  balance: 100 },
    ].map((r, i) => ({
      agency_id,
      tenant_id: crypto.randomUUID(),
      total_amount: r.total,
      monthly_payment: r.monthly,
      current_balance: r.balance,
      reason: pick(["unreported_income", "back_rent", "hap_overpayment"]),
      status: "active",
      start_date: monthsAgo(2 + i),
      next_payment_due: daysAhead(15 - i * 5),
      notes: note,
    }));
    const { data: rp, error: rpErr } = await supabase
      .from("agency_repayment_agreements" as any)
      .insert(repayRows as any)
      .select();
    if (rpErr) console.warn("Repayment warn:", rpErr.message);
    counts.repayment_agreements = rp?.length || 0;

    // -------- Accommodation Requests --------
    const accomRows = [
      { type: "unit_modification",  desc: "Grab bars in bathroom",     status: "pending" },
      { type: "policy_exception",   desc: "Live-in aide approval",     status: "approved" },
      { type: "transfer",           desc: "Ground-floor unit needed",  status: "pending" },
    ].map((a, i) => ({
      agency_id,
      tenant_id: crypto.randomUUID(),
      accommodation_type: a.type,
      description: a.desc,
      status: a.status,
      request_date: daysAgo(3 + i * 4),
    }));
    const { data: acc, error: accErr } = await supabase
      .from("agency_accommodation_requests")
      .insert(accomRows)
      .select();
    if (accErr) console.warn("Accommodation warn:", accErr.message);
    counts.accommodations = acc?.length || 0;

    return new Response(
      JSON.stringify({ success: true, counts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("Seed error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e instanceof Error ? e.message : String(e)) || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
