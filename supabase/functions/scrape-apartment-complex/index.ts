import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for extracting apartment complex data with all floor plans
const complexSchema = {
  type: "object",
  properties: {
    property_name: { type: "string", description: "Name of the apartment complex or community (e.g. 'Vi Collina')" },
    address: {
      type: "object",
      properties: {
        street: { type: "string", description: "Street address" },
        city: { type: "string", description: "City name" },
        state: { type: "string", description: "State abbreviation (e.g. TX)" },
        zip: { type: "string", description: "ZIP code" }
      }
    },
    description: { type: "string", description: "Full property/community description" },
    year_built: { type: "number", description: "Year the complex was built" },
    total_units: { type: "number", description: "Total number of units in the complex" },
    stories: { type: "number", description: "Number of stories/floors in the building" },
    community_amenities: {
      type: "array",
      items: { type: "string" },
      description: "Community/building amenities like pool, gym, clubhouse, parking garage, business center, dog park, rooftop, concierge, package lockers, etc."
    },
    unit_amenities: {
      type: "array",
      items: { type: "string" },
      description: "In-unit amenities like dishwasher, washer/dryer, granite counters, stainless steel appliances, hardwood floors, balcony, walk-in closets, etc."
    },
    pet_policy: {
      type: "object",
      properties: {
        allowed: { type: "boolean", description: "Whether pets are allowed" },
        deposit: { type: "number", description: "Pet deposit amount" },
        monthly_fee: { type: "number", description: "Monthly pet rent/fee" },
        restrictions: { type: "string", description: "Breed/weight restrictions or notes" }
      }
    },
    contact_info: {
      type: "object",
      properties: {
        name: { type: "string", description: "Leasing office or management company name" },
        phone: { type: "string", description: "Contact phone number" },
        email: { type: "string", description: "Contact email" }
      }
    },
    photos: {
      type: "array",
      items: { type: "string" },
      description: "URLs of ALL property/community photos and images found on the page"
    },
    floor_plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Floor plan name/label (e.g. 'The Milan', 'A1', 'Studio Deluxe')" },
          bedrooms: { type: "number", description: "Number of bedrooms (0 for studio)" },
          bathrooms: { type: "number", description: "Number of bathrooms" },
          sqft_min: { type: "number", description: "Minimum square footage" },
          sqft_max: { type: "number", description: "Maximum square footage" },
          rent_min: { type: "number", description: "Minimum monthly rent in dollars." },
          rent_max: { type: "number", description: "Maximum monthly rent in dollars." },
          availability: { type: "string", description: "Availability status or date" },
          deposit: { type: "number", description: "Security deposit amount" },
          available_units: { type: "number", description: "Number of units available" },
          photos: {
            type: "array",
            items: { type: "string" },
            description: "URLs of photos specific to this floor plan"
          }
        }
      },
      description: "ALL available floor plans/unit types with their details."
    },
    utilities_included: {
      type: "array",
      items: { type: "string" },
      description: "Utilities included in rent (water, trash, internet, etc.)"
    },
    parking: {
      type: "object",
      properties: {
        type: { type: "string", description: "Parking type (garage, covered, surface, street)" },
        cost: { type: "number", description: "Monthly parking cost" },
        details: { type: "string", description: "Additional parking details" }
      }
    },
    lease_terms: {
      type: "array",
      items: { type: "string" },
      description: "Available lease term options"
    },
    neighborhood: { type: "string", description: "Neighborhood or area name" },
    walk_score: { type: "number", description: "Walk Score if available" },
    transit_score: { type: "number", description: "Transit Score if available" }
  }
};

