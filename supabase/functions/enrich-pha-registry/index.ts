// supabase/functions/enrich-pha-registry/index.ts
// Backfills housing_authorities.metadata with voucher counts, MTW status, SEMAP, and population
// from public HUD + US Census APIs. Safe to re-run; idempotent on pha_code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Current HUD ArcGIS service for PHAs (the older `PublicHousingAgencies` URL is dead).
const HUD_PHA_URL =
  'https://services.arcgis.com/VTyQ9soqVukalItT/ArcGIS/rest/services/Public_Housing_Authorities/FeatureServer/0/query';

const CENSUS_URL = 'https://api.census.gov/data/2022/acs/acs5';

interface HudFeature {
  attributes: Record<string, any>;
}

async function fetchHudPhas(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  let offset = 0;
  const PAGE = 2000;
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      f: 'json',
      returnGeometry: 'false',
      resultOffset: String(offset),
      resultRecordCount: String(PAGE),
    });
    const res = await fetch(`${HUD_PHA_URL}?${params}`);
    if (!res.ok) {
      console.error('HUD fetch failed', res.status, await res.text());
      break;
    }
    const json = await res.json();
    const features: HudFeature[] = json.features ?? [];
    if (features.length === 0) break;
    for (const f of features) {
      const a = f.attributes ?? {};
      const code = a.PARTICIPANT_CODE || a.HA_CODE || a.PHA_CODE || a.PHA_ID;
      if (code) map.set(String(code).trim().toUpperCase(), a);
    }
    if (features.length < PAGE) break;
    offset += features.length;
  }
  return map;
}

function pickInt(a: Record<string, any>, keys: string[]): number | null {
  for (const k of keys) {
    const v = a[k];
    if (typeof v === 'number' && v > 0) return Math.round(v);
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      const n = parseInt(v, 10);
      if (n > 0) return n;
    }
  }
  return null;
}

function pickFloat(a: Record<string, any>, keys: string[]): number | null {
  for (const k of keys) {
    const v = a[k];
    if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      if (isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function pickSection8Units(a: Record<string, any>): number | null {
  return pickInt(a, ['SECTION8_UNITS_CNT', 'PHA_TOTAL_UNITS', 'TOTAL_UNITS', 'TOTAL_DWELLING_UNITS']);
}
function pickAuthorizedUnits(a: Record<string, any>): number | null {
  return pickInt(a, ['PHA_TOTAL_UNITS', 'ACC_UNITS', 'TOTAL_UNITS', 'TOTAL_DWELLING_UNITS']);
}
function pickLeasedUnits(a: Record<string, any>): number | null {
  return pickInt(a, ['SECTION8_OCCUPIED', 'TOTAL_OCCUPIED', 'PH_OCCUPIED']);
}
function pickPctOccupied(a: Record<string, any>): number | null {
  return pickFloat(a, ['PCT_OCCUPIED', 'PERCENT_OCCUPIED']);
}

function pickMtw(a: Record<string, any>): boolean {
  const v = a.HA_PROGRAM_TYPE || a.MTW || a.MTW_STATUS || a.PROGRAM_TYPE;
  if (typeof v === 'string') return /mtw|moving to work/i.test(v);
  return false;
}

function pickSemap(a: Record<string, any>): string | null {
  const v = a.PHAS_DESIGNATION || a.SEMAP_STATUS || a.SEMAP || a.PERFORMANCE_STATUS;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

/** Annual expenses ($) — best proxy for "budget". Falls back to prev year. */
function pickAnnualExpenses(a: Record<string, any>): number | null {
  return pickFloat(a, ['ANNL_EXPNS_AMNT', 'ANNL_EXPNS_AMNT_PREV_YR']);
}

/** 5-yr federal funding from cap fund + op fund (sum × 5 as rough estimate). */
function pickFederalFunding(a: Record<string, any>): number | null {
  const cap = pickFloat(a, ['CAPFUND_AMNT']) ?? 0;
  const op = pickFloat(a, ['OPFUND_AMNT']) ?? 0;
  const annual = cap + op;
  return annual > 0 ? Math.round(annual * 5) : null;
}

function pickEdEmail(a: Record<string, any>): string | null {
  const v = a.EXEC_DIR_EMAIL || a.HA_EMAIL_ADDR_TEXT;
  if (typeof v === 'string' && v.includes('@')) return v.trim().toLowerCase();
  return null;
}

function pickEdPhone(a: Record<string, any>): string | null {
  const v = a.EXEC_DIR_PHONE || a.HA_PHN_NUM;
  if (typeof v === 'string' && v.replace(/\D/g, '').length >= 10) return v.trim();
  if (typeof v === 'number' && String(v).length >= 10) return String(v);
  return null;
}

/**
 * HUD doesn't expose website URLs, but ED emails almost always use the agency
 * domain (e.g. kwalter@beavercountyhousing.org → https://beavercountyhousing.org).
 * Skip generic providers (gmail, yahoo, comcast, aol, hotmail, outlook).
 */
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com',
  'comcast.net', 'msn.com', 'live.com', 'icloud.com', 'me.com', 'mac.com',
  'sbcglobal.net', 'verizon.net', 'att.net', 'bellsouth.net', 'cox.net',
  'earthlink.net', 'charter.net', 'frontier.com',
]);
function inferWebsiteFromEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  // Skip .gov subdomains that are clearly state/city not the PHA
  return `https://${domain}`;
}

async function fetchCensusPopulation(city: string, state: string): Promise<number | null> {
  if (!city || !state) return null;
  try {
    // Use ACS5 place data; B01003_001E = total pop.
    // We need the state FIPS; fall back to a state-name → FIPS map.
    const stateFips = US_STATE_FIPS[state.toUpperCase()];
    if (!stateFips) return null;
    const params = new URLSearchParams({
      get: 'NAME,B01003_001E',
      for: 'place:*',
      in: `state:${stateFips}`,
    });
    const res = await fetch(`${CENSUS_URL}?${params}`);
    if (!res.ok) return null;
    const rows: string[][] = await res.json();
    // rows[0] is header
    const target = city.trim().toLowerCase();
    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i][0] ?? '').toLowerCase();
      if (name.startsWith(target + ' city') || name.startsWith(target + ' town') || name.startsWith(target + ',')) {
        const pop = parseInt(rows[i][1], 10);
        if (!isNaN(pop)) return pop;
      }
    }
  } catch (e) {
    console.warn('census err', city, state, e);
  }
  return null;
}

