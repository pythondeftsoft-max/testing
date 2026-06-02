import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== PERCENTAGE-BASED SCORING (0-100% per factor) ==========

// Location: 0-100% based on drive time (continuous linear curve)
const calculateLocationPercentage = (driveTimeMinutes: number | null): { percentage: number; excluded: boolean } => {
  if (driveTimeMinutes === null) return { percentage: 50, excluded: false }; // Unknown = 50%
  if (driveTimeMinutes > 45) return { percentage: 20, excluded: true };       // Too far = excluded
  if (driveTimeMinutes <= 10) return { percentage: 100, excluded: false };    // Perfect
  
  // Linear decay: 100% at 10 min → 50% at 45 min
  // Decay rate: (100-50) / (45-10) = 50/35 ≈ 1.43 per minute
  const score = Math.round(100 - ((driveTimeMinutes - 10) * 1.43));
  return { percentage: Math.max(50, score), excluded: false };
};

// Budget: 0-100% — Universal range-based (V3)
// rent_range_max = "max rent I can handle" for everyone
// No voucher-specific branching
const calculateBudgetPercentage = (tenantBudget: number | null, propertyRent: number | null): number => {
  if (!tenantBudget || !propertyRent) return 50; // Unknown = 50%
  if (propertyRent <= tenantBudget) return 100;           // In range
  if (propertyRent <= tenantBudget * 1.10) return 80;     // Slight stretch / PHA exception zone
  if (propertyRent <= tenantBudget * 1.20) return 60;     // Possible
  if (propertyRent <= tenantBudget * 1.30) return 40;     // Unlikely but show it
  return 15;                                               // Out of range
};

// Parse bedroom strings like "4BR", "Studio/1BR" into integers
const parseBedroomValue = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const str = String(value).toLowerCase().replace(/\s/g, '');
  if (str.includes('studio') || str === '0') return 0;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Pre-filter: returns true if bedroom gap is too large (2+), meaning skip this match entirely
const bedroomGapTooLarge = (tenantNeeds: any, propertyHas: number | null): boolean => {
  if (propertyHas === null || propertyHas === undefined) return false;
  if (Array.isArray(tenantNeeds) && tenantNeeds.length > 0) {
    const parsed = tenantNeeds.map(parseBedroomValue).filter((n): n is number => n !== null);
    if (parsed.length === 0) return false;
    const closestGap = Math.min(...parsed.map(n => Math.abs(n - propertyHas)));
    return closestGap >= 2;
  }
  const need = parseBedroomValue(tenantNeeds);
  if (need === null) return false;
  return Math.abs(need - propertyHas) >= 2;
};

// Bedrooms: 0-100% based on match (V2 - supports arrays, string values, voucher directional rule)
// Voucher rule: can go UP 1 BR (3BR voucher → 4BR house = OK), CANNOT go DOWN (4BR voucher → 3BR = bad)
const calculateBedroomPercentageV2 = (tenantNeeds: any, propertyHas: number | null, isVoucherHolder: boolean = false): number => {
  if (propertyHas === null || propertyHas === undefined) return 50;
  if (Array.isArray(tenantNeeds) && tenantNeeds.length > 0) {
    const parsed = tenantNeeds.map(parseBedroomValue).filter((n): n is number => n !== null);
    if (parsed.length === 0) return 50;
    if (parsed.includes(propertyHas)) return 100;
    
    if (isVoucherHolder) {
      const bestUp = parsed.some(n => propertyHas === n + 1);
      if (bestUp) return 80; // Property 1 larger = allowed upgrade
      const bestDown = parsed.some(n => propertyHas === n - 1);
      if (bestDown) return 20; // Property 1 smaller = NOT allowed downgrade
      return 30;
    }
    
    const closestDiff = Math.min(...parsed.map(n => Math.abs(n - propertyHas)));
    if (closestDiff === 1) return 80;
    if (closestDiff === 2) return 50;
    return 30;
  }
  const need = parseBedroomValue(tenantNeeds);
  if (need === null) return 50;
  const diff = propertyHas - need; // positive = property larger, negative = property smaller
  
  if (diff === 0) return 100;
  
  if (isVoucherHolder) {
    if (diff === 1) return 80;   // Property 1 larger = OK upgrade
    if (diff === -1) return 20;  // Property 1 smaller = NOT allowed
    return 30;
  }
  
  // Non-voucher: symmetric
  if (Math.abs(diff) === 1) return 80;
  if (Math.abs(diff) === 2) return 50;
  return 30;
};