// Fallback: parse floor plans from raw markdown text
function parseFloorPlansFromMarkdown(markdown: string): any[] {
  const plans: any[] = [];
  const lines = markdown.split('\n');
  const bedBathPattern = /(\d+)\s*(?:bed(?:room)?s?|br)\s*[\/|,\s]+\s*(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?|ba)/i;
  const sqftPattern = /(\d{3,5})\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i;
  const planNamePattern = /^(?:#{1,4}\s+)?([A-Z][A-Za-z0-9\s\-\.]{1,30}?)(?:\s*[-–|]|\s*$)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const bedMatch = line.match(bedBathPattern);
    if (!bedMatch) continue;
    const bedrooms = parseInt(bedMatch[1]);
    const bathrooms = parseFloat(bedMatch[2]);
    const sqftMatch = line.match(sqftPattern) ||
                      (i > 0 ? lines[i-1].match(sqftPattern) : null) ||
                      (i < lines.length - 1 ? lines[i+1].match(sqftPattern) : null);
    const contextBlock = [
      i > 0 ? lines[i-1] : '', line, i < lines.length - 1 ? lines[i+1] : ''
    ].join(' ');
    const rents: number[] = [];
    let rm; const rr = /\$\s*([\d,]+)/g;
    while ((rm = rr.exec(contextBlock)) !== null) {
      const val = parseInt(rm[1].replace(/,/g, ''));
      if (val >= 300 && val <= 20000) rents.push(val);
    }
    const prevLine = i > 0 ? lines[i-1].trim() : '';
    const nameMatch = prevLine.match(planNamePattern);
    const name = nameMatch ? nameMatch[1].trim() : `${bedrooms === 0 ? 'Studio' : bedrooms + ' Bed'}`;
    const isDupe = plans.some(p => p.bedrooms === bedrooms && p.bathrooms === bathrooms && p.name === name);
    if (isDupe) continue;
    plans.push({
      name, bedrooms, bathrooms,
      sqft_min: sqftMatch ? parseInt(sqftMatch[1]) : null,
      sqft_max: sqftMatch ? parseInt(sqftMatch[1]) : null,
      rent_min: rents.length > 0 ? Math.min(...rents) : null,
      rent_max: rents.length > 0 ? Math.max(...rents) : null,
      availability: null, deposit: null, photos: [],
    });
  }
  return plans;
}

// ---------- Multi-page smart scrape helpers ----------

