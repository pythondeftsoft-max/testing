// supabase/functions/enrich-pha-website/index.ts
// Per-PHA on-demand website intelligence via Firecrawl.
// v2: Deep scan — map → pick high-signal URLs → scrape up to 6 pages → merge → fingerprint.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VENDOR_PATTERNS: Array<{ vendor: string; pattern: RegExp; portalVendor?: boolean }> = [
  // Housing-specific HCV/PH software (the real competitive set)
  { vendor: 'HAPPY', pattern: /\bhappy\s*software\b|happysoftware\.com/i },
  { vendor: 'Emphasys', pattern: /\bemphasys\b|emphasys-software\.com/i },
  { vendor: 'Yardi', pattern: /\byardi\b|yardi\.com/i },
  { vendor: 'Tenmast', pattern: /\btenmast\b|tenmast\.com/i },
  { vendor: 'PHA-Web', pattern: /\bpha-?web\b|phaweb\.com/i, portalVendor: true },
  { vendor: 'MRI', pattern: /\bmri\s*(software|residential)\b|mrisoftware\.com/i },
  { vendor: 'RentCafe', pattern: /\brentcafe\b|rentcafe\.com/i, portalVendor: true },
  { vendor: 'NMA / NanMcKay', pattern: /\bnan\s*mckay\b|nanmckay\.com|nmaportal/i },
  { vendor: 'Lindsey Software', pattern: /\blindsey\s*software\b|lindseysoftware\.com/i },
  { vendor: 'WinTen2+', pattern: /\bwinten2?\+?\b|wintenplus|tenmast.*winten/i },
  { vendor: 'ECS / Elite CS', pattern: /\belite\s*computer\s*systems\b|elitecs\.com/i },
  { vendor: 'MultiSite Systems', pattern: /\bmultisite\s*systems\b|multisitesys\.com/i },
  { vendor: 'HAB Inc', pattern: /\bhab\s*inc\b|habinc\.com/i },
  { vendor: 'Visual Homes', pattern: /\bvisual\s*homes\b|visualhomes\.com/i },
  { vendor: 'ProLink HCV', pattern: /\bprolink\s*(hcv|solutions)?\b|prolinksolutions\.com/i },
  { vendor: 'TenantTech', pattern: /\btenanttech\b|tenanttech\.com/i },
  { vendor: 'NovoGradac', pattern: /\bnovogradac\b|novoco\.com/i },
  { vendor: 'Bostonpost', pattern: /\bbostonpost\b|bostonpost\.com/i },
  { vendor: 'Partner', pattern: /\bpartner\s*(inc|software)\b|gopartnerinc\.com/i },

  // Payment / disbursement rails
  { vendor: 'Nelnet', pattern: /\bnelnet\b|nelnetcampuscommerce\.com/i },
  { vendor: 'Checkbook', pattern: /\bcheckbook\.io\b/i },
  { vendor: 'Plaid', pattern: /\bplaid\b|plaid\.com/i },
  { vendor: 'Dwolla', pattern: /\bdwolla\b|dwolla\.com/i },
  { vendor: 'Stripe', pattern: /\bstripe\b|js\.stripe\.com/i },
  { vendor: 'Square', pattern: /\bsquareup\.com|square\s*payments\b/i },

  // E-signature (signals digital-readiness)
  { vendor: 'DocuSign', pattern: /\bdocusign\b|docusign\.net/i },
  { vendor: 'SignNow', pattern: /\bsignnow\b|signnow\.com/i },

  // Resident portal infrastructure
  { vendor: 'ActiveBuilding', pattern: /\bactivebuilding\b|activebuilding\.com/i, portalVendor: true },
];

const PORTAL_PATTERNS: RegExp[] = [
  /\b(tenant|landlord|client|applicant|owner)\s*(portal|login|sign[- ]?in)\b/i,
  /\bonline\s*portal\b/i,
  /\bportal\.[\w.-]+\.(gov|org|com)\b/i,
];

const PAYMENT_PATTERNS: Array<{ method: string; pattern: RegExp }> = [
  { method: 'Direct deposit / ACH', pattern: /\b(direct\s*deposit|ach\s*(transfer|payment)|electronic\s*funds)\b/i },
  { method: 'Checkbook.io', pattern: /\bcheckbook\.io\b/i },
  { method: 'Paper check', pattern: /\b(paper\s*check|mailed\s*check|check\s*by\s*mail)\b/i },
  { method: 'Wire transfer', pattern: /\bwire\s*transfer\b/i },
];

const RFP_PATTERNS: RegExp[] = [
  /\brfp\b|\brequest\s*for\s*proposal/i,
  /\brfq\b|\brequest\s*for\s*qualification/i,
  /\bbid\s*opportunit/i,
  /\bprocurement\b/i,
];