// Pets: 0-100%
const calculatePetPercentage = (tenantHasPets: boolean, propertyAllowsPets: boolean): number => {
  if (!tenantHasPets) return 100;  // No pets = always compatible
  return propertyAllowsPets ? 100 : 20;
};

// Timing: 0-100% — Actually compare dates (V3)
const calculateTimingPercentage = (tenantMoveIn: string | null, propertyAvailableDate: string | null): number => {
  if (!tenantMoveIn) return 50;  // No data = neutral, NOT 100
  
  const now = new Date();
  
  // Parse move-in window
  if (tenantMoveIn === 'immediately' || tenantMoveIn === 'asap') {
    if (!propertyAvailableDate) return 100; // Assume available now
    const availDate = new Date(propertyAvailableDate);
    const daysUntil = Math.max(0, (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 14) return 100;
    if (daysUntil <= 30) return 85;
    return 60;
  }
  
  if (tenantMoveIn === '30_days') {
    if (!propertyAvailableDate) return 90;
    const availDate = new Date(propertyAvailableDate);
    const daysUntil = Math.max(0, (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) return 85;
    if (daysUntil <= 60) return 60;
    return 40;
  }
  
  if (tenantMoveIn === '60_days' || tenantMoveIn === '90_days') {
    if (!propertyAvailableDate) return 80;
    const availDate = new Date(propertyAvailableDate);
    const daysUntil = Math.max(0, (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 60) return 80;
    if (daysUntil <= 90) return 60;
    return 40;
  }
  
  // Has some move-in info but unrecognized format
  return 60;
};

// Freshness: 0-100% — Prioritize active inventory (V3 new)
const calculateFreshnessPercentage = (listedDate: string | null, createdAt: string | null): number => {
  const refDate = listedDate || createdAt;
  if (!refDate) return 30; // Unknown = low priority
  
  const now = new Date();
  const listed = new Date(refDate);
  const daysOld = Math.max(0, (now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysOld <= 7) return 100;
  if (daysOld <= 30) return 80;
  if (daysOld <= 60) return 50;
  return 30;
};

// V3 Weights — Location and Bedrooms dominate (60%)
const WEIGHTS = {
  location: 0.30,
  bedrooms: 0.30,
  budget: 0.15,
  timing: 0.10,
  freshness: 0.10,
  pets: 0.05,
};

// Calculate overall percentage score from factor percentages (V3)
const calculateOverallScore = (breakdown: { location: number; budget: number; bedrooms: number; move_in: number; freshness: number; pets: number }): number => {
  return Math.round(
    breakdown.location * WEIGHTS.location +
    breakdown.bedrooms * WEIGHTS.bedrooms +
    breakdown.budget * WEIGHTS.budget +
    breakdown.move_in * WEIGHTS.timing +
    breakdown.freshness * WEIGHTS.freshness +
    breakdown.pets * WEIGHTS.pets
  );
};

// Tier labels based on overall percentage
const getMatchTier = (score: number, excluded: boolean): string => {
  if (excluded) return 'excluded';
  if (score >= 80) return 'hot_match';     // Strong
  if (score >= 60) return 'decent_match';  // Viable
  if (score >= 40) return 'no_match';      // Conditional (still stored, lower priority)
  return 'no_match';                        // Poor
};

// ========== DRIVE TIME CALCULATION ==========

// US Zipcode 3-digit prefix to regional centroid mapping
// This provides regional accuracy (~5-20 miles) for Haversine fallback when Google API fails
const getZipcodeCentroid = (zip: string): { lat: number; lon: number } | null => {
  if (!zip || zip.length < 3) return null;
  const prefix = zip.slice(0, 3);
  
  // NJ: 070-089
  if (prefix >= '070' && prefix <= '089') return { lat: 40.2, lon: -74.5 };
  // NY Metro: 100-119
  if (prefix >= '100' && prefix <= '119') return { lat: 40.7, lon: -74.0 };
  // NY Upstate: 120-149
  if (prefix >= '120' && prefix <= '149') return { lat: 42.7, lon: -73.8 };
  // PA Eastern: 150-196
  if (prefix >= '150' && prefix <= '196') return { lat: 40.0, lon: -76.3 };
  // DE: 197-199
  if (prefix >= '197' && prefix <= '199') return { lat: 39.7, lon: -75.5 };
  // DC/MD: 200-219
  if (prefix >= '200' && prefix <= '219') return { lat: 38.9, lon: -77.0 };
  // VA: 220-246
  if (prefix >= '220' && prefix <= '246') return { lat: 37.5, lon: -77.5 };
  // NC: 270-289
  if (prefix >= '270' && prefix <= '289') return { lat: 35.8, lon: -79.0 };
  // SC: 290-299
  if (prefix >= '290' && prefix <= '299') return { lat: 34.0, lon: -81.0 };
  // GA: 300-319 (Atlanta area)
  if (prefix >= '300' && prefix <= '319') return { lat: 33.75, lon: -84.4 };
  // FL North: 320-339
  if (prefix >= '320' && prefix <= '339') return { lat: 30.3, lon: -81.7 };
  // FL Central/South: 340-349
  if (prefix >= '340' && prefix <= '349') return { lat: 25.8, lon: -80.2 };
  // AL: 350-369
  if (prefix >= '350' && prefix <= '369') return { lat: 33.5, lon: -86.8 };
  // TN: 370-385
  if (prefix >= '370' && prefix <= '385') return { lat: 36.2, lon: -86.8 };
  // MS: 386-397
  if (prefix >= '386' && prefix <= '397') return { lat: 32.3, lon: -90.2 };
  // LA: 700-714
  if (prefix >= '700' && prefix <= '714') return { lat: 30.0, lon: -90.1 };
  // TX Houston: 770-779
  if (prefix >= '770' && prefix <= '779') return { lat: 29.8, lon: -95.4 };
  // TX Dallas/FW: 750-769
  if (prefix >= '750' && prefix <= '769') return { lat: 32.8, lon: -96.8 };
  // TX Austin/SA: 780-789
  if (prefix >= '780' && prefix <= '789') return { lat: 30.3, lon: -97.7 };
  // OH: 430-459
  if (prefix >= '430' && prefix <= '459') return { lat: 40.0, lon: -83.0 };
  // MI: 480-499
  if (prefix >= '480' && prefix <= '499') return { lat: 42.3, lon: -83.0 };
  // IL Chicago: 600-629
  if (prefix >= '600' && prefix <= '629') return { lat: 41.9, lon: -87.6 };
  // MO St Louis: 630-639
  if (prefix >= '630' && prefix <= '639') return { lat: 38.6, lon: -90.2 };
  // MO Kansas City: 640-649
  if (prefix >= '640' && prefix <= '649') return { lat: 39.1, lon: -94.6 };
  // CA LA: 900-935
  if (prefix >= '900' && prefix <= '935') return { lat: 34.0, lon: -118.2 };
  // CA SF Bay: 940-961
  if (prefix >= '940' && prefix <= '961') return { lat: 37.8, lon: -122.4 };
  // WA Seattle: 980-994
  if (prefix >= '980' && prefix <= '994') return { lat: 47.6, lon: -122.3 };
  // AZ Phoenix: 850-865
  if (prefix >= '850' && prefix <= '865') return { lat: 33.4, lon: -112.1 };
  // CO Denver: 800-816
  if (prefix >= '800' && prefix <= '816') return { lat: 39.7, lon: -105.0 };
  // MA Boston: 010-027
  if (prefix >= '010' && prefix <= '027') return { lat: 42.4, lon: -71.1 };
  // CT: 060-069
  if (prefix >= '060' && prefix <= '069') return { lat: 41.3, lon: -72.9 };
  
  return null;
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const estimateDriveTime = (distanceKm: number): number => {
  return Math.round(distanceKm / 48 * 60);
};

// Get drive time with caching and comprehensive logging
const getDriveTime = async (
  supabase: any,
  originZip: string,
  destinationZip: string,
  originLat?: number,
  originLon?: number,
  destLat?: number,
  destLon?: number,
  originAddress?: string
): Promise<{ driveTimeMinutes: number | null; source: 'google' | 'cache' | 'estimated' }> => {
  // Log and handle missing zip codes
  if (!originZip || !destinationZip) {
    console.warn(`[getDriveTime] Missing zip: origin=${originZip || 'NULL'}, dest=${destinationZip || 'NULL'}`);
    
    // Try coordinate-based fallback with zipcode centroid
    if (destLat && destLon && originZip) {
      const originCentroid = getZipcodeCentroid(originZip);
      if (originCentroid) {
        const distance = haversineDistance(originCentroid.lat, originCentroid.lon, destLat, destLon);
        const driveTimeMinutes = estimateDriveTime(distance);
        console.log(`[getDriveTime] Using zipcode centroid fallback: ${originZip} → (${destLat.toFixed(2)}, ${destLon.toFixed(2)}) = ${driveTimeMinutes}min`);
        return { driveTimeMinutes, source: 'estimated' };
      }
    }
    
    // No data available - mark as unknown
    return { driveTimeMinutes: null, source: 'estimated' };
  }

  // Check cache first
  const { data: cached } = await supabase
    .from('drive_time_cache')
    .select('drive_time_minutes')
    .eq('origin_zip', originZip)
    .eq('destination_zip', destinationZip)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return { driveTimeMinutes: cached.drive_time_minutes, source: 'cache' };
  }

  // Try Google Routes API
  const googleApiKey = Deno.env.get('GOOGLE_ROUTES_API_KEY');
  if (!googleApiKey) {
    console.warn('[getDriveTime] GOOGLE_ROUTES_API_KEY not configured - falling back to Haversine');
  } else {
    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        },
        body: JSON.stringify({
          origin: { address: originAddress || (originZip + ', USA') },
          destination: { address: destinationZip + ', USA' },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE'
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[getDriveTime] Google API HTTP ${response.status}: ${errorBody.substring(0, 500)}`);
      } else {
        const data = await response.json();
        if (!data.routes?.length) {
          console.warn(`[getDriveTime] Empty routes array for ${originZip} → ${destinationZip}`);
        } else if (data.routes[0]?.duration) {
          const durationSeconds = parseInt(data.routes[0].duration.replace('s', ''));
          const driveTimeMinutes = Math.round(durationSeconds / 60);
          const distanceKm = (data.routes[0].distanceMeters || 0) / 1000;

          // Cache the result
          await supabase.from('drive_time_cache').upsert({
            origin_zip: originZip,
            destination_zip: destinationZip,
            drive_time_minutes: driveTimeMinutes,
            distance_km: distanceKm,
            cached_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'origin_zip,destination_zip' });

          console.log(`[getDriveTime] Google API success: ${originZip} → ${destinationZip} = ${driveTimeMinutes}min`);
          return { driveTimeMinutes, source: 'google' };
        } else {
          console.warn(`[getDriveTime] No duration in route for ${originZip} → ${destinationZip}`);
        }
      }
    } catch (error) {
      console.error('[getDriveTime] Google Routes API exception:', error);
    }
  }

  // Fallback #1: Use provided coordinates directly
  if (originLat && originLon && destLat && destLon) {
    const distance = haversineDistance(originLat, originLon, destLat, destLon);
    const driveTimeMinutes = estimateDriveTime(distance);
    console.log(`[getDriveTime] Haversine fallback (coords): (${originLat.toFixed(2)}, ${originLon.toFixed(2)}) → (${destLat.toFixed(2)}, ${destLon.toFixed(2)}) = ${driveTimeMinutes}min`);
    return { driveTimeMinutes, source: 'estimated' };
  }

  // Fallback #2: Use zipcode centroids with property coordinates
  if (destLat && destLon) {
    const originCentroid = getZipcodeCentroid(originZip);
    if (originCentroid) {
      const distance = haversineDistance(originCentroid.lat, originCentroid.lon, destLat, destLon);
      const driveTimeMinutes = estimateDriveTime(distance);
      console.log(`[getDriveTime] Haversine fallback (centroid→coords): ${originZip} → (${destLat.toFixed(2)}, ${destLon.toFixed(2)}) = ${driveTimeMinutes}min`);
      return { driveTimeMinutes, source: 'estimated' };
    }
  }

  // Fallback #3: Use zipcode centroids for both sides
  const originCentroid = getZipcodeCentroid(originZip);
  const destCentroid = getZipcodeCentroid(destinationZip);
  if (originCentroid && destCentroid) {
    const distance = haversineDistance(originCentroid.lat, originCentroid.lon, destCentroid.lat, destCentroid.lon);
    const driveTimeMinutes = estimateDriveTime(distance);
    console.log(`[getDriveTime] Haversine fallback (centroid→centroid): ${originZip} → ${destinationZip} = ${driveTimeMinutes}min`);
    return { driveTimeMinutes, source: 'estimated' };
  }

  // Final fallback: return null (unknown) instead of hardcoded 30
  console.warn(`[getDriveTime] No fallback available for ${originZip} → ${destinationZip}, marking as unknown`);
  return { driveTimeMinutes: null, source: 'estimated' };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ========== DIRECT COMPUTE PATH (bypasses queue) ==========
    const body = await req.json().catch(() => ({}));
    if (body.directCompute) {
      const { entity_type, entity_id } = body.directCompute;
      console.log(`[compute-match-queue] Direct compute requested: ${entity_type}:${entity_id}`);

      if (entity_type !== 'tenant' && entity_type !== 'property') {
        return new Response(
          JSON.stringify({ success: false, error: `Unknown entity_type: ${entity_type}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Run the heavy work in the background so the request returns immediately
      // and never hits the 150s idle timeout. EdgeRuntime.waitUntil keeps the
      // worker alive after the response is sent.
      const work = (async () => {
        const t0 = Date.now();
        try {
          if (entity_type === 'tenant') {
            await computeTenantMatches(supabase, entity_id);
          } else {
            const { data: units, error: unitsError } = await supabase
              .from('property_units')
              .select('id')
              .eq('property_id', entity_id)
              .eq('on_market', true);

            if (unitsError) {
              console.error(`[compute-match-queue] BG: failed unit lookup for ${entity_id}:`, unitsError.message);
              return;
            }
            if (!units?.length) {
              console.warn(`[compute-match-queue] BG: no on-market units for ${entity_id}`);
              return;
            }

            console.log(`[compute-match-queue] BG: computing matches for ${units.length} unit(s) of ${entity_id}`);
            for (const u of units) {
              try {
                await computePropertyMatches(supabase, u.id);
              } catch (e: any) {
                console.error(`[compute-match-queue] BG: unit ${u.id} failed:`, e?.message || e);
              }
            }
          }
          console.log(`[compute-match-queue] BG: direct compute done for ${entity_type}:${entity_id} in ${Date.now() - t0}ms`);
        } catch (e: any) {
          console.error(`[compute-match-queue] BG: direct compute failed for ${entity_type}:${entity_id}:`, e?.message || e);
        }
      })();

      // @ts-ignore — EdgeRuntime is a Supabase edge runtime global
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(work);
      } else {
        work.catch(() => {});
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'direct-async', entity_type, entity_id, queued: true }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== QUEUE PROCESSING PATH (cron) ==========
    // Get up to 10 items from the queue
    const { data: queueItems, error: queueError } = await supabase
      .from('match_compute_queue')
      .select('*')
      .is('processing_started_at', null)
      .order('requested_at', { ascending: true })
      .limit(10);

    if (queueError) throw queueError;

    // Belt-and-suspenders cleanup: remove computed_matches for off-market or occupied units
    const { data: staleCleanup, error: cleanupError } = await supabase.rpc('cleanup_stale_computed_matches');
    if (cleanupError) {
      // Non-fatal: log and continue
      console.warn('[compute-match-queue] Stale match cleanup failed, using inline query:', cleanupError.message);
      // Inline fallback cleanup
      const { error: inlineCleanupError } = await supabase
        .from('computed_matches')
        .delete()
        .or('unit_id.in.(select id from property_units where on_market = false or status = \'occupied\')');
      if (inlineCleanupError) {
        console.warn('[compute-match-queue] Inline cleanup also failed:', inlineCleanupError.message);
      }
    } else {
      console.log('[compute-match-queue] Stale match cleanup completed');
    }

    if (!queueItems?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Queue is empty' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[compute-match-queue] Processing ${queueItems.length} items`);

    // Mark items as processing
    const entityKeys = queueItems.map(q => ({ entity_type: q.entity_type, entity_id: q.entity_id }));
    for (const item of queueItems) {
      await supabase
        .from('match_compute_queue')
        .update({ processing_started_at: new Date().toISOString() })
        .eq('entity_type', item.entity_type)
        .eq('entity_id', item.entity_id);
    }

    let processed = 0;
    let errors: string[] = [];

    for (const item of queueItems) {
      try {
        if (item.entity_type === 'tenant') {
          await computeTenantMatches(supabase, item.entity_id);
        } else if (item.entity_type === 'property') {
          // Look up on-market units for this property
          const { data: units } = await supabase
            .from('property_units')
            .select('id')
            .eq('property_id', item.entity_id)
            .eq('on_market', true);

          if (units?.length) {
            for (const u of units) {
              await computePropertyMatches(supabase, u.id);
            }
          } else {
            console.warn(`[compute-match-queue] No on-market units for property ${item.entity_id} in queue`);
          }
        }

        // Remove from queue on success
        await supabase
          .from('match_compute_queue')
          .delete()
          .eq('entity_type', item.entity_type)
          .eq('entity_id', item.entity_id);

        processed++;
      } catch (error: any) {
        console.error(`[compute-match-queue] Error processing ${item.entity_type}:${item.entity_id}:`, error);
        errors.push(`${item.entity_type}:${item.entity_id}: ${(error instanceof Error ? error.message : String(error))}`);

        // Update attempts and error
        await supabase
          .from('match_compute_queue')
          .update({ 
            attempts: (item.attempts || 0) + 1,
            last_error: (error instanceof Error ? error.message : String(error)),
            processing_started_at: null // Allow retry
          })
          .eq('entity_type', item.entity_type)
          .eq('entity_id', item.entity_id);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[compute-match-queue] Completed in ${duration}ms: ${processed} processed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[compute-match-queue] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function computeTenantMatches(supabase: any, tenantId: string) {
  // Query tenant_profiles directly (robust approach matching seed endpoint)
  const { data: tp, error: tpError } = await supabase
    .from('tenant_profiles')
    .select(`*, profiles!tenant_profiles_user_id_fkey(id, first_name, last_name, email, housing_status)`)
    .eq('user_id', tenantId)
    .single();

  if (tpError || !tp) {
    // Check if profile exists at all
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', tenantId).single();
    if (!profile) throw new Error(`Tenant not found: ${tenantId}`);
    console.warn(`[compute-match-queue] No tenant_profile for ${tenantId}, skipping`);
    return;
  }

  const tenant = tp.profiles || {};
  console.log(`[compute-match-queue] Tenant data for ${tenantId}: zip=${tp.zip_code}, budget=${tp.rent_range_max || tp.voucher_amount}, bedrooms=${JSON.stringify(tp.bedrooms_approved)}, move_in=${tp.move_in_window}, state=${tp.state}`);
  const tenantState = tp.desired_state || tp.state;

  // Build property query - filter by state if tenant has one
  let propertyQuery = supabase
    .from('property_units')
    .select(`*, properties!inner(
      id, address, city, state, zipcode, deleted_at, pet_friendly, latitude, longitude
    )`)
    .eq('on_market', true)
    .neq('status', 'occupied')
    .is('properties.deleted_at', null);

  // STATE-BASED FILTERING: Only match against properties in the same state
  if (tenantState) {
    propertyQuery = propertyQuery.eq('properties.state', tenantState);
    console.log(`[compute-match-queue] Filtering properties to state: ${tenantState}`);
  } else {
    console.log(`[compute-match-queue] Tenant has no state - matching against ALL properties`);
  }

  const { data: properties } = await propertyQuery;

  if (!properties?.length) {
    console.log(`[compute-match-queue] No properties to match for tenant ${tenantId} (state: ${tenantState || 'any'})`);
    return;
  }

  console.log(`[compute-match-queue] Found ${properties.length} properties to match for tenant ${tenantId} (state: ${tenantState || 'any'})`);

  // tp is the tenant_profiles row, tenant is the joined profiles row
  const tenantBudget = tp.voucher_amount ?? tp.rent_range_max ?? tp.max_rent ?? tenant.max_budget ?? null;
  const tenantBedrooms = tp.bedrooms_approved?.length > 0 ? tp.bedrooms_approved : tenant.desired_bedrooms;
  const tenantZip = tp.desired_zip_code || tp.zip_code || '';
  const tenantAddress = tp.current_address || '';
  const tenantHasPets = tp.has_pets || false;
  const tenantMoveIn = tp.move_in_window || tenant.desired_move_in_date;
  const tenantVersion = tp.match_version || 1;
  const isVoucherHolder = tp.voucher_holder || false;

  const matches: any[] = [];

  for (const p of properties) {
    // BEDROOM PRE-FILTER: Skip if gap is 2+ bedrooms (saves drive time API calls)
    if (bedroomGapTooLarge(tenantBedrooms, p.bedrooms)) {
      console.log(`[compute-match-queue] Skipping bedroom mismatch: tenant needs ${JSON.stringify(tenantBedrooms)} vs property has ${p.bedrooms}BR`);
      continue;
    }

    const propertyZip = p.properties?.zipcode || '';
    
    const { driveTimeMinutes, source: driveTimeSource } = await getDriveTime(
      supabase,
      tenantZip,
      propertyZip,
      undefined, undefined,
      p.properties?.latitude,
      p.properties?.longitude,
      tenantAddress
    );

    const locationResult = calculateLocationPercentage(driveTimeMinutes);
    const propertyAllowsPets = p.properties?.pet_friendly ?? true;

    // Calculate percentage-based breakdown (V3)
    const breakdown = {
      location: locationResult.percentage,
      budget: calculateBudgetPercentage(tenantBudget, p.monthly_rent),
      bedrooms: calculateBedroomPercentageV2(tenantBedrooms, p.bedrooms, isVoucherHolder),
      pets: calculatePetPercentage(tenantHasPets, propertyAllowsPets),
      move_in: calculateTimingPercentage(tenantMoveIn, p.availability_date),
      freshness: calculateFreshnessPercentage(p.listed_date, p.created_at),
    };

    const score = calculateOverallScore(breakdown);
    const tier = getMatchTier(score, locationResult.excluded);

    matches.push({
      tenant_id: tenantId,
      unit_id: p.id,
      score,
      tier,
      breakdown,
      drive_time_minutes: driveTimeMinutes,
      drive_time_source: driveTimeSource,
      tenant_version: tenantVersion,
      property_version: p.match_version || 1,
      computed_at: new Date().toISOString(),
    });
  }

  // Upsert all matches for this tenant
  if (matches.length > 0) {
    const { error: upsertError } = await supabase
      .from('computed_matches')
      .upsert(matches, { 
        onConflict: 'tenant_id,unit_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      throw new Error(`Failed to upsert matches: ${upsertError.message}`);
    }

    console.log(`[compute-match-queue] Upserted ${matches.length} matches for tenant ${tenantId}`);
  }
}

async function computePropertyMatches(supabase: any, unitId: string) {
  // Get property data (including state for filtering)
  const { data: unit, error: unitError } = await supabase
    .from('property_units')
    .select(`*, properties!inner(
      id, address, city, state, zipcode, deleted_at, pet_friendly, latitude, longitude
    )`)
    .eq('id', unitId)
    .single();

  if (unitError || !unit) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  const propertyState = unit.properties?.state;

  // Get all active tenant profiles directly (robust approach)
  const { data: tenantProfiles, error: tpQueryError } = await supabase
    .from('tenant_profiles')
    .select(`*, profiles!tenant_profiles_user_id_fkey(id, first_name, last_name, email, housing_status, user_type)`);

  if (tpQueryError) {
    throw new Error(`Failed to fetch tenant profiles: ${tpQueryError.message}`);
  }

  // Filter to active tenants client-side (PostgREST joined-table filters can be unreliable)
  const validTenantProfiles = (tenantProfiles || []).filter((tp: any) => {
    const p = tp.profiles;
    return p?.id && p?.user_type === 'tenant' && ['seeking', 'approved', 'unhoused'].includes(p?.housing_status);
  });

  if (!validTenantProfiles.length) {
    console.log(`[compute-match-queue] No tenants to match for unit ${unitId}`);
    return;
  }

  // STATE-BASED FILTERING: Only match tenants in the same state (or those with no state preference)
  const filteredTenants = propertyState 
    ? validTenantProfiles.filter((tp: any) => {
        const effectiveState = tp.desired_state || tp.state;
        return effectiveState === propertyState || !effectiveState;
      })
    : validTenantProfiles;

  console.log(`[compute-match-queue] Filtered ${filteredTenants.length} of ${validTenantProfiles.length} tenants for property state: ${propertyState || 'any'}`);

  if (!filteredTenants.length) {
    console.log(`[compute-match-queue] No matching tenants for unit ${unitId} in state ${propertyState}`);
    return;
  }

  const propertyZip = unit.properties?.zipcode || '';
  const propertyAllowsPets = unit.properties?.pet_friendly ?? true;
  const propertyVersion = unit.match_version || 1;

  const matches: any[] = [];

  for (const tp of filteredTenants) {
    const tenant = tp.profiles || {};
    const tenantBudget = tp.voucher_amount ?? tp.rent_range_max ?? tp.max_rent ?? tenant.max_budget ?? null;
    const tenantBedrooms = tp.bedrooms_approved?.length > 0 ? tp.bedrooms_approved : tenant.desired_bedrooms;
    const tenantZip = tp.desired_zip_code || tp.zip_code || '';
    const tenantAddress = tp.current_address || '';
    const tenantHasPets = tp.has_pets || false;
    const tenantMoveIn = tp.move_in_window || tenant.desired_move_in_date;
    const tenantVersion = tp.match_version || 1;
    const isVoucherHolder = tp.voucher_holder || false;

    // BEDROOM PRE-FILTER: Skip if gap is 2+ bedrooms (saves drive time API calls)
    if (bedroomGapTooLarge(tenantBedrooms, unit.bedrooms)) {
      console.log(`[compute-match-queue] Skipping bedroom mismatch: tenant ${tenant.id} needs ${JSON.stringify(tenantBedrooms)} vs unit has ${unit.bedrooms}BR`);
      continue;
    }

    const tenantId = tenant.id;

    const { driveTimeMinutes, source: driveTimeSource } = await getDriveTime(
      supabase,
      tenantZip,
      propertyZip,
      undefined, undefined,
      unit.properties?.latitude,
      unit.properties?.longitude,
      tenantAddress
    );

    const locationResult = calculateLocationPercentage(driveTimeMinutes);

    // Calculate percentage-based breakdown (V3)
    const breakdown = {
      location: locationResult.percentage,
      budget: calculateBudgetPercentage(tenantBudget, unit.monthly_rent),
      bedrooms: calculateBedroomPercentageV2(tenantBedrooms, unit.bedrooms, isVoucherHolder),
      pets: calculatePetPercentage(tenantHasPets, propertyAllowsPets),
      move_in: calculateTimingPercentage(tenantMoveIn, unit.availability_date),
      freshness: calculateFreshnessPercentage(unit.listed_date, unit.created_at),
    };

    const score = calculateOverallScore(breakdown);
    const tier = getMatchTier(score, locationResult.excluded);

    matches.push({
      tenant_id: tenantId,
      unit_id: unitId,
      score,
      tier,
      breakdown,
      drive_time_minutes: driveTimeMinutes,
      drive_time_source: driveTimeSource,
      tenant_version: tenantVersion,
      property_version: propertyVersion,
      computed_at: new Date().toISOString(),
    });
  }

  // Upsert all matches for this property
  if (matches.length > 0) {
    const { error: upsertError } = await supabase
      .from('computed_matches')
      .upsert(matches, { 
        onConflict: 'tenant_id,unit_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      throw new Error(`Failed to upsert matches: ${upsertError.message}`);
    }

    console.log(`[compute-match-queue] Upserted ${matches.length} matches for unit ${unitId}`);
  }
}