async function mapSite(url: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, limit: 100, includeSubdomains: false }),
    });
    if (!res.ok) {
      console.log(`Map failed ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.links) ? data.links : [];
  } catch (e) {
    console.log('Map error:', e);
    return [];
  }
}

const JUNK_PATTERNS = /\/(privacy|terms|legal|accessibility|sitemap|blog|news|careers|jobs|press|policy|disclaimer|cookie|fair-housing|ada)(\/|$|\?)|mailto:|tel:|\.(pdf|zip|doc|docx|xls|xlsx)(\?|$)|#/i;

type Bucket = 'home' | 'gallery' | 'amenities' | 'floorplans' | 'neighborhood' | 'contact' | 'pets';

function classifyPages(links: string[], baseUrl: string): { bucket: Bucket; url: string }[] {
  const base = new URL(baseUrl);
  const baseHost = base.hostname.replace(/^www\./, '');
  const homeUrl = `${base.protocol}//${base.hostname}${base.pathname.replace(/\/$/, '') || ''}` || baseUrl;

  const buckets: Record<Bucket, { url: string; score: number } | null> = {
    home: { url: baseUrl, score: 100 },
    gallery: null, amenities: null, floorplans: null, neighborhood: null, contact: null, pets: null,
  };

  const patterns: { bucket: Bucket; regex: RegExp; score: number }[] = [
    { bucket: 'gallery', regex: /\/(gallery|galleries|photos?|photo-tour|community-photos|our-community|explore|amenities-gallery|tour|virtual-tour|media)(\/|$|\?)/i, score: 10 },
    { bucket: 'amenities', regex: /\/(amenities|features)(\/|$|\?)/i, score: 10 },
    { bucket: 'floorplans', regex: /\/(floor[\s-_]?plans?|floorplans|units|apartments|our-apartments|pricing|availability|rates|rent)(\/|$|\?)/i, score: 10 },
    { bucket: 'neighborhood', regex: /\/(neighborhood|location|area|community)(\/|$|\?)/i, score: 5 },
    { bucket: 'contact', regex: /\/(contact|contact-us|leasing|visit|tour-request)(\/|$|\?)/i, score: 8 },
    { bucket: 'pets', regex: /\/(pets?|pet-policy)(\/|$|\?)/i, score: 5 },
  ];

  // Multi-entry buckets: gallery can have up to 2 (e.g. /gallery/ + /photo-tour/)
  const galleryCandidates: { url: string; score: number }[] = [];

  for (const link of links) {
    if (typeof link !== 'string' || !link) continue;
    if (JUNK_PATTERNS.test(link)) continue;
    let host = '';
    try { host = new URL(link).hostname.replace(/^www\./, ''); } catch { continue; }
    if (host !== baseHost) continue;

    for (const p of patterns) {
      if (!p.regex.test(link)) continue;
      const score = p.score - link.length / 100;
      if (p.bucket === 'gallery') {
        galleryCandidates.push({ url: link, score });
      } else {
        const current = buckets[p.bucket];
        if (!current || score > current.score) {
          buckets[p.bucket] = { url: link, score };
        }
      }
    }
  }

  // Pick top 2 distinct gallery URLs
  const sortedGallery = galleryCandidates
    .sort((a, b) => b.score - a.score)
    .filter((v, i, arr) => arr.findIndex(x => x.url === v.url) === i)
    .slice(0, 2);

  const out: { bucket: Bucket; url: string }[] = [];
  (['home', 'floorplans', 'amenities', 'contact', 'pets', 'neighborhood'] as Bucket[]).forEach((b) => {
    const v = buckets[b];
    if (v) out.push({ bucket: b, url: v.url });
  });
  sortedGallery.forEach(g => out.push({ bucket: 'gallery', url: g.url }));
  return out;
}

async function scrapePage(url: string, apiKey: string, useActions: boolean | 'gallery' = false) {
  const isGallery = useActions === 'gallery';
  const body: any = {
    url,
    formats: ['markdown', 'html', 'links', 'extract'],
    extract: { schema: complexSchema },
    onlyMainContent: false,
    waitFor: isGallery ? 3500 : 4000,
  };
  if (useActions) {
    body.actions = isGallery
      ? [
          { type: 'wait', milliseconds: 1500 },
          { type: 'scroll', direction: 'down', amount: 8 },
          { type: 'wait', milliseconds: 1200 },
          { type: 'scroll', direction: 'down', amount: 8 },
          { type: 'wait', milliseconds: 1000 },
          { type: 'scroll', direction: 'down', amount: 8 },
          { type: 'wait', milliseconds: 800 },
        ]
      : [
          { type: 'wait', milliseconds: 1500 },
          { type: 'scroll', direction: 'down', amount: 6 },
          { type: 'wait', milliseconds: 1000 },
          { type: 'scroll', direction: 'down', amount: 6 },
          { type: 'wait', milliseconds: 800 },
        ];
  }
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Scrape ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    extract: data?.data?.extract || data?.extract || null,
    markdown: data?.data?.markdown || data?.markdown || '',
    html: data?.data?.html || data?.html || '',
    links: data?.data?.links || data?.links || [],
    metadata: data?.data?.metadata || data?.metadata || {},
  };
}

// Decode common HTML entities so URLs with &amp; / &#x2F; round-trip cleanly.
function decodeEntities(s: string): string {
  if (!s) return s;
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

// Extract markdown image URLs ![alt](url) from Firecrawl markdown output.
function extractMarkdownImageUrls(markdown: string): string[] {
  if (!markdown) return [];
  const out = new Set<string>();
  const re = /!\[[^\]]*\]\(([^)\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const u = decodeEntities(m[1].trim());
    if (/^https?:\/\//i.test(u)) out.add(u);
  }
  return Array.from(out);
}

// Extract <a href="...image"> lightbox links that point at full-size images.
function extractLightboxImagesFromHtml(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const out = new Set<string>();
  const re = /<a\b[^>]*\bhref\s*=\s*("([^"]+)"|'([^']+)')[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = (m[2] ?? m[3] ?? '').trim();
    if (!href) continue;
    if (!/\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i.test(href)) continue;
    const r = resolveUrl(href, baseUrl);
    if (r) out.add(r);
  }
  return Array.from(out);
}