// Path keywords that signal a high-value sub-page worth scraping
const PATH_KEYWORDS: Array<{ kw: RegExp; weight: number }> = [
  { kw: /section[-_ ]?8|housing[-_ ]?choice|hcv\b/i, weight: 10 },
  { kw: /applicant|apply|application|waitlist|wait[-_ ]?list/i, weight: 8 },
  { kw: /portal|login|account|sign[-_ ]?in/i, weight: 8 },
  { kw: /tenant|resident|participant/i, weight: 6 },
  { kw: /landlord|owner|property[-_ ]?owner/i, weight: 6 },
  { kw: /online[-_ ]?(application|services|portal)/i, weight: 7 },
  { kw: /rent[-_ ]?cafe|partnerinc|happysoftware|emphasys|yardi|tenmast|mrisoftware|phaweb/i, weight: 12 },
  { kw: /procurement|rfp|rfq|bid/i, weight: 4 },
];

interface ScanResult {
  software: string[];
  paymentMethod: string | null;
  hasOnlinePortal: boolean | null;
  portalVendor: string | null;
  latestRfpUrl: string | null;
}

function scan(text: string, links: string[]): ScanResult {
  const software = new Set<string>();
  let portalVendor: string | null = null;

  for (const { vendor, pattern, portalVendor: isPortal } of VENDOR_PATTERNS) {
    if (pattern.test(text)) {
      software.add(vendor);
      if (isPortal) portalVendor = vendor;
      continue;
    }
    for (const link of links) {
      if (pattern.test(link)) {
        software.add(vendor);
        if (isPortal) portalVendor = vendor;
        break;
      }
    }
  }

  const hasOnlinePortal =
    PORTAL_PATTERNS.some((p) => p.test(text)) ||
    links.some((l) => /portal|login|applicant|apply/i.test(l));

  let paymentMethod: string | null = null;
  for (const { method, pattern } of PAYMENT_PATTERNS) {
    if (pattern.test(text)) {
      paymentMethod = method;
      break;
    }
  }

  let latestRfpUrl: string | null = null;
  for (const link of links) {
    if (RFP_PATTERNS.some((p) => p.test(link))) {
      latestRfpUrl = link;
      break;
    }
  }

  return {
    software: Array.from(software),
    paymentMethod,
    hasOnlinePortal,
    portalVendor,
    latestRfpUrl,
  };
}

const MAP_TIMEOUT_MS = 25_000;
const SCRAPE_TIMEOUT_MS = 30_000;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function firecrawlMap(url: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout('https://api.firecrawl.dev/v2/map', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        search: 'section 8 portal applicant tenant landlord login apply',
        limit: 50,
        includeSubdomains: true,
      }),
    }, MAP_TIMEOUT_MS);
    if (!res.ok) {
      console.warn('Firecrawl map failed', url, res.status);
      return [];
    }
    const data = await res.json();
    const links: string[] = data?.links ?? data?.data?.links ?? [];
    return links.map((x: any) => (typeof x === 'string' ? x : x?.url)).filter(Boolean);
  } catch (e: any) {
    console.warn('Firecrawl map error', url, e?.name === 'AbortError' ? 'timeout' : e);
    return [];
  }
}

async function firecrawlScrape(
  url: string,
  apiKey: string
): Promise<{ markdown: string; links: string[] } | { error: string } | null> {
  try {
    const res = await fetchWithTimeout('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
      }),
    }, SCRAPE_TIMEOUT_MS);
    if (!res.ok) {
      console.warn('Firecrawl scrape failed', url, res.status);
      return { error: `http_${res.status}` };
    }
    const data = await res.json();
    const doc = data?.data ?? data;
    return {
      markdown: String(doc?.markdown ?? ''),
      links: Array.isArray(doc?.links)
        ? doc.links.map((x: any) => (typeof x === 'string' ? x : x?.url)).filter(Boolean)
        : [],
    };
  } catch (e: any) {
    const reason = e?.name === 'AbortError' ? 'timeout' : (e?.message ?? 'error');
    console.warn('Firecrawl error', url, reason);
    return { error: reason };
  }
}

// Score each URL by how much sales-signal its path carries.
function scoreUrl(url: string): number {
  let score = 0;
  for (const { kw, weight } of PATH_KEYWORDS) {
    if (kw.test(url)) score += weight;
  }
  // Penalize obviously low-signal pages
  if (/\.(pdf|jpg|png|gif|zip|doc|xls)$/i.test(url)) score -= 20;
  if (/\/(news|press|blog|event|calendar|board[-_ ]?meeting)/i.test(url)) score -= 4;
  return score;
}