const US_STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19',
  KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27',
  MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35',
  NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44',
  SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53',
  WV: '54', WI: '55', WY: '56', PR: '72',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  // is_admin() actually accepts (user_id uuid). Try both signatures defensively.
  let isAdmin = false;
  {
    const r1 = await admin.rpc('is_admin', { user_id: userRes.user.id });
    if (r1.data === true) isAdmin = true;
    else {
      const r2 = await admin.rpc('is_admin', { _user_id: userRes.user.id });
      if (r2.data === true) isAdmin = true;
    }
  }
  if (!isAdmin) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Admin access required. Logged in as ${userRes.user.email ?? userRes.user.id} — this account is not in system_admins.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const mode: 'all' | 'missing' = body.mode === 'all' ? 'all' : 'missing';
  const enrichPopulation: boolean = body.enrichPopulation !== false;
  // Chunked + resumable controls
  const batchSize: number = Math.min(Math.max(parseInt(body.batchSize ?? '250', 10) || 250, 25), 500);
  const resumeJobId: string | null = body.resumeJobId ?? null;
  const startOffset: number = Math.max(parseInt(body.startOffset ?? '0', 10) || 0, 0);

  // Mark any old "running" jobs that have not heart-beat in 5+ min as stalled.
  await admin
    .from('pha_enrichment_jobs')
    .update({ status: 'stalled' })
    .eq('status', 'running')
    .lt('heartbeat_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  // Either resume an existing job (carry forward counts) or create a new one.
  let jobId: string;
  let initialProcessed = 0;
  let initialUpdated = 0;
  let initialErrorCount = 0;
  let cursorOffset = startOffset;
  let parentJobId: string | null = null;

  if (resumeJobId) {
    const { data: existing, error: exErr } = await admin
      .from('pha_enrichment_jobs')
      .select('id, processed_count, updated_count, error_count, cursor_offset, mode')
      .eq('id', resumeJobId)
      .maybeSingle();
    if (exErr || !existing) {
      return new Response(JSON.stringify({ success: false, error: 'Job to resume not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Create a new "child" job that continues from where the previous one stopped.
    parentJobId = existing.id;
    initialProcessed = existing.processed_count ?? 0;
    initialUpdated = existing.updated_count ?? 0;
    initialErrorCount = existing.error_count ?? 0;
    // Defensive clamp: pick the FURTHEST-FORWARD signal so we never re-walk
    // already-processed rows, even if a legacy job has cursor_offset = 0
    // or a stale client sends a low startOffset.
    cursorOffset = Math.max(
      existing.cursor_offset ?? 0,
      existing.processed_count ?? 0,
      existing.updated_count ?? 0,
      startOffset,
    );
  }

  const { data: job, error: jobErr } = await admin
    .from('pha_enrichment_jobs')
    .insert({
      status: 'running',
      mode,
      started_by: userRes.user.id,
      cursor_offset: cursorOffset,
      batch_size: batchSize,
      heartbeat_at: new Date().toISOString(),
      processed_count: initialProcessed,
      updated_count: initialUpdated,
      error_count: initialErrorCount,
      parent_job_id: parentJobId,
    })
    .select('id')
    .single();
  if (jobErr) {
    return new Response(JSON.stringify({ success: false, error: jobErr.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  jobId = job.id;

  // Run in background; respond immediately with job id.
  const work = (async () => {
    const errors: any[] = [];
    let updated = initialUpdated;
    let processed = initialProcessed;
    let lastCode: string | null = null;
    try {
      // 1. Fetch all PHAs from DB (full list, ordered stably so cursor is meaningful)
      const phas: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await admin
          .from('housing_authorities')
          .select('id, pha_code, city, state, metadata, registry_status')
          .eq('registry_status', 'active_hud')  // skip stale HUD rows — they can't be enriched anyway
          .order('pha_code', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        phas.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      const total = phas.length;
      const sliceStart = Math.min(cursorOffset, total); // used by backfill gate below

      // 2. Fetch HUD PHA registry (the live Public_Housing_Authorities feature server)
      const hud = await fetchHudPhas();

      // 3. Load MTW cohort + admin fee rates (for cross-join)
      const mtwSet = new Set<string>();
      {
        const { data: mtwRows } = await admin.from('mtw_agencies').select('pha_code');
        (mtwRows ?? []).forEach((r: any) => mtwSet.add(String(r.pha_code).toUpperCase()));
      }
      const adminFeeMap = new Map<string, { col_a: number | null; col_b: number | null }>();
      {
        const { data: feeRows } = await admin
          .from('hud_admin_fee_rates')
          .select('pha_code, col_a_rate, col_b_rate, effective_date')
          .order('effective_date', { ascending: false });
        (feeRows ?? []).forEach((r: any) => {
          const k = String(r.pha_code).toUpperCase();
          if (!adminFeeMap.has(k)) adminFeeMap.set(k, { col_a: r.col_a_rate, col_b: r.col_b_rate });
        });
      }

      // 3b. BACKFILL — only on the FIRST chunk of a fresh job (not resumes).
      // Insert any HUD PHAs that aren't yet in housing_authorities.
      let inserted = 0;
      if (!resumeJobId && sliceStart === 0) {
        const existingCodes = new Set(
          phas.map((p: any) => (p.pha_code ?? '').toString().trim().toUpperCase()).filter(Boolean),
        );
        const missing: any[] = [];
        for (const [code, a] of hud.entries()) {
          if (existingCodes.has(code)) continue;
          const name = (typeof a.FORMAL_PARTICIPANT_NAME === 'string' && a.FORMAL_PARTICIPANT_NAME.trim())
            || `PHA ${code}`;
          const city = typeof a.STD_CITY === 'string' ? a.STD_CITY.trim() : null;
          const state = typeof a.STD_ST === 'string' ? a.STD_ST.trim() : null;
          const zip = typeof a.STD_ZIP5 === 'string' ? a.STD_ZIP5.trim() : null;
          const phone = typeof a.HA_PHN_NUM === 'string' ? a.HA_PHN_NUM.trim() : null;
          const email = typeof a.HA_EMAIL_ADDR_TEXT === 'string' ? a.HA_EMAIL_ADDR_TEXT.trim() : null;
          const totalUnits = pickInt(a, ['TOTAL_DWELLING_UNITS', 'PHA_TOTAL_UNITS', 'TOTAL_UNITS']);
          const programType = typeof a.HA_PROGRAM_TYPE === 'string' ? a.HA_PROGRAM_TYPE.trim() : null;
          missing.push({
            pha_code: code,
            name,
            city,
            state,
            zip,
            phone,
            email,
            is_onboarded: false,
            metadata: {
              zip,
              total_units: totalUnits,
              program_type: programType,
              source: 'hud_arcgis_backfill',
              backfilled_at: new Date().toISOString(),
            },
          });
        }
        // Chunk inserts to keep payload sizes reasonable
        for (let i = 0; i < missing.length; i += 200) {
          const chunk = missing.slice(i, i + 200);
          const { data: ins, error: insErr } = await admin
            .from('housing_authorities')
            .insert(chunk)
            .select('id, pha_code, city, state, metadata');
          if (insErr) {
            errors.push({ backfill_chunk: i, error: insErr.message });
          } else if (ins) {
            inserted += ins.length;
            // Splice the new rows into `phas` so they get processed/enriched in this run too
            phas.push(...ins);
          }
        }
        // Re-sort + recompute slice if we inserted
        if (inserted > 0) {
          phas.sort((a: any, b: any) => String(a.pha_code ?? '').localeCompare(String(b.pha_code ?? '')));
        }
      }

      // 3c. ZIP backfill on the slice — populate housing_authorities.zip from HUD if missing.
      // (Cheap: only updates when ZIP differs.)

      // Recompute total/slice in case backfill added rows
      const totalFinal = phas.length;
      const sliceStartFinal = Math.min(cursorOffset, totalFinal);
      const sliceEndFinal = Math.min(sliceStartFinal + batchSize, totalFinal);
      const sliceFinal = phas.slice(sliceStartFinal, sliceEndFinal);

      await admin.from('pha_enrichment_jobs').update({
        total_count: totalFinal,
        heartbeat_at: new Date().toISOString(),
      }).eq('id', jobId);

      // 4. Iterate over the slice for THIS invocation only
      let processedThisRun = 0;
      for (const p of sliceFinal) {
        processed++;
        processedThisRun++;
        const meta = { ...(p.metadata ?? {}) };
        const sources: Record<string, string> = {};
        let changed = false;
        const code = (p.pha_code ?? '').toString().trim().toUpperCase();
        lastCode = code || lastCode;
        const enrichmentRow: Record<string, any> = { pha_code: code };
        let enrichmentDirty = false;

        // Improved skip: respect any of the populated unit-count fields, plus population.
        const numMeta = (k: string) => {
          const v = meta?.[k];
          if (typeof v === 'number' && v > 0) return v;
          if (typeof v === 'string' && /^\d+$/.test(v) && parseInt(v, 10) > 0) return parseInt(v, 10);
          return 0;
        };
        const hasUnitData =
          numMeta('voucher_count') > 0 ||
          numMeta('section8_units') > 0 ||
          numMeta('total_units') > 0 ||
          numMeta('psh_total_units') > 0;
        const skipBecauseEnriched = mode === 'missing' && hasUnitData && meta.population;

        if (!skipBecauseEnriched) {
          // ---- HUD PHA registry (Public_Housing_Authorities) ----
          if (code && hud.has(code)) {
            const a = hud.get(code)!;
            const sec8 = pickSection8Units(a);
            const auth = pickAuthorizedUnits(a);
            const leased = pickLeasedUnits(a);
            const pctOcc = pickPctOccupied(a);

            if (sec8 != null && numMeta('section8_units') !== sec8) {
              meta.section8_units = sec8;
              sources.section8_units = 'HUD ArcGIS PHA Registry';
              changed = true;
            }
            // Use Section 8 units as voucher_count fallback if not already set
            if (sec8 != null && !numMeta('voucher_count')) {
              meta.voucher_count = sec8;
              sources.voucher_count = 'HUD ArcGIS PHA Registry (Section 8)';
              changed = true;
            }
            if (auth != null) {
              enrichmentRow.authorized_units = auth;
              sources.authorized_units = 'HUD ArcGIS PHA Registry';
              enrichmentDirty = true;
            }
            if (leased != null) {
              enrichmentRow.leased_units = leased;
              sources.leased_units = 'HUD ArcGIS PHA Registry';
              enrichmentDirty = true;
            } else if (sec8 != null && pctOcc != null) {
              enrichmentRow.leased_units = Math.round((pctOcc / 100) * sec8);
              sources.leased_units = 'HUD ArcGIS PHA Registry (derived)';
              enrichmentDirty = true;
            }
            if (pctOcc != null) {
              meta.utilization_pct = pctOcc;
              sources.utilization_pct = 'HUD ArcGIS PHA Registry';
              enrichmentRow.utilization_pct = pctOcc;
              enrichmentDirty = true;
              changed = true;
            }

            const sem = pickSemap(a);
            if (sem && meta.semap_score !== sem) {
              meta.semap_score = sem;
              sources.semap_score = 'HUD ArcGIS PHA Registry';
              changed = true;
              enrichmentRow.semap_tier = sem;
              enrichmentDirty = true;
            }

            if (pickMtw(a)) {
              if (meta.mtw !== true) {
                meta.mtw = true;
                sources.mtw = 'HUD ArcGIS PHA Registry (program type)';
                changed = true;
              }
              enrichmentRow.is_mtw = true;
              enrichmentDirty = true;
            }

            // ---- ED contacts (high-value: lets us actually reach decision-makers) ----
            const edEmail = pickEdEmail(a);
            if (edEmail) {
              if (meta.exec_dir_email !== edEmail) {
                meta.exec_dir_email = edEmail;
                sources.exec_dir_email = 'HUD ArcGIS PHA Registry';
                changed = true;
              }
              enrichmentRow.ed_email = edEmail;
              enrichmentDirty = true;
            }
            const edPhone = pickEdPhone(a);
            if (edPhone) {
              if (meta.exec_dir_phone !== edPhone) {
                meta.exec_dir_phone = edPhone;
                sources.exec_dir_phone = 'HUD ArcGIS PHA Registry';
                changed = true;
              }
              enrichmentRow.ed_phone = edPhone;
              enrichmentDirty = true;
            }
            const edName = typeof a.FORMAL_PARTICIPANT_NAME === 'string' ? a.FORMAL_PARTICIPANT_NAME.trim() : null;
            if (edName && !meta.ed_name) {
              meta.formal_name = edName;
              sources.formal_name = 'HUD ArcGIS PHA Registry';
              changed = true;
            }

            // ---- Annual expenses (real budget, much better than estimated admin fees) ----
            const annualExpenses = pickAnnualExpenses(a);
            if (annualExpenses != null) {
              if (meta.annual_expenses !== annualExpenses) {
                meta.annual_expenses = annualExpenses;
                sources.annual_expenses = 'HUD ArcGIS PHA Registry';
                changed = true;
              }
              // `estimated_admin_budget_annual` is a generated column in Postgres;
              // keep real annual expenses on metadata until we add a dedicated raw-expense column.
              enrichmentDirty = true;
            }

            // ---- 5-yr federal funding (cap fund + op fund × 5) ----
            const fedFunding = pickFederalFunding(a);
            if (fedFunding != null) {
              enrichmentRow.federal_funding_5yr = fedFunding;
              sources.federal_funding_5yr = 'HUD ArcGIS PHA Registry (capfund + opfund × 5)';
              enrichmentDirty = true;
            }

            // ---- Inferred website from ED email domain ----
            const inferredSite = inferWebsiteFromEmail(edEmail);
            if (inferredSite) {
              if (!meta.website) {
                meta.website = inferredSite;
                sources.website = 'HUD ArcGIS PHA Registry (inferred from ED email)';
                changed = true;
              }
              if (!enrichmentRow.website_url) {
                enrichmentRow.website_url = inferredSite;
                enrichmentDirty = true;
              }
            }

            meta.data_source = 'hud';
          }

          // ---- MTW cohort cross-join ----
          if (code && mtwSet.has(code)) {
            if (meta.mtw !== true) {
              meta.mtw = true;
              sources.mtw = 'HUD MTW Cohort List';
              changed = true;
            }
            enrichmentRow.is_mtw = true;
            enrichmentDirty = true;
          }

          // ---- Admin fee rate cross-join ----
          if (code && adminFeeMap.has(code)) {
            const fee = adminFeeMap.get(code)!;
            if (fee.col_a != null) {
              enrichmentRow.admin_fee_col_a = fee.col_a;
              sources.admin_fee_col_a = 'HUD Admin Fee Schedule';
              enrichmentDirty = true;
            }
            if (fee.col_b != null) {
              enrichmentRow.admin_fee_col_b = fee.col_b;
              sources.admin_fee_col_b = 'HUD Admin Fee Schedule';
              enrichmentDirty = true;
            }
          }

          // ---- Census population ----
          if (enrichPopulation && (!meta.population || mode === 'all') && p.city && p.state) {
            const pop = await fetchCensusPopulation(p.city, p.state);
            if (pop != null && meta.population !== pop) {
              meta.population = pop;
              sources.population = 'US Census ACS5';
              changed = true;
            }
          }

          // ZIP backfill on the housing_authorities row itself (column added by migration)
          let zipFromHud: string | null = null;
          if (code && hud.has(code)) {
            const a = hud.get(code)!;
            if (typeof a.STD_ZIP5 === 'string' && a.STD_ZIP5.trim()) {
              zipFromHud = a.STD_ZIP5.trim();
              if (!meta.zip || meta.zip !== zipFromHud) {
                meta.zip = zipFromHud;
                sources.zip = 'HUD ArcGIS PHA Registry';
                changed = true;
              }
            }
          }

          if (changed || zipFromHud) {
            meta.enriched_at = new Date().toISOString();
            const updatePayload: Record<string, any> = { metadata: meta };
            if (zipFromHud) updatePayload.zip = zipFromHud;
            const { error: upErr } = await admin
              .from('housing_authorities')
              .update(updatePayload)
              .eq('id', p.id);
            if (upErr) errors.push({ pha_id: p.id, error: upErr.message });
            else if (changed) updated++;
          }

          if (code) {
            if (Object.keys(sources).length > 0) enrichmentRow.source_breakdown = sources;
            enrichmentRow.enriched_at = new Date().toISOString();
            const { error: enErr } = await admin
              .from('pha_enrichment')
              .upsert(enrichmentRow, { onConflict: 'pha_code' });
            if (enErr) errors.push({ pha_code: code, error: 'enrichment: ' + enErr.message });
          }
        }

        // Heartbeat + checkpoint every 25 rows so the UI stays fresh
        if (processedThisRun % 25 === 0) {
          await admin.from('pha_enrichment_jobs').update({
            processed_count: processed,
            updated_count: updated,
            error_count: errors.length,
            errors: errors.slice(-20),
            cursor_offset: sliceStartFinal + processedThisRun,
            last_processed_pha_code: lastCode,
            heartbeat_at: new Date().toISOString(),
          }).eq('id', jobId);
        }
      }

      const newCursor = sliceStartFinal + processedThisRun;
      const isDone = newCursor >= totalFinal;

      await admin.from('pha_enrichment_jobs').update({
        status: isDone ? 'completed' : 'paused',
        processed_count: processed,
        updated_count: updated,
        error_count: errors.length,
        errors: errors.slice(-50),
        cursor_offset: newCursor,
        last_processed_pha_code: lastCode,
        heartbeat_at: new Date().toISOString(),
        finished_at: isDone ? new Date().toISOString() : null,
      }).eq('id', jobId);

      // Auto-chain: if there is more work, kick off the next chunk in the background.
      if (!isDone) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/enrich-pha-registry`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader, // reuse caller auth so admin check passes
              'apikey': anonKey,
            },
            body: JSON.stringify({
              mode,
              enrichPopulation,
              batchSize,
              resumeJobId: jobId,
              startOffset: newCursor,
            }),
          });
        } catch (chainErr) {
          console.warn('chain invoke failed (UI will need manual Resume)', chainErr);
        }
      }
    } catch (e: any) {
      console.error('enrich job failed', e);
      await admin.from('pha_enrichment_jobs').update({
        status: 'failed',
        processed_count: processed,
        updated_count: updated,
        error_count: errors.length + 1,
        errors: [...errors.slice(-50), { fatal: e?.message ?? String(e) }],
        last_processed_pha_code: lastCode,
        heartbeat_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
  })();

  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work);
  } else {
    work.catch((e) => console.error('bg', e));
  }

  return new Response(JSON.stringify({ success: true, job_id: jobId }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