// Extract full-size image URLs stored in data-* attributes used by lightbox/gallery widgets
// (Apts247, RentCafe, Entrata, etc.). These tiles often live on <div>, not <a>, so the
// lightbox-href extractor misses them.
function extractDataPhotoUrls(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const out = new Set<string>();
  const attrs = ['data-photo', 'data-photo-url', 'data-full', 'data-large', 'data-zoom-image', 'data-image', 'data-bg', 'data-bg-image', 'data-original'];
  const re = new RegExp(`\\b(${attrs.join('|')})\\s*=\\s*("([^"]+)"|'([^']+)')`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[3] ?? m[4] ?? '').trim();
    const val = decodeEntities(raw);
    if (!val) continue;
    if (!/^(https?:|\/)/i.test(val)) continue;
    if (!/\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i.test(val)) continue;
    const r = resolveUrl(val, baseUrl);
    if (r) out.add(r);
  }
  return Array.from(out);
}

function resolveUrl(href: string, baseUrl: string): string | null {
  if (!href) return null;
  const trimmed = href.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

// Extract image URLs from rendered HTML: <img src/srcset/data-*>, <source srcset>, inline background-image
function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const out = new Set<string>();

  const pickFromSrcset = (val: string): string | null => {
    // pick the largest candidate
    const candidates = val.split(',').map((s) => s.trim()).filter(Boolean);
    let best: { url: string; w: number } | null = null;
    for (const c of candidates) {
      const parts = c.split(/\s+/);
      const u = parts[0];
      const desc = parts[1] || '';
      const m = desc.match(/(\d+)w/i);
      const w = m ? parseInt(m[1]) : 0;
      if (!best || w > best.w) best = { url: u, w };
    }
    return best?.url || null;
  };

  // <img ...>
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const attrRe = /(src|data-src|data-lazy-src|data-lazy|data-original|data-hi-res-src|data-image|data-srcset|srcset)\s*=\s*("([^"]*)"|'([^']*)')/gi;
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(tag)) !== null) {
      const name = a[1].toLowerCase();
      const val = (a[3] ?? a[4] ?? '').trim();
      if (!val) continue;
      if (name.endsWith('srcset')) {
        const picked = pickFromSrcset(val);
        const r = picked ? resolveUrl(picked, baseUrl) : null;
        if (r) out.add(r);
      } else {
        const r = resolveUrl(val, baseUrl);
        if (r) out.add(r);
      }
    }
  }

  // <source srcset="...">
  const sourceRe = /<source\b[^>]*srcset\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const val = (m[2] ?? m[3] ?? '').trim();
    const picked = pickFromSrcset(val);
    const r = picked ? resolveUrl(picked, baseUrl) : null;
    if (r) out.add(r);
  }

  // inline background-image: url(...)
  const bgRe = /background(?:-image)?\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  while ((m = bgRe.exec(html)) !== null) {
    const r = resolveUrl(m[1], baseUrl);
    if (r) out.add(r);
  }

  return Array.from(out);
}