function pickPagesToScan(homepage: string, mappedUrls: string[], cap = 6): string[] {
  const seen = new Set<string>();
  const picked: string[] = [];

  // Always include homepage
  picked.push(homepage);
  seen.add(homepage.replace(/\/$/, ''));

  const scored = mappedUrls
    .filter((u) => {
      const norm = u.replace(/\/$/, '');
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    })
    .map((u) => ({ url: u, score: scoreUrl(u) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { url } of scored) {
    if (picked.length >= cap) break;
    picked.push(url);
  }
  return picked;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

  if (!firecrawlKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const userId = userRes.user.id;

  const [{ data: legacyRoleRow }, { data: sysRow }] = await Promise.all([
    admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    admin
      .from('system_admins')
      .select('role_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_name', ['super_admin', 'operations_admin'])
      .maybeSingle(),
  ]);

  if (!legacyRoleRow && !sysRow) {
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
    const roleList = (roles ?? []).map((r: any) => r.role).join(', ') || 'none';
    return new Response(
      JSON.stringify({
        success: false,
        error: `Admin access required (your roles: ${roleList}).`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const { housing_authority_id, website } = body;

  if (!housing_authority_id) {
    return new Response(
      JSON.stringify({ success: false, error: 'housing_authority_id required' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: pha, error: phaErr } = await admin
    .from('housing_authorities')
    .select('id, pha_code, name, city, state, metadata')
    .eq('id', housing_authority_id)
    .maybeSingle();
  if (phaErr || !pha) {
    return new Response(
      JSON.stringify({ success: false, error: phaErr?.message ?? 'PHA not found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = website || pha.metadata?.website;
  if (!url) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No website URL on file. Provide one in the request body.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 1) MAP — discover candidate URLs
  const mapped = await firecrawlMap(url, firecrawlKey);

  // 2) PICK — homepage + top high-signal pages
  const pages = pickPagesToScan(url, mapped, 6);

  // 3) SCRAPE in parallel — allSettled so one slow/failing page doesn't kill the scan
  const settled = await Promise.allSettled(pages.map((p) => firecrawlScrape(p, firecrawlKey)));

  const successfulPages: string[] = [];
  const failedPages: Array<{ url: string; reason: string }> = [];
  let mergedMarkdown = '';
  const mergedLinks: string[] = [];
  settled.forEach((res, i) => {
    const url = pages[i];
    if (res.status === 'rejected') {
      failedPages.push({ url, reason: String(res.reason ?? 'rejected') });
      return;
    }
    const doc = res.value;
    if (!doc || 'error' in doc) {
      failedPages.push({ url, reason: (doc && 'error' in doc) ? doc.error : 'no_content' });
      return;
    }
    successfulPages.push(url);
    mergedMarkdown += '\n\n' + doc.markdown;
    mergedLinks.push(...doc.links);
  });

  if (successfulPages.length === 0) {
    return jsonResponse({
      success: false,
      error: failedPages.some((f) => f.reason === 'timeout')
        ? 'Site is slow or blocking scrapers — every page timed out. Try again later or paste a direct page URL.'
        : 'Failed to scrape any pages from this site.',
      pages_failed: failedPages,
    });
  }

  // 4) MATCH — fingerprint vendors against merged corpus
  const result = scan(mergedMarkdown, mergedLinks);

  // 5) "Likely homegrown" signal — distinguish "we looked and found nothing" from "we didn't look"
  let portalVendor = result.portalVendor;
  if (
    successfulPages.length >= 3 &&
    result.software.length === 0 &&
    !portalVendor
  ) {
    portalVendor = 'none-detected';
  }

  const scanDepth = mapped.length > 0 ? 'deep' : 'homepage';
  const nowIso = new Date().toISOString();

  if (pha.pha_code) {
    const { error: upErr } = await admin.from('pha_enrichment').upsert(
      {
        pha_code: pha.pha_code,
        detected_software: result.software,
        detected_payment_method: result.paymentMethod,
        has_online_portal: result.hasOnlinePortal,
        portal_vendor: portalVendor,
        latest_rfp_url: result.latestRfpUrl,
        website_enriched_at: nowIso,
        last_scanned_at: nowIso,
        pages_scanned: successfulPages,
        pages_scanned_count: successfulPages.length,
        scan_depth: scanDepth,
        enrichment_source: {
          website: url,
          scanned_at: nowIso,
          mapped_count: mapped.length,
          scraped_count: successfulPages.length,
          failed_count: failedPages.length,
          pages_failed: failedPages,
          scan_depth: scanDepth,
        },
      },
      { onConflict: 'pha_code' }
    );
    if (upErr) {
      console.error('upsert err', upErr);
      return jsonResponse({ success: false, error: upErr.message });
    }
  }

  return jsonResponse({
    success: true,
    scanned_url: url,
    scan_depth: scanDepth,
    pages_scanned: successfulPages,
    pages_scanned_count: successfulPages.length,
    pages_failed: failedPages,
    mapped_count: mapped.length,
    ...result,
    portalVendor,
  });
});