const PHOTO_CDN_HINTS = /(cloudinary|imgix|cloudfront|akamai|wixstatic|squarespace|shopify|fastly|imagekit|sirv|entrata|apartmentseo|resman|rentcafe|widen\.net|apts247|wp-content\/uploads|\/images?\/|\/media\/|\/photos?\/|\/gallery|\/uploads?\/)/i;
const TINY_HINTS = /(-\d{1,3}x\d{1,3}\.|[?&](?:w|width)=([1-9]?\d|1[0-4]\d)(?:&|$)|[?&]h=([1-9]?\d|1[0-4]\d)(?:&|$)|-thumb|_thumb|thumbnail|favicon|sprite|placeholder|loader|spinner)/i;
const JUNK_IMG = /(\/icons?\/|\bicon-|\/logos?\/|\blogo[-_.]|favicon|sprite|placeholder|avatar|badge|loader|spinner|pixel\.gif|1x1\.|tracking\.|analytics\.|google-?maps|gstatic|fonts?\.|\/svg\/|\.svg(\?|#|$)|img-loading|img-none|no[-_]?image|noimage|coming-?soon|amenity_lists\/)/i;
const RESIZE_PARAMS = new Set([
  'w','h','width','height','q','quality','fit','crop','dpr','auto','format','fm',
  'resize','size','sharp','blur','rect','mw','mh','sw','sh','c','m',
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
  'cb','cache','v','version','t','ts','_','rand'
]);

// Unwrap CDN-wrapped image URLs like /image-proxy?url=https://real.com/photo.jpg
function unwrapImageUrl(u: string): string {
  const decoded = decodeEntities(u);
  try {
    const url = new URL(decoded);
    for (const key of ['url','src','image','img','file','u','i','source','path','href']) {
      const v = url.searchParams.get(key);
      if (v && /^https?:\/\//i.test(v) && /\.(jpg|jpeg|png|webp|gif|avif)/i.test(v)) {
        return v;
      }
    }
  } catch {}
  return decoded;
}

// Build a canonical key that ignores resize/quality/cache params and trailing -123x456 suffixes
function canonicalImageKey(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '');
    let path = url.pathname;

    // CDN asset-id patterns: collapse all sizes/formats for the same asset.
    // images.apts247.info/{assetId}/{WxH}.{ext}  -> apts247:{assetId}
    let m = path.match(/^\/(\d{3,})\/\d{2,5}x\d{2,5}\.(?:webp|jpe?g|png|avif|gif)$/i);
    if (host.endsWith('apts247.info') && m) return `apts247:${m[1]}`;

    // Generic /{assetId}/{size}.{ext} on image-style hosts
    if (/^(images?|cdn|media|static\d*)\./i.test(host)) {
      m = path.match(/^\/([A-Za-z0-9_-]{4,})\/\d{2,5}x\d{2,5}\.(?:webp|jpe?g|png|avif|gif)$/i);
      if (m) return `${host}:${m[1].toLowerCase()}`;
    }

    // Cloudinary: /image/upload/<transformations>/<publicId>.<ext> -> drop transforms
    if (host.includes('cloudinary')) {
      const cm = path.match(/\/image\/upload\/(?:[^/]+\/)*([^/]+)$/i);
      if (cm) return `cloudinary:${cm[1].toLowerCase().replace(/\.[a-z]{3,4}$/, '')}`;
    }

    // strip resize-only params
    const keep: string[] = [];
    url.searchParams.forEach((val, key) => {
      if (!RESIZE_PARAMS.has(key.toLowerCase())) keep.push(`${key}=${val}`);
    });
    // strip WordPress-style -1024x768 size suffix before extension
    path = path.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, '');
    // strip @2x / @3x retina suffix
    path = path.replace(/@[1-3]x(?=\.[a-z]{3,4}$)/i, '');
    // strip "-scaled" wp suffix
    path = path.replace(/-scaled(?=\.[a-z]{3,4}$)/i, '');
    // strip extension so .webp/.jpeg variants of same asset collapse
    path = path.replace(/\.(webp|jpe?g|png|avif|gif)$/i, '');
    return `${host}${path.toLowerCase()}${keep.length ? '?' + keep.sort().join('&') : ''}`;
  } catch {
    return u.split('?')[0].split('#')[0].toLowerCase();
  }
}

// Estimate "size score" of a candidate so we keep the largest variant per group
function imageSizeScore(u: string): number {
  let score = 0;
  try {
    const url = new URL(u);
    const w = parseInt(url.searchParams.get('w') || url.searchParams.get('width') || '0');
    const h = parseInt(url.searchParams.get('h') || url.searchParams.get('height') || '0');
    if (w) score += w;
    if (h) score += h;
    // path-embedded dimensions e.g. /232951/2600x1456.jpeg or -1024x768.jpg
    const m = url.pathname.match(/(\d{2,5})x(\d{2,5})(?=\.[a-z]{3,4}$|\b)/i);
    if (m) score += parseInt(m[1]) + parseInt(m[2]);
    // mild preference for jpeg over webp for max preview compatibility (tie-breaker only)
    if (/\.jpe?g(\?|#|$)/i.test(url.pathname + url.search)) score += 1;
  } catch {}
  if (score === 0) score = u.length; // fallback
  return score;
}

export interface PhotoFilterStats {
  raw: number;
  unique: number;
}

function filterPhotoUrls(urls: string[], stats?: PhotoFilterStats): string[] {
  const best = new Map<string, { url: string; score: number }>();
  let raw = 0;
  for (const original of urls) {
    if (typeof original !== 'string') continue;
    raw++;
    const trimmed = original.trim();
    // Skip page links / anchors / non-image hrefs that PHOTO_CDN_HINTS could accidentally allow
    if (/#/.test(trimmed)) continue;
    if (/\.(html?|php|aspx?|jsp)(\?|$)/i.test(trimmed)) continue;
    const unwrapped = unwrapImageUrl(trimmed);
    if (!unwrapped || unwrapped.startsWith('data:')) continue;
    const hasExt = /\.(jpg|jpeg|png|webp|gif|avif)(\?|#|$)/i.test(unwrapped);
    const looksLikePhoto = hasExt || PHOTO_CDN_HINTS.test(unwrapped);
    if (!looksLikePhoto) continue;
    if (JUNK_IMG.test(unwrapped)) continue;
    if (TINY_HINTS.test(unwrapped)) continue;
    const key = canonicalImageKey(unwrapped);
    const score = imageSizeScore(unwrapped);
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { url: unwrapped, score });
  }
  if (stats) { stats.raw = raw; stats.unique = best.size; }
  // sort: largest/most specific first
  return Array.from(best.values()).sort((a, b) => b.score - a.score).map(v => v.url);
}

function pickFirstNonEmpty<T>(values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    return v;
  }
  return null;
}

function mergeAmenities(lists: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item !== 'string') continue;
      const k = item.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(item.trim());
    }
  }
  return out;
}

function mergeFloorPlans(lists: any[][]): any[] {
  const map = new Map<string, any>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const fp of list) {
      if (!fp || typeof fp !== 'object') continue;
      const key = `${(fp.name || '').toLowerCase().trim()}|${fp.bedrooms ?? ''}|${fp.bathrooms ?? ''}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...fp, photos: Array.isArray(fp.photos) ? fp.photos : [] });
      } else {
        // Fill missing fields
        for (const field of ['sqft_min', 'sqft_max', 'rent_min', 'rent_max', 'availability', 'deposit', 'available_units']) {
          if ((existing[field] === null || existing[field] === undefined) && fp[field] !== null && fp[field] !== undefined) {
            existing[field] = fp[field];
          }
        }
        if (Array.isArray(fp.photos)) {
          const set = new Set(existing.photos);
          fp.photos.forEach((p: string) => set.add(p));
          existing.photos = Array.from(set);
        }
      }
    }
  }
  return Array.from(map.values());
}

function mergeComplexData(pages: { bucket: Bucket; url: string; result: Awaited<ReturnType<typeof scrapePage>> }[]) {
  // Order pages so that dedicated pages take priority for their own field types
  const home = pages.find(p => p.bucket === 'home');
  const contact = pages.find(p => p.bucket === 'contact');
  const amenitiesPage = pages.find(p => p.bucket === 'amenities');
  const floorPlansPage = pages.find(p => p.bucket === 'floorplans');

  const allExtracts = pages.map(p => p.result.extract).filter(Boolean);

  // Photos: union from all pages' extract.photos + image links + parsed HTML <img>/srcset/bg
  const photoSet = new Set<string>();
  for (const p of pages) {
    const ex = p.result.extract;
    if (ex?.photos && Array.isArray(ex.photos)) {
      ex.photos.forEach((u: string) => { if (typeof u === 'string') photoSet.add(u); });
    }
    (p.result.links || []).forEach((u: string) => { if (typeof u === 'string') photoSet.add(u); });
    extractImagesFromHtml(p.result.html || '', p.url).forEach((u) => photoSet.add(u));
    extractLightboxImagesFromHtml(p.result.html || '', p.url).forEach((u) => photoSet.add(u));
    extractDataPhotoUrls(p.result.html || '', p.url).forEach((u) => photoSet.add(u));
    extractMarkdownImageUrls(p.result.markdown || '').forEach((u) => photoSet.add(u));
  }
  const photoStats: PhotoFilterStats = { raw: 0, unique: 0 };
  let photos = filterPhotoUrls(Array.from(photoSet), photoStats);
  // Cap (high enough for full apartment galleries)
  const PHOTO_CAP = 200;
  photos = photos.slice(0, PHOTO_CAP);

  // Floor plans: prefer dedicated page, but merge all
  const fpLists = pages.map(p => p.result.extract?.floor_plans || []);
  let floorPlans = mergeFloorPlans(fpLists);
  // Markdown fallback if still thin
  if (floorPlans.length <= 1) {
    const fpMd = floorPlansPage?.result.markdown || home?.result.markdown || '';
    if (fpMd) {
      const md = parseFloorPlansFromMarkdown(fpMd);
      if (md.length > floorPlans.length) floorPlans = md;
    }
  }

  // Amenities: union, prefer dedicated page first
  const communityLists = [
    amenitiesPage?.result.extract?.community_amenities,
    ...allExtracts.map(e => e?.community_amenities),
  ];
  const unitLists = [
    amenitiesPage?.result.extract?.unit_amenities,
    ...allExtracts.map(e => e?.unit_amenities),
  ];

  // Scalars: contact prefers contact page; address prefers contact then home; rest first non-empty
  const contactPriority = [contact?.result.extract?.contact_info, ...allExtracts.map(e => e?.contact_info)];
  const addressPriority = [contact?.result.extract?.address, home?.result.extract?.address, ...allExtracts.map(e => e?.address)];

  const merged = {
    property_name: pickFirstNonEmpty(allExtracts.map(e => e?.property_name)) || home?.result.metadata?.title || '',
    address: pickFirstNonEmpty(addressPriority) || { street: '', city: '', state: '', zip: '' },
    description: pickFirstNonEmpty(allExtracts.map(e => e?.description)) || '',
    year_built: pickFirstNonEmpty(allExtracts.map(e => e?.year_built)),
    total_units: pickFirstNonEmpty(allExtracts.map(e => e?.total_units)),
    stories: pickFirstNonEmpty(allExtracts.map(e => e?.stories)),
    community_amenities: mergeAmenities(communityLists),
    unit_amenities: mergeAmenities(unitLists),
    pet_policy: pickFirstNonEmpty(allExtracts.map(e => e?.pet_policy)) || { allowed: null, deposit: null, monthly_fee: null, restrictions: '' },
    contact_info: pickFirstNonEmpty(contactPriority) || { name: '', phone: '', email: '' },
    photos,
    floor_plans: floorPlans,
    utilities_included: mergeAmenities(allExtracts.map(e => e?.utilities_included)),
    parking: pickFirstNonEmpty(allExtracts.map(e => e?.parking)) || { type: '', cost: null, details: '' },
    lease_terms: mergeAmenities(allExtracts.map(e => e?.lease_terms)),
    neighborhood: pickFirstNonEmpty(allExtracts.map(e => e?.neighborhood)) || '',
    walk_score: pickFirstNonEmpty(allExtracts.map(e => e?.walk_score)),
    transit_score: pickFirstNonEmpty(allExtracts.map(e => e?.transit_score)),
    photo_stats: photoStats,
  };

  return merged;
}

// ---------- Handler ----------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // If the user pasted a deep link (e.g. /gallery/), always also crawl the site root
    // so we still get property name, floor plans, contact, etc.
    let rootUrl = formattedUrl;
    let pastedDeepLink: { bucket: Bucket; url: string } | null = null;
    try {
      const u = new URL(formattedUrl);
      const path = u.pathname.replace(/\/$/, '');
      if (path && path !== '') {
        rootUrl = `${u.protocol}//${u.host}/`;
        // Detect bucket of the pasted URL so we honor it as a forced target
        const lower = formattedUrl.toLowerCase();
        if (/\/(gallery|galleries|photos?|photo-tour|community-photos|our-community|explore|amenities-gallery|tour|virtual-tour|media)(\/|$|\?)/i.test(lower)) {
          pastedDeepLink = { bucket: 'gallery', url: formattedUrl };
        } else if (/\/(floor[\s-_]?plans?|floorplans|units|apartments|our-apartments|pricing|availability|rates|rent)(\/|$|\?)/i.test(lower)) {
          pastedDeepLink = { bucket: 'floorplans', url: formattedUrl };
        } else if (/\/(amenities|features)(\/|$|\?)/i.test(lower)) {
          pastedDeepLink = { bucket: 'amenities', url: formattedUrl };
        } else if (/\/(contact|leasing|visit)(\/|$|\?)/i.test(lower)) {
          pastedDeepLink = { bucket: 'contact', url: formattedUrl };
        }
      }
    } catch { /* ignore */ }

    console.log('Smart scrape starting for:', formattedUrl, '(root:', rootUrl, ')');

    // Step 1: Map the site (always from root)
    const siteLinks = await mapSite(rootUrl, apiKey);
    console.log(`Map returned ${siteLinks.length} links`);

    const MAX_PAGES = 8;

    // Step 2: Pick high-value pages
    let targets: { bucket: Bucket; url: string }[] = [];
    if (siteLinks.length > 0) {
      targets = classifyPages(siteLinks, rootUrl);
    }
    if (targets.length === 0) {
      targets = [{ bucket: 'home', url: rootUrl }];
    }
    if (!targets.some(t => t.bucket === 'home')) {
      targets.unshift({ bucket: 'home', url: rootUrl });
    }
    // If user pasted a deep link, force-include it (even if we already picked a peer for that bucket)
    if (pastedDeepLink && !targets.some(t => t.url === pastedDeepLink!.url)) {
      targets.push(pastedDeepLink);
    }
    targets = targets.slice(0, MAX_PAGES);

    console.log(`Scraping ${targets.length} pages: ${targets.map(t => t.bucket).join(', ')}`);

    // Step 3: Scrape selected pages in parallel
    const settled = await Promise.allSettled(
      targets.map(t => {
        const useActions: boolean | 'gallery' = t.bucket === 'gallery' ? 'gallery' : (t.bucket === 'home' ? true : false);
        return scrapePage(t.url, apiKey, useActions).then(result => ({ bucket: t.bucket, url: t.url, result }));
      })
    );

    const successPages: { bucket: Bucket; url: string; result: Awaited<ReturnType<typeof scrapePage>> }[] = [];
    const pagesScraped: string[] = [];
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled') {
        successPages.push(s.value);
        pagesScraped.push(`${s.value.bucket}`);
      } else {
        console.log(`Page ${targets[i].bucket} (${targets[i].url}) failed:`, s.reason?.message || s.reason);
      }
    });

    if (successPages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'All page scrapes failed. The listing site may be slow or blocking automation.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Merge
    const mergedData = mergeComplexData(successPages);

    // Step 5: Safety net — if floor plans still thin, retry home with click actions
    if (mergedData.floor_plans.length <= 1) {
      console.log('Floor plans still thin, trying click-action retry on home...');
      try {
        const retry = await scrapePage(formattedUrl, apiKey, true);
        const retryPlans = retry.extract?.floor_plans || parseFloorPlansFromMarkdown(retry.markdown || '');
        if (retryPlans.length > mergedData.floor_plans.length) {
          mergedData.floor_plans = retryPlans;
          pagesScraped.push('home (expanded)');
        }
      } catch (e) {
        console.log('Click-action retry failed:', e);
      }
    }

    const homePage = successPages.find(p => p.bucket === 'home');
    const result = {
      success: true,
      data: {
        ...mergedData,
        source_url: formattedUrl,
        scraped_at: new Date().toISOString(),
        raw_markdown: (homePage?.result.markdown || '').substring(0, 10000),
        pages_scraped: pagesScraped,
      }
    };

    console.log(`Smart scrape complete: ${result.data.property_name}, ${result.data.floor_plans.length} floor plans, ${result.data.photos.length} photos, ${pagesScraped.length} pages`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping complex:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape complex' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
