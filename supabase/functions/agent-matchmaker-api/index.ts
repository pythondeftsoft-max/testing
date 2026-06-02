import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyOwner } from '../_shared/notify-owner.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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

// Helper to parse bedroom values from strings like "3BR", "4BR", "5BR+"
const parseBedroomValue = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  
  const str = String(value).toLowerCase().replace(/\s/g, '');
  const match = str.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  // Handle special cases
  if (str.includes('studio') || str.includes('0')) return 0;
  if (str.includes('5+')) return 5;
  
  return null;
};

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

// Helper to extract tenant budget consistently across all endpoints
// Priority: voucher_amount → rent_range_max → max_rent → profile.max_budget
const extractTenantBudget = (tp: any, profile?: any): number | null => {
  return tp?.voucher_amount || tp?.rent_range_max || tp?.max_rent || profile?.max_budget || null;
};

// Bedrooms V2: 0-100% based on match - voucher directional rule
const calculateBedroomPercentageV2 = (
  tenantNeeds: (number | string)[] | number | string | null, 
  propertyHas: number | null,
  isVoucherHolder: boolean = false
): number => {
  if (!propertyHas) return 50;
  
  if (Array.isArray(tenantNeeds) && tenantNeeds.length > 0) {
    const parsedNeeds = tenantNeeds.map(parseBedroomValue).filter((n): n is number => n !== null);
    if (parsedNeeds.length === 0) return 50;
    if (parsedNeeds.includes(propertyHas)) return 100;
    
    if (isVoucherHolder) {
      const bestUp = parsedNeeds.some(n => propertyHas === n + 1);
      if (bestUp) return 80;
      const bestDown = parsedNeeds.some(n => propertyHas === n - 1);
      if (bestDown) return 20;
      return 30;
    }
    
    const closestDiff = Math.min(...parsedNeeds.map(n => Math.abs(n - propertyHas)));
    if (closestDiff === 1) return 60;
    return 20;
  }
  
  const tenantNeed = typeof tenantNeeds === 'number' ? tenantNeeds : parseBedroomValue(tenantNeeds);
  if (!tenantNeed) return 50;
  
  const diff = propertyHas - tenantNeed; // positive = property larger
  if (diff === 0) return 100;
  
  if (isVoucherHolder) {
    if (diff === 1) return 80;
    if (diff === -1) return 20;
    return 30;
  }
  
  if (Math.abs(diff) === 1) return 60;
  return 20;
};

// Legacy single-value bedroom scoring (kept for backward compatibility)
const calculateBedroomPercentage = (tenantNeeds: number | null, propertyHas: number | null): number => {
  if (!tenantNeeds || !propertyHas) return 50; // Unknown = 50%
  const diff = Math.abs(tenantNeeds - propertyHas);
  if (diff === 0) return 100;  // Exact match
  if (diff === 1) return 60;   // Off by 1
  return 20;                    // Off by 2+
};

// Pets: 0-100%
const calculatePetPercentage = (tenantHasPets: boolean, propertyAllowsPets: boolean): number => {
  if (!tenantHasPets) return 100;
  return propertyAllowsPets ? 100 : 20;
};

// Timing: 0-100% — Actually compare dates (V3)
const calculateTimingPercentage = (tenantMoveIn: string | null, propertyAvailableDate: string | null = null): number => {
  if (!tenantMoveIn) return 50;  // No data = neutral, NOT 100
  
  const now = new Date();
  
  if (tenantMoveIn === 'immediately' || tenantMoveIn === 'asap') {
    if (!propertyAvailableDate) return 100;
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
  
  return 60;
};

// Freshness: 0-100% — Prioritize active inventory (V3 new)
const calculateFreshnessPercentage = (listedDate: string | null, createdAt: string | null): number => {
  const refDate = listedDate || createdAt;
  if (!refDate) return 30;
  
  const now = new Date();
  const listed = new Date(refDate);
  const daysOld = Math.max(0, (now.getTime() - listed.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysOld <= 7) return 100;
  if (daysOld <= 30) return 80;
  if (daysOld <= 60) return 50;
  return 30;
};

// V4 Weights — Location dominates; pets & freshness removed from scoring (hard filters only)
const WEIGHTS = {
  location: 0.40,
  bedrooms: 0.30,
  budget: 0.20,
  timing: 0.10,
  freshness: 0,  // removed in v4
  pets: 0,        // removed in v4 (hard filter only)
};

// Calculate weighted average (0-100%) — V4: 4 factors only
const calculateOverallPercentage = (breakdown: { location: number; budget: number; bedrooms: number; move_in: number; freshness?: number; pets?: number }): number => {
  return Math.round(
    breakdown.location * WEIGHTS.location +
    breakdown.bedrooms * WEIGHTS.bedrooms +
    breakdown.budget * WEIGHTS.budget +
    breakdown.move_in * WEIGHTS.timing
  );
};

// Match tier assignment (percentage-based thresholds)
const getMatchTierFromPercentage = (score: number, excluded: boolean): string => {
  if (excluded) return 'excluded';
  if (score >= 80) return 'hot_match';     // Strong
  if (score >= 60) return 'decent_match';  // Viable
  if (score >= 40) return 'no_match';      // Conditional
  return 'no_match';                        // Poor
};

// ========== POINT-BASED V4 SCORING (100 points max: 40/30/20/10) ==========

// Location score from drive time (40 pts max — V4)
const calculateLocationScoreFromDriveTime = (driveTimeMinutes: number | null): { score: number; excluded: boolean; label: string } => {
  if (driveTimeMinutes === null) return { score: 20, excluded: false, label: 'Unknown' };
  if (driveTimeMinutes < 15) return { score: 40, excluded: false, label: '<15 min' };
  if (driveTimeMinutes <= 25) return { score: 34, excluded: false, label: '15-25 min' };
  if (driveTimeMinutes <= 35) return { score: 28, excluded: false, label: '25-35 min' };
  if (driveTimeMinutes <= 45) return { score: 20, excluded: false, label: '35-45 min' };
  return { score: 8, excluded: true, label: '45+ min' };
};

// Budget score (20 pts max — V4)
const calculateBudgetScoreV2 = (tenantBudget: number | null, propertyRent: number | null): number => {
  if (!tenantBudget || !propertyRent) return 10;
  if (propertyRent <= tenantBudget) return 20;
  if (propertyRent <= tenantBudget * 1.10) return 16;
  if (propertyRent <= tenantBudget * 1.20) return 12;
  if (propertyRent <= tenantBudget * 1.30) return 8;
  return 3;
};

// Bedroom score (30 pts max — unchanged from v3) - voucher directional rule
const calculateBedroomScoreV2 = (
  tenantNeeds: (number | string)[] | number | string | null, 
  propertyHas: number | null,
  isVoucherHolder: boolean = false
): number => {
  if (!propertyHas) return 15;
  
  if (Array.isArray(tenantNeeds) && tenantNeeds.length > 0) {
    const parsedNeeds = tenantNeeds.map(parseBedroomValue).filter((n): n is number => n !== null);
    if (parsedNeeds.length === 0) return 15;
    if (parsedNeeds.includes(propertyHas)) return 30;
    
    if (isVoucherHolder) {
      const bestUp = parsedNeeds.some(n => propertyHas === n + 1);
      if (bestUp) return 24; // Property 1 larger = allowed upgrade
      const bestDown = parsedNeeds.some(n => propertyHas === n - 1);
      if (bestDown) return 6; // Property 1 smaller = NOT allowed
      return 6;
    }
    
    const closestDiff = Math.min(...parsedNeeds.map(n => Math.abs(n - propertyHas)));
    if (closestDiff === 1) return 18;
    return 6;
  }
  
  const tenantNeed = typeof tenantNeeds === 'number' ? tenantNeeds : parseBedroomValue(tenantNeeds);
  if (!tenantNeed) return 15;
  
  const diff = propertyHas - tenantNeed;
  if (diff === 0) return 30;
  
  if (isVoucherHolder) {
    if (diff === 1) return 24;
    if (diff === -1) return 6;
    return 6;
  }
  
  if (Math.abs(diff) === 1) return 18;
  return 6;
};

// Pet score — V4 REMOVED from scoring; hard filter only. Returns 0 to be score-neutral.
const calculatePetScore = (_tenantHasPets: boolean, _propertyAllowsPets: boolean): number => 0;

// Hard filter: returns true if unit should be excluded due to pets mismatch.
const isPetsExcluded = (tenantHasPets: boolean, propertyAllowsPets: boolean): boolean => {
  return tenantHasPets === true && propertyAllowsPets === false;
};

// Move-in/timing score (10 pts max) — unchanged from v3
const calculateMoveInScore = (tenantMoveIn: string | null, propertyAvailableDate: string | null = null): number => {
  if (!tenantMoveIn) return 5;
  
  const now = new Date();
  
  if (tenantMoveIn === 'immediately' || tenantMoveIn === 'asap') {
    if (!propertyAvailableDate) return 10;
    const daysUntil = Math.max(0, (new Date(propertyAvailableDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 14) return 10;
    if (daysUntil <= 30) return 8;
    return 6;
  }
  
  if (tenantMoveIn === '30_days') {
    if (!propertyAvailableDate) return 9;
    const daysUntil = Math.max(0, (new Date(propertyAvailableDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 30) return 8;
    if (daysUntil <= 60) return 6;
    return 4;
  }
  
  if (tenantMoveIn === '60_days' || tenantMoveIn === '90_days') {
    if (!propertyAvailableDate) return 8;
    const daysUntil = Math.max(0, (new Date(propertyAvailableDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 60) return 8;
    if (daysUntil <= 90) return 6;
    return 4;
  }
  
  return 6;
};

// Freshness score — V4 REMOVED from scoring. Returns 0 to be score-neutral.
const calculateFreshnessScore = (_listedDate: string | null, _createdAt: string | null): number => 0;

// Overall score (100 pts max) — V4: only 4 factors actually contribute
const calculateOverallScoreV2 = (breakdown: { location: number; budget: number; bedrooms: number; pets?: number; move_in: number; freshness?: number }): number => {
  return breakdown.location + breakdown.budget + breakdown.bedrooms + breakdown.move_in;
};

// Match tier based on 100-point scale
const getMatchTier = (score: number, excluded: boolean): string => {
  if (excluded) return 'excluded';
  if (score >= 80) return 'hot_match';     // Strong
  if (score >= 60) return 'decent_match';  // Viable
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

// Haversine formula for straight-line distance fallback
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate drive time from distance (30 mph average = ~48 km/h)
const estimateDriveTime = (distanceKm: number): number => {
  return Math.round(distanceKm / 48 * 60); // Convert to minutes
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
  const { data: cached, error: cacheError } = await supabase
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
      const requestBody = {
        origin: { address: originAddress || (originZip + ', USA') },
        destination: { address: destinationZip + ', USA' },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE'
      };

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[getDriveTime] Google API HTTP ${response.status}: ${errorBody.substring(0, 500)}`);
      } else {
        const data = await response.json();
        if (!data.routes?.length) {
          console.warn(`[getDriveTime] Empty routes array for ${originZip} → ${destinationZip}`);
        } else if (data.routes[0]?.duration) {
          // Duration comes as "XXXs" (seconds string)
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

// Legacy scoring functions (kept for backward compatibility with property-to-tenant matching)
const calculateBudgetScore = (tenantBudget: number | null, propertyRent: number | null): number => {
  if (!tenantBudget || !propertyRent) return 50;
  const ratio = (tenantBudget / propertyRent) * 100;
  if (ratio >= 110) return 100;
  if (ratio >= 100) return 95;
  if (ratio >= 90) return 85;
  if (ratio >= 80) return 70;
  return Math.max(0, ratio);
};

const calculateBedroomScore = (tenantNeeds: number | null, propertyHas: number | null): number => {
  if (!tenantNeeds || !propertyHas) return 50;
  const diff = Math.abs(tenantNeeds - propertyHas);
  if (diff === 0) return 100;
  if (diff === 1) return 80;
  if (diff === 2) return 50;
  return 30;
};

const calculateTimingScore = (tenantMoveIn: string | null, propertyAvailable: string | null): number => {
  if (!tenantMoveIn || !propertyAvailable) return 60;
  const moveInDate = new Date(tenantMoveIn);
  const availableDate = new Date(propertyAvailable);
  const daysDiff = Math.abs((moveInDate.getTime() - availableDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) return 100;
  if (daysDiff <= 30) return 80;
  if (daysDiff <= 60) return 60;
  return 40;
};

const calculateLocationScore = (
  tenantCity: string | null,
  tenantState: string | null,
  tenantZip: string | null,
  propertyCity: string | null,
  propertyState: string | null,
  propertyZip: string | null
): number => {
  const normalize = (s: string | null) => (s || '').toLowerCase().trim();
  const tCity = normalize(tenantCity);
  const tState = normalize(tenantState);
  const tZip = normalize(tenantZip);
  const pCity = normalize(propertyCity);
  const pState = normalize(propertyState);
  const pZip = normalize(propertyZip);
  
  if (!tCity && !tState && !tZip) return 70;
  if (tZip && pZip && tZip === pZip) return 100;
  if (tCity && tState && pCity && pState && tCity === pCity && tState === pState) return 85;
  if (tState && pState && tState === pState) return 50;
  return 0;
};

const calculateOverallScore = (breakdown: { budget: number; bedrooms: number; timing: number; location: number }): number => {
  return Math.round(
    breakdown.budget * 0.4 +
    breakdown.bedrooms * 0.3 +
    breakdown.timing * 0.15 +
    breakdown.location * 0.15
  );
};

// SHA-256 hash function
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key and return permissions
async function validateApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; keyId?: string; permissions?: string[] }> {
  const hash = await hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('id, permissions, is_active')
    .eq('api_key_hash', hash)
    .single();
  
  if (error || !data || !data.is_active) {
    return { valid: false };
  }
  
  // Update last_used_at and request_count
  await supabase
    .from('agent_api_keys')
    .update({ 
      last_used_at: new Date().toISOString(),
      request_count: data.request_count ? data.request_count + 1 : 1
    })
    .eq('id', data.id);
  
  return { valid: true, keyId: data.id, permissions: data.permissions || ['read'] };
}

// Check if permission is allowed
function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes('all');
}

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

    let permissions: string[] = ['read']; // Default permissions for admin auth
    let keyId: string | undefined = undefined;
    let authMethod: 'api_key' | 'admin_jwt' = 'api_key';
    let authenticatedUserId: string | null = null;

    // PRIMARY: Check for API key (external agents)
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const validation = await validateApiKey(supabase, apiKey);
      if (!validation.valid || !validation.permissions) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or inactive API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      keyId = validation.keyId;
      permissions = validation.permissions;
      authMethod = 'api_key';
    } else {
      // FALLBACK: Check for Supabase auth token (internal dashboard)
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (user && !userError) {
          // Check if user is admin via system_admins table
          const { data: adminRole } = await supabase
            .from('system_admins')
            .select('role_name, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('role_name', ['super_admin', 'operations_admin', 'matchmaker'])
            .maybeSingle();
          
          if (adminRole) {
            // Admin authenticated via JWT - grant full read permissions
            permissions = ['read', 'all'];
            authMethod = 'admin_jwt';
            authenticatedUserId = user.id;
          } else {
            return new Response(
              JSON.stringify({ success: false, error: 'Access denied. Admin privileges required.' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid or expired authentication token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required. Provide x-api-key header or Authorization Bearer token.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const url = new URL(req.url);
    let urlPath = url.pathname.replace('/agent-matchmaker-api', '').replace(/^\/+/, '');
    let effectiveMethod = req.method;
    
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      body = await req.json().catch(() => ({}));
    }
    
    // Support body-based routing for supabase.functions.invoke() calls
    if (!urlPath && body?.path) {
      urlPath = body.path.replace(/^\/+/, '');
    }
    if (body?.method) {
      effectiveMethod = body.method;
    }
    const path = urlPath;
    const method = effectiveMethod;

    let response: any = { success: false, error: 'Unknown endpoint' };
    let status = 404;

    // ========== API DISCOVERY ENDPOINT ==========
    if ((path === '' || path === '/') && method === 'GET') {
      response = {
        name: "OpenKey Agent Matchmaker API",
        version: "1.0.0",
        description: "RESTful API for managing tenant-property matching pipeline",
        authentication: {
          type: "API Key",
          header: "x-api-key",
          description: "Include your API key in the x-api-key header for all requests"
        },
        base_urls: {
          branded: "https://api.openkeyhousing.com",
          direct: "https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agent-matchmaker-api"
        },
        endpoints: {
          pipeline: [
            { method: "GET", path: "/pipeline/stats", permission: "read", description: "Get pipeline statistics and counts by stage" },
            { method: "GET", path: "/pipeline/tenants", permission: "read", description: "Get tenants in pipeline with filters" },
            { method: "GET", path: "/pipeline/properties", permission: "read", description: "Get properties in pipeline with filters" },
            { method: "POST", path: "/pipeline/advance", permission: "advance", description: "Advance entity to next pipeline stage" },
            { method: "POST", path: "/pipeline/jump", permission: "advance", description: "Jump entity directly to final stage" },
            { method: "POST", path: "/pipeline/regress", permission: "regress", description: "Move entity back to previous stage" }
          ],
          queue: [
            { method: "GET", path: "/queue/tenants", permission: "read", description: "Get unassigned tenants waiting for workers" },
            { method: "GET", path: "/queue/properties", permission: "read", description: "Get unassigned properties waiting for workers" },
            { method: "POST", path: "/queue/assign", permission: "assign", description: "Assign entity to a worker" },
            { method: "POST", path: "/queue/unassign", permission: "assign", description: "Remove worker assignment from entity" }
          ],
          matching: [
            { method: "POST", path: "/match", permission: "read", description: "Get scored property recommendations for a tenant" },
            { method: "GET", path: "/computed-matches", permission: "read", description: "Get pre-computed match scores. Filter by tenant_id, unit_id, tier, min_score" },
            { method: "POST", path: "/push", permission: "push", description: "Push property recommendation to tenant" },
            { method: "GET", path: "/pushes", permission: "read", description: "List all active pushes/outreaches with status, tenant, property details" },
            { method: "PATCH", path: "/push/:id", permission: "push", description: "Update status of existing push" },
            { method: "DELETE", path: "/push/:id", permission: "push", description: "Delete/unsend a push" },
            { method: "GET", path: "/history", permission: "read", description: "Get match history for tenant or property" }
          ],
          resources: [
            { method: "GET", path: "/territories", permission: "read", description: "List all territories with worker counts" },
            { method: "GET", path: "/territories/:id", permission: "read", description: "Get territory details with assigned workers" },
            { method: "GET", path: "/workers", permission: "read", description: "List workers with workload statistics" }
          ],
          platform: [
            { method: "GET", path: "/platform/metrics", permission: "read", description: "Get high-level platform metrics: states, countries, landlords, properties, units, rent totals" }
          ]
        },
        permissions: {
          read: "View data (tenants, properties, stats, history)",
          assign: "Assign/unassign workers to entities",
          push: "Create, update, delete property pushes",
          advance: "Move entities forward in pipeline",
          regress: "Move entities backward in pipeline",
          all: "Full access to all operations"
        }
      };
      status = 200;
    }

    // ========== PIPELINE ENDPOINTS ==========
    
    if (path === 'pipeline/stats' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get tenant pipeline stats
      const { data: tenants } = await supabase
        .from('profiles')
        .select('id, housing_status, pipeline_stage, assigned_worker_id')
        .eq('user_type', 'tenant');

      // Get property pipeline stats
      const { data: properties } = await supabase
        .from('property_units')
        .select('id, status, pipeline_stage, assigned_worker_id, on_market, lease_signed_date, move_in_date, payment_received_date, properties!inner(deleted_at, on_market)')
        .eq('on_market', true)
        .eq('properties.on_market', true)
        .is('properties.deleted_at', null);

      const tenantStats = {
        unassigned: tenants?.filter(t => !t.assigned_worker_id && t.housing_status === 'seeking').length || 0,
        assigned: tenants?.filter(t => t.assigned_worker_id && t.pipeline_stage === 'assigned').length || 0,
        lease_signed: tenants?.filter(t => t.housing_status === 'approved' || t.pipeline_stage === 'lease_signed').length || 0,
        paid_housed: tenants?.filter(t => t.housing_status === 'housed' || t.pipeline_stage === 'housed_paid').length || 0,
      };

      const propertyStats = {
        unassigned: properties?.filter(p => !p.assigned_worker_id).length || 0,
        assigned: properties?.filter(p => p.assigned_worker_id && p.pipeline_stage === 'available').length || 0,
        in_process: properties?.filter(p => p.pipeline_stage === 'in_process').length || 0,
        lease_signed: properties?.filter(p => p.lease_signed_date && !p.move_in_date).length || 0,
        paid_housed: properties?.filter(p => p.payment_received_date).length || 0,
      };

      // Get hot matches count
      const { count: hotMatchCount } = await supabase
        .from('computed_matches')
        .select('id', { count: 'exact', head: true })
        .gte('score', 80)
        .is('push_id', null);

      // Get active pushes count
      const { count: activePushCount } = await supabase
        .from('property_pushes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['push_sent', 'viewed', 'interested', 'landlord_review']);

      const summary = {
        total_tenants_in_pipeline: tenantStats.unassigned + tenantStats.assigned,
        total_properties_available: propertyStats.unassigned + propertyStats.assigned + propertyStats.in_process,
        hot_matches_unpushed: hotMatchCount || 0,
        active_pushes: activePushCount || 0,
      };

      response = { success: true, tenants: tenantStats, properties: propertyStats, summary };
      status = 200;
    }

    else if (path === 'pipeline/tenants' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stage = url.searchParams.get('stage');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email, phone, housing_status, pipeline_stage, 
          assigned_worker_id, territory_id, created_at,
          tenant_profiles(
            voucher_holder, voucher_status, voucher_amount, rent_range_min, rent_range_max, 
            bedrooms_approved, city, state, zip_code, country_code, move_in_window,
            credit_score, credit_score_range, employment_status, monthly_income, max_rent,
            has_eviction, eviction_details, has_felonies, felony_details,
            has_pets, pet_type, preferred_locations
          ),
          assigned_worker:profiles!assigned_worker_id(first_name, last_name),
          territories(territory_name)
        `)
        .eq('user_type', 'tenant')
        .limit(limit);

      if (stage) {
        if (stage === 'unassigned') {
          query = query.is('assigned_worker_id', null);
        } else {
          query = query.eq('pipeline_stage', stage);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const entities = (data || []).map((t: any) => ({
        id: t.id,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
        email: t.email,
        phone: t.phone,
        housing_status: t.housing_status,
        pipeline_stage: t.pipeline_stage || 'unassigned',
        budget: {
          min: t.tenant_profiles?.rent_range_min,
          max: t.tenant_profiles?.rent_range_max,
          max_rent: t.tenant_profiles?.max_rent,
          monthly_income: t.tenant_profiles?.monthly_income,
        },
        bedrooms_approved: t.tenant_profiles?.bedrooms_approved,
        voucher: {
          holder: t.tenant_profiles?.voucher_holder,
          status: t.tenant_profiles?.voucher_status,
          amount: t.tenant_profiles?.voucher_amount,
        },
        location: {
          city: t.tenant_profiles?.city,
          state: t.tenant_profiles?.state,
          zip: t.tenant_profiles?.zip_code,
          country_code: t.tenant_profiles?.country_code,
          preferred_locations: t.tenant_profiles?.preferred_locations,
        },
        screening: {
          credit_score: t.tenant_profiles?.credit_score,
          credit_score_range: t.tenant_profiles?.credit_score_range,
          employment_status: t.tenant_profiles?.employment_status,
          has_eviction: t.tenant_profiles?.has_eviction,
          eviction_details: t.tenant_profiles?.eviction_details,
          has_felonies: t.tenant_profiles?.has_felonies,
          felony_details: t.tenant_profiles?.felony_details,
        },
        pets: {
          has_pets: t.tenant_profiles?.has_pets,
          pet_type: t.tenant_profiles?.pet_type,
        },
        move_in_window: t.tenant_profiles?.move_in_window,
        territory: t.territories ? { id: t.territory_id, name: t.territories.territory_name } : null,
        assigned_worker: t.assigned_worker 
          ? { id: t.assigned_worker_id, name: `${t.assigned_worker.first_name || ''} ${t.assigned_worker.last_name || ''}`.trim() } 
          : null,
        days_in_system: Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        created_at: t.created_at,
      }));

      response = { success: true, stage: stage || 'all', count: entities.length, entities };
      status = 200;
    }

    else if (path === 'pipeline/properties' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stage = url.searchParams.get('stage');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('property_units')
        .select(`
          id, unit_number, monthly_rent, bedrooms, bathrooms, status, pipeline_stage,
          assigned_worker_id, territory_id, on_market, lease_signed_date, move_in_date, 
          payment_received_date, created_at, square_feet, pets_allowed, unit_name,
          properties!inner(
            id, address, city, state, zipcode, deleted_at, portfolio_id, owner_id,
            property_type, on_market,
            portfolios(id, client_name, client_email, client_phone)
          ),
          assigned_worker:profiles!assigned_worker_id(first_name, last_name),
          territories(territory_name)
        `)
        .eq('on_market', true)
        .eq('properties.on_market', true)
        .is('properties.deleted_at', null)
        .limit(limit);

      if (stage) {
        if (stage === 'unassigned') {
          query = query.is('assigned_worker_id', null);
        } else {
          query = query.eq('pipeline_stage', stage);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const entities = (data || []).map((u: any) => {
        const portfolio = u.properties?.portfolios;
        const hasClientEmail = portfolio?.client_email != null;
        
        return {
          id: u.id,
          property_id: u.properties?.id,
          address: u.properties?.address,
          unit_number: u.unit_number,
          unit_name: u.unit_name,
          city: u.properties?.city,
          state: u.properties?.state,
          zipcode: u.properties?.zipcode,
          monthly_rent: u.monthly_rent,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          square_feet: u.square_feet,
          pets_allowed: u.pets_allowed,
          property_type: u.properties?.property_type,
          status: u.status,
          pipeline_stage: u.pipeline_stage || 'unassigned',
          lease_signed_date: u.lease_signed_date,
          move_in_date: u.move_in_date,
          payment_received_date: u.payment_received_date,
          ownership_type: hasClientEmail ? 'client_managed' : 'landlord_self_managed',
          client: portfolio ? {
            portfolio_id: portfolio.id,
            name: portfolio.client_name,
            email: portfolio.client_email,
            phone: portfolio.client_phone,
          } : null,
          territory: u.territories ? { id: u.territory_id, name: u.territories.territory_name } : null,
          assigned_worker: u.assigned_worker 
            ? { id: u.assigned_worker_id, name: `${u.assigned_worker.first_name || ''} ${u.assigned_worker.last_name || ''}`.trim() } 
            : null,
          days_on_market: Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          created_at: u.created_at,
        };
      });

      response = { success: true, stage: stage || 'all', count: entities.length, entities };
      status = 200;
    }

    else if (path === 'pipeline/advance' && method === 'POST') {
      if (!hasPermission(permissions, 'advance')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: advance required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entity_id, entity_type, worker_id, notes } = body;
      
      if (!entity_id || !entity_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing entity_id or entity_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (entity_type === 'tenant') {
        // Get current stage
        const { data: tenant } = await supabase
          .from('profiles')
          .select('pipeline_stage, housing_status, assigned_worker_id')
          .eq('id', entity_id)
          .single();

        if (!tenant) {
          return new Response(
            JSON.stringify({ success: false, error: 'Tenant not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentStage = tenant.pipeline_stage || 'unassigned';
        let nextStage = currentStage;
        let updates: any = {};

        if (currentStage === 'unassigned' || !tenant.assigned_worker_id) {
          if (!worker_id) {
            return new Response(
              JSON.stringify({ success: false, error: 'worker_id required to assign tenant' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          updates = { assigned_worker_id: worker_id, pipeline_stage: 'assigned' };
          nextStage = 'assigned';
        } else if (currentStage === 'assigned') {
          updates = { housing_status: 'approved', pipeline_stage: 'lease_signed' };
          nextStage = 'lease_signed';
        } else if (currentStage === 'lease_signed' || currentStage === 'approved') {
          updates = { housing_status: 'housed', pipeline_stage: 'housed_paid' };
          nextStage = 'housed_paid';
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', entity_id);

        if (error) throw error;

        response = { success: true, entity_type, entity_id, previous_stage: currentStage, new_stage: nextStage };
        status = 200;
      } else {
        // Property advancement
        const { data: unit } = await supabase
          .from('property_units')
          .select('pipeline_stage, assigned_worker_id')
          .eq('id', entity_id)
          .single();

        if (!unit) {
          return new Response(
            JSON.stringify({ success: false, error: 'Property unit not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentStage = unit.pipeline_stage || 'unassigned';
        let nextStage = currentStage;
        let updates: any = {};

        if (currentStage === 'unassigned' || !unit.assigned_worker_id) {
          if (!worker_id) {
            return new Response(
              JSON.stringify({ success: false, error: 'worker_id required to assign property' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          updates = { assigned_worker_id: worker_id, pipeline_stage: 'available' };
          nextStage = 'available';
        } else if (currentStage === 'available') {
          updates = { pipeline_stage: 'in_process' };
          nextStage = 'in_process';
        } else if (currentStage === 'in_process') {
          updates = { pipeline_stage: 'filled_awaiting_payment', lease_signed_date: new Date().toISOString() };
          nextStage = 'filled_awaiting_payment';
        } else if (currentStage === 'filled_awaiting_payment') {
          updates = { pipeline_stage: 'paid_housed', payment_received_date: new Date().toISOString() };
          nextStage = 'paid_housed';
        }

        const { error } = await supabase
          .from('property_units')
          .update(updates)
          .eq('id', entity_id);

        if (error) throw error;

        response = { success: true, entity_type, entity_id, previous_stage: currentStage, new_stage: nextStage };
        status = 200;
      }
    }

    else if (path === 'pipeline/jump' && method === 'POST') {
      if (!hasPermission(permissions, 'advance')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: advance required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entity_id, entity_type, notes } = body;

      if (!entity_id || !entity_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing entity_id or entity_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (entity_type === 'tenant') {
        const { error } = await supabase
          .from('profiles')
          .update({ housing_status: 'housed', pipeline_stage: 'housed_paid' })
          .eq('id', entity_id);
        if (error) throw error;
        response = { success: true, entity_type, entity_id, new_stage: 'housed_paid' };
      } else {
        const { error } = await supabase
          .from('property_units')
          .update({ pipeline_stage: 'paid_housed', payment_received_date: new Date().toISOString() })
          .eq('id', entity_id);
        if (error) throw error;
        response = { success: true, entity_type, entity_id, new_stage: 'paid_housed' };
      }
      status = 200;
    }

    // ========== PIPELINE REGRESS ENDPOINT ==========

    else if (path === 'pipeline/regress' && method === 'POST') {
      if (!hasPermission(permissions, 'regress')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: regress required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entity_id, entity_type, reason } = body;

      if (!entity_id || !entity_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing entity_id or entity_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Tenant regress stages: housed_paid → lease_signed → assigned → unassigned
      // Property regress stages: paid_housed → filled_awaiting_payment → in_process → available → unassigned

      if (entity_type === 'tenant') {
        const { data: tenant } = await supabase
          .from('profiles')
          .select('pipeline_stage, housing_status, assigned_worker_id')
          .eq('id', entity_id)
          .single();

        if (!tenant) {
          return new Response(
            JSON.stringify({ success: false, error: 'Tenant not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentStage = tenant.pipeline_stage || 'unassigned';
        let updates: any = {};
        let previousStage = currentStage;

        if (currentStage === 'housed_paid') {
          updates = { housing_status: 'approved', pipeline_stage: 'lease_signed' };
        } else if (currentStage === 'lease_signed' || currentStage === 'approved') {
          updates = { housing_status: 'seeking', pipeline_stage: 'assigned' };
        } else if (currentStage === 'assigned') {
          updates = { assigned_worker_id: null, pipeline_stage: null, housing_status: 'seeking' };
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot regress from unassigned stage' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', entity_id);

        if (error) throw error;

        response = { 
          success: true, 
          entity_type, 
          entity_id, 
          previous_stage: previousStage, 
          new_stage: updates.pipeline_stage || 'unassigned',
          reason: reason || null 
        };
      } else {
        // Property regress
        const { data: unit } = await supabase
          .from('property_units')
          .select('pipeline_stage, assigned_worker_id')
          .eq('id', entity_id)
          .single();

        if (!unit) {
          return new Response(
            JSON.stringify({ success: false, error: 'Property unit not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentStage = unit.pipeline_stage || 'unassigned';
        let updates: any = {};
        let previousStage = currentStage;

        if (currentStage === 'paid_housed') {
          updates = { pipeline_stage: 'filled_awaiting_payment', payment_received_date: null };
        } else if (currentStage === 'filled_awaiting_payment') {
          updates = { pipeline_stage: 'in_process', lease_signed_date: null };
        } else if (currentStage === 'in_process') {
          updates = { pipeline_stage: 'available' };
        } else if (currentStage === 'available') {
          updates = { assigned_worker_id: null, pipeline_stage: null };
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot regress from unassigned stage' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('property_units')
          .update(updates)
          .eq('id', entity_id);

        if (error) throw error;

        response = { 
          success: true, 
          entity_type, 
          entity_id, 
          previous_stage: previousStage, 
          new_stage: updates.pipeline_stage || 'unassigned',
          reason: reason || null 
        };
      }
      status = 200;
    }

    // ========== QUEUE ENDPOINTS ==========

    else if (path === 'queue/tenants' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = url.searchParams.get('state');
      const city = url.searchParams.get('city');
      const minBudget = url.searchParams.get('min_budget');
      const maxBudget = url.searchParams.get('max_budget');
      const bedrooms = url.searchParams.get('bedrooms');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      const { data, error } = await supabase
        .from('tenant_profiles')
        .select(`
          id, user_id, voucher_holder, voucher_amount, rent_range_min, rent_range_max,
          bedrooms_approved, city, state, zip_code, move_in_window, created_at,
          profiles!tenant_profiles_user_id_fkey(
            id, first_name, last_name, email, phone, assigned_worker_id, housing_status, territory_id, pipeline_stage
          )
        `)
        .is('profiles.assigned_worker_id', null)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filtered = (data || []).filter((t: any) => t.profiles !== null);
      
      if (state) filtered = filtered.filter((t: any) => t.state?.toLowerCase() === state.toLowerCase());
      if (city) filtered = filtered.filter((t: any) => t.city?.toLowerCase().includes(city.toLowerCase()));
      if (minBudget) filtered = filtered.filter((t: any) => (t.rent_range_max || 0) >= parseInt(minBudget));
      if (maxBudget) filtered = filtered.filter((t: any) => (t.rent_range_min || 0) <= parseInt(maxBudget));
      if (bedrooms) {
        const br = parseInt(bedrooms);
        filtered = filtered.filter((t: any) => t.bedrooms_approved?.includes(br));
      }

      const entities = filtered.map((t: any) => ({
        id: t.profiles?.id,
        tenant_profile_id: t.id,
        name: `${t.profiles?.first_name || ''} ${t.profiles?.last_name || ''}`.trim(),
        email: t.profiles?.email,
        phone: t.profiles?.phone,
        voucher_holder: t.voucher_holder,
        voucher_amount: t.voucher_amount,
        budget: { min: t.rent_range_min, max: t.rent_range_max },
        bedrooms_approved: t.bedrooms_approved,
        location: { city: t.city, state: t.state, zip: t.zip_code },
        move_in_window: t.move_in_window,
        territory_id: t.profiles?.territory_id,
        days_in_queue: Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        created_at: t.created_at,
      }));

      response = { success: true, count: entities.length, entities };
      status = 200;
    }

    else if (path === 'queue/properties' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const state = url.searchParams.get('state');
      const city = url.searchParams.get('city');
      const minRent = url.searchParams.get('min_rent');
      const maxRent = url.searchParams.get('max_rent');
      const bedrooms = url.searchParams.get('bedrooms');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      const { data, error } = await supabase
        .from('property_units')
        .select(`
          id, unit_number, monthly_rent, bedrooms, bathrooms, status, territory_id, created_at,
          properties!inner(
            id, address, city, state, zipcode, deleted_at, portfolio_id,
            portfolios(id, client_name, client_email, client_phone)
          )
        `)
        .is('assigned_worker_id', null)
        .eq('on_market', true)
        .is('properties.deleted_at', null)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filtered = data || [];
      
      if (state) filtered = filtered.filter((u: any) => u.properties?.state?.toLowerCase() === state.toLowerCase());
      if (city) filtered = filtered.filter((u: any) => u.properties?.city?.toLowerCase().includes(city.toLowerCase()));
      if (minRent) filtered = filtered.filter((u: any) => (u.monthly_rent || 0) >= parseInt(minRent));
      if (maxRent) filtered = filtered.filter((u: any) => (u.monthly_rent || 0) <= parseInt(maxRent));
      if (bedrooms) filtered = filtered.filter((u: any) => u.bedrooms === parseInt(bedrooms));

      const entities = filtered.map((u: any) => {
        const portfolio = u.properties?.portfolios;
        const hasClientEmail = portfolio?.client_email != null;
        
        return {
          id: u.id,
          property_id: u.properties?.id,
          address: u.properties?.address,
          unit_number: u.unit_number,
          location: { city: u.properties?.city, state: u.properties?.state, zip: u.properties?.zipcode },
          monthly_rent: u.monthly_rent,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          status: u.status,
          territory_id: u.territory_id,
          ownership_type: hasClientEmail ? 'client_managed' : 'landlord_self_managed',
          client: portfolio ? {
            portfolio_id: portfolio.id,
            name: portfolio.client_name,
            email: portfolio.client_email,
            phone: portfolio.client_phone,
          } : null,
          days_in_queue: Math.floor((Date.now() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          created_at: u.created_at,
        };
      });

      response = { success: true, count: entities.length, entities };
      status = 200;
    }

    else if (path === 'queue/assign' && method === 'POST') {
      if (!hasPermission(permissions, 'assign')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: assign required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entity_id, entity_type, worker_id } = body;

      if (!entity_id || !entity_type || !worker_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing entity_id, entity_type, or worker_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (entity_type === 'tenant') {
        const { error } = await supabase
          .from('profiles')
          .update({ assigned_worker_id: worker_id, pipeline_stage: 'assigned' })
          .eq('id', entity_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_units')
          .update({ assigned_worker_id: worker_id, pipeline_stage: 'available' })
          .eq('id', entity_id);
        if (error) throw error;
      }

      response = { success: true, entity_type, entity_id, worker_id, message: 'Entity assigned successfully' };
      status = 200;
    }

    else if (path === 'queue/unassign' && method === 'POST') {
      if (!hasPermission(permissions, 'assign')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: assign required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { entity_id, entity_type, reason } = body;

      if (!entity_id || !entity_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing entity_id or entity_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (entity_type === 'tenant') {
        const { error } = await supabase
          .from('profiles')
          .update({ assigned_worker_id: null, pipeline_stage: null })
          .eq('id', entity_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_units')
          .update({ assigned_worker_id: null, pipeline_stage: null })
          .eq('id', entity_id);
        if (error) throw error;
      }

      response = { success: true, entity_type, entity_id, message: 'Entity unassigned successfully', reason: reason || null };
      status = 200;
    }

    // ========== TERRITORY ENDPOINTS ==========

    else if (path === 'territories' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('territories')
        .select(`
          id, country, territory_type, territory_name, region_code, postal_ranges,
          default_worker_id, is_active, created_at,
          territory_workers(
            id, worker_id, is_primary, assigned_at,
            profiles(first_name, last_name, email)
          )
        `)
        .eq('is_active', true)
        .order('territory_name');

      if (error) throw error;

      // Get entity counts per territory
      const { data: tenantCounts } = await supabase
        .from('profiles')
        .select('territory_id')
        .eq('user_type', 'tenant')
        .not('territory_id', 'is', null);

      const { data: propertyCounts } = await supabase
        .from('property_units')
        .select('territory_id')
        .eq('on_market', true)
        .not('territory_id', 'is', null);

      const tenantCountMap: Record<string, number> = {};
      const propertyCountMap: Record<string, number> = {};
      (tenantCounts || []).forEach((t: any) => {
        tenantCountMap[t.territory_id] = (tenantCountMap[t.territory_id] || 0) + 1;
      });
      (propertyCounts || []).forEach((p: any) => {
        propertyCountMap[p.territory_id] = (propertyCountMap[p.territory_id] || 0) + 1;
      });

      const territories = (data || []).map((t: any) => ({
        id: t.id,
        territory_name: t.territory_name,
        region_code: t.region_code,
        country: t.country,
        territory_type: t.territory_type,
        postal_ranges: t.postal_ranges,
        workers: (t.territory_workers || []).map((tw: any) => ({
          id: tw.worker_id,
          name: tw.profiles ? `${tw.profiles.first_name || ''} ${tw.profiles.last_name || ''}`.trim() : 'Unknown',
          email: tw.profiles?.email,
          is_primary: tw.is_primary,
          assigned_at: tw.assigned_at,
        })),
        entity_counts: {
          tenants: tenantCountMap[t.id] || 0,
          properties: propertyCountMap[t.id] || 0,
        },
        created_at: t.created_at,
      }));

      response = { success: true, count: territories.length, territories };
      status = 200;
    }

    else if (path.startsWith('territories/') && path.split('/').length === 2 && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const territoryId = path.split('/')[1];

      const { data, error } = await supabase
        .from('territories')
        .select(`
          id, country, territory_type, territory_name, region_code, postal_ranges,
          default_worker_id, is_active, created_at,
          territory_workers(id, worker_id, is_primary, profiles(first_name, last_name, email))
        `)
        .eq('id', territoryId)
        .single();

      if (error) {
        response = { success: false, error: 'Territory not found' };
        status = 404;
      } else {
        // Get entities in this territory
        const { data: tenants } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, pipeline_stage, assigned_worker_id')
          .eq('user_type', 'tenant')
          .eq('territory_id', territoryId);

        const { data: properties } = await supabase
          .from('property_units')
          .select('id, unit_number, monthly_rent, pipeline_stage, assigned_worker_id, properties(address)')
          .eq('territory_id', territoryId)
          .eq('on_market', true);

        response = {
          success: true,
          territory: {
            id: data.id,
            territory_name: data.territory_name,
            region_code: data.region_code,
            country: data.country,
            workers: (data.territory_workers || []).map((tw: any) => ({
              id: tw.worker_id,
              name: tw.profiles ? `${tw.profiles.first_name || ''} ${tw.profiles.last_name || ''}`.trim() : 'Unknown',
              is_primary: tw.is_primary,
            })),
          },
          tenants: (tenants || []).map((t: any) => ({
            id: t.id,
            name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
            pipeline_stage: t.pipeline_stage,
            assigned_worker_id: t.assigned_worker_id,
          })),
          properties: (properties || []).map((p: any) => ({
            id: p.id,
            address: p.properties?.address,
            unit_number: p.unit_number,
            monthly_rent: p.monthly_rent,
            pipeline_stage: p.pipeline_stage,
            assigned_worker_id: p.assigned_worker_id,
          })),
        };
        status = 200;
      }
    }

    else if (path === 'workers' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get workers (users with matchmaker-related roles)
      const { data, error } = await supabase
        .from('territory_workers')
        .select(`
          id, worker_id, is_primary, territory_id,
          profiles(id, first_name, last_name, email),
          territories(territory_name)
        `);

      if (error) throw error;

      // Group by worker
      const workerMap: Record<string, any> = {};
      (data || []).forEach((tw: any) => {
        if (!tw.profiles) return;
        const wid = tw.worker_id;
        if (!workerMap[wid]) {
          workerMap[wid] = {
            id: wid,
            name: `${tw.profiles.first_name || ''} ${tw.profiles.last_name || ''}`.trim(),
            email: tw.profiles.email,
            territories: [],
          };
        }
        if (tw.territories) {
          workerMap[wid].territories.push({
            id: tw.territory_id,
            name: tw.territories.territory_name,
            is_primary: tw.is_primary,
          });
        }
      });

      // Get workload for each worker
      const workers = Object.values(workerMap);
      for (const worker of workers) {
        const { data: tenants } = await supabase
          .from('profiles')
          .select('id')
          .eq('assigned_worker_id', worker.id)
          .eq('user_type', 'tenant');

        const { data: properties } = await supabase
          .from('property_units')
          .select('id')
          .eq('assigned_worker_id', worker.id)
          .eq('on_market', true);

        worker.workload = {
          tenants: tenants?.length || 0,
          properties: properties?.length || 0,
          total: (tenants?.length || 0) + (properties?.length || 0),
        };
      }

      response = { success: true, count: workers.length, workers };
      status = 200;
    }

    // ========== MATCHING ENDPOINTS ==========

    else if (path === 'match' && method === 'POST') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { tenant_id, property_id, batch = false, limit: matchLimit = 20, skip_drive_time_filter = false } = body;

      // BATCH MODE: Get all tenant-property matches for Command Center
      if (batch) {
        console.log('[BATCH MODE] Starting batch match computation...');
        
        // Fetch all active tenants with explicit FK hint
        const { data: allTenants, error: tenantsError } = await supabase
          .from('profiles')
          .select(`*, tenant_profiles!tenant_profiles_user_id_fkey(*)`)
          .eq('user_type', 'tenant')
          .in('housing_status', ['seeking', 'approved', 'unhoused'])
          .limit(200);

        console.log(`[BATCH MODE] Tenants fetched: ${allTenants?.length || 0}, error: ${tenantsError?.message || 'none'}`);

        // Fetch all on-market properties (exclude occupied units)
        const { data: allProperties, error: propertiesError } = await supabase
          .from('property_units')
          .select(`*, properties!inner(
            id, address, city, state, zipcode, deleted_at, portfolio_id, pet_friendly, latitude, longitude, photos
          )`)
          .eq('on_market', true)
          .neq('status', 'occupied')
          .is('properties.deleted_at', null)
          .limit(200);

        console.log(`[BATCH MODE] Properties fetched: ${allProperties?.length || 0}, error: ${propertiesError?.message || 'none'}`);

        if (!allTenants?.length || !allProperties?.length) {
          console.log('[BATCH MODE] Early return - no tenants or properties found');
          return new Response(
            JSON.stringify({ 
              success: true, 
              matches: [], 
              computed_at: new Date().toISOString(),
              total_count: 0,
              debug: {
                tenants_found: allTenants?.length || 0,
                properties_found: allProperties?.length || 0,
                tenants_error: tenantsError?.message,
                properties_error: propertiesError?.message,
              }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const batchMatches: any[] = [];
        const computeLimit = Math.min(matchLimit, 500);
        let excludedByDriveTime = 0;

        // For each tenant, compute matches against all properties
        for (const tenant of allTenants) {
          const tp = tenant.tenant_profiles?.[0] || {};
          const tenantBudget = extractTenantBudget(tp, tenant);
          const tenantBedrooms = tp.bedrooms_approved || tenant.desired_bedrooms;
          const tenantZip = tp.desired_zip_code || tp.zip_code || '';
          const tenantAddress = tp.current_address || '';
          const tenantHasPets = tp.has_pets || false;
          const tenantMoveIn = tp.move_in_window || tenant.desired_move_in_date;
          const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
          const isVoucherHolder = tp.voucher_holder || false;

          for (const p of allProperties) {
            const propertyZip = p.properties?.zipcode || '';
            
            // Get drive time (uses cache)
            const { driveTimeMinutes, source: driveTimeSource } = await getDriveTime(
              supabase,
              tenantZip,
              propertyZip,
              undefined, undefined,
              p.properties?.latitude,
              p.properties?.longitude,
              tenantAddress
            );

            const locationResult = calculateLocationScoreFromDriveTime(driveTimeMinutes);
            
            // Skip 45+ min drives unless skip_drive_time_filter is set
            if (locationResult.excluded && !skip_drive_time_filter) {
              excludedByDriveTime++;
              continue;
            }

            const propertyAllowsPets = p.properties?.pet_friendly ?? true;

            // V4 hard filter: exclude unit if tenant has pets and unit doesn't allow them
            if (isPetsExcluded(tenantHasPets, propertyAllowsPets)) {
              continue;
            }

            const breakdown = {
              location: locationResult.score,
              budget: calculateBudgetScoreV2(tenantBudget, p.monthly_rent),
              bedrooms: calculateBedroomScoreV2(tenantBedrooms, p.bedrooms, isVoucherHolder),
              move_in: calculateMoveInScore(tenantMoveIn, p.availability_date),
            };

            const score = calculateOverallScoreV2(breakdown);
            const tier = getMatchTier(score, false);

            batchMatches.push({
              tenant_id: tenant.id,
              tenant_name: tenantName,
              tenant_email: tenant.email,
              tenant_phone: tenant.phone,
              tenant_budget: tenantBudget,
              tenant_bedrooms: tp.bedrooms_approved,
              tenant_city: tp.city,
              tenant_state: tp.state,
              tenant_voucher: tp.voucher_holder || false,
              tenant_move_in: tenantMoveIn,
              
              unit_id: p.id,
              property_id: p.properties?.id,
              property_address: p.properties?.address,
              property_unit_number: p.unit_number,
              property_rent: p.monthly_rent,
              property_bedrooms: p.bedrooms,
              property_city: p.properties?.city,
              property_state: p.properties?.state,
              property_photos: p.properties?.photos || [],
              
              score,
              tier,
              drive_time_minutes: driveTimeMinutes,
              drive_time_source: driveTimeSource,
              breakdown,
              
              status: 'new',
              created_at: new Date().toISOString(),
            });
          }
        }

        console.log(`[BATCH MODE] Total potential: ${allTenants.length * allProperties.length}, excluded by drive time: ${excludedByDriveTime}, matches generated: ${batchMatches.length}`);

        // Sort by score and limit
        const sortedMatches = batchMatches
          .sort((a, b) => b.score - a.score)
          .slice(0, computeLimit);

        response = {
          success: true,
          matches: sortedMatches,
          computed_at: new Date().toISOString(),
          total_count: batchMatches.length,
          debug: {
            tenants_found: allTenants.length,
            properties_found: allProperties.length,
            potential_pairs: allTenants.length * allProperties.length,
            excluded_by_drive_time: excludedByDriveTime,
            skip_drive_time_filter,
          }
        };
        status = 200;
      }
      // SINGLE ENTITY MODE (existing behavior)
      else if (!tenant_id && !property_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Provide either tenant_id, property_id, or batch=true' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      else

      if (tenant_id) {
        // Match tenant to properties using 5-factor scoring (100 points max)
        // Query from profiles FIRST (same as /pipeline/tenants), then embed tenant_profiles
        console.log(`[/match] Looking up tenant_id: ${tenant_id}`);
        
        const { data: tenantData, error: tenantError } = await supabase
          .from('profiles')
          .select(`
            id, first_name, last_name, housing_status, user_type,
            tenant_profiles(
              id, voucher_holder, voucher_amount, rent_range_min, rent_range_max,
              bedrooms_approved, city, state, zip_code, move_in_window, has_pets,
              max_rent, monthly_income, credit_score_range, desired_zip_code, current_address
            )
          `)
          .eq('id', tenant_id)
          .eq('user_type', 'tenant')
          .single();

        // Handle tenant_profiles as array (Supabase embeds return arrays even for 1:1)
        const tpArray = tenantData?.tenant_profiles;
        const tp = Array.isArray(tpArray) ? tpArray[0] : tpArray;
        
        if (!tenantData || tenantError || !tp) {
          console.warn(`[/match] Tenant not found for id: ${tenant_id}`);
          console.warn(`[/match] Error details:`, JSON.stringify(tenantError));
          console.warn(`[/match] tenantData:`, JSON.stringify(tenantData));
          // Return empty matches instead of error - allows Twin to continue gracefully
          return new Response(
            JSON.stringify({ 
              success: true, 
              tenant: {
                id: tenant_id,
                name: 'Unknown',
                budget: null,
                bedrooms: null,
                has_pets: false,
                location: { city: null, state: null, zip: null },
              },
              matches: [],
              excluded_count: 0,
              warning: 'Tenant profile not found - no matches computed'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: properties } = await supabase
          .from('property_units')
          .select(`*, properties!inner(
            id, address, city, state, zipcode, deleted_at, portfolio_id, pet_friendly, latitude, longitude,
            portfolios(id, client_name, client_email, client_phone)
          )`)
          .eq('on_market', true)
          .eq('properties.on_market', true)
          .is('properties.deleted_at', null)
          .limit(200);

        // Data extraction - profiles is now the primary object, tp already extracted above
        const tenant = tenantData;
        
        // DEBUG: Log tenant profile extraction
        console.log('[DEBUG] Tenant profile extraction:', JSON.stringify({
          tenant_id: tenant.id,
          name: `${tenant.first_name} ${tenant.last_name}`,
          tp_id: tp.id,
          zip_code: tp.zip_code,
          voucher_amount: tp.voucher_amount,
          bedrooms_approved: tp.bedrooms_approved,
        }));
        
        const tenantBudget = extractTenantBudget(tp, tenant);
        const tenantBedrooms = tp.bedrooms_approved;
        const tenantZip = tp.desired_zip_code || tp.zip_code || '';
        const tenantAddress = tp.current_address || '';
        const tenantHasPets = tp.has_pets || false;
        const tenantMoveIn = tp.move_in_window;
        const isVoucherHolder = tp.voucher_holder || false;

        // Calculate drive times and scores for all properties in parallel
        const matchPromises = (properties || []).map(async (p: any) => {
          const propertyZip = p.properties?.zipcode || '';
          
          // Get drive time (uses cache or Google Routes API with Haversine fallback)
          const { driveTimeMinutes, source: driveTimeSource } = await getDriveTime(
            supabase,
            tenantZip,
            propertyZip,
            undefined, undefined,
            p.properties?.latitude,
            p.properties?.longitude,
            tenantAddress
          );

          const locationResult = calculateLocationScoreFromDriveTime(driveTimeMinutes);
          const propertyAllowsPets = p.properties?.pet_friendly ?? true;

          // V4 hard filter
          const petsExcluded = isPetsExcluded(tenantHasPets, propertyAllowsPets);

          // 4-Factor Scoring V4 (100 points max: 40/30/20/10)
          const breakdown = {
            location: locationResult.score,    // 40 pts max
            budget: calculateBudgetScoreV2(tenantBudget, p.monthly_rent),  // 20 pts max
            bedrooms: calculateBedroomScoreV2(tenantBedrooms, p.bedrooms, isVoucherHolder),  // 30 pts max
            move_in: calculateMoveInScore(tenantMoveIn, p.availability_date),  // 10 pts max
          };

          const score = calculateOverallScoreV2(breakdown);
          const tier = getMatchTier(score, locationResult.excluded || petsExcluded);

          const portfolio = p.properties?.portfolios;
          const hasClientEmail = portfolio?.client_email != null;

          return {
            unit_id: p.id,
            property_id: p.properties?.id,
            address: p.properties?.address,
            unit_number: p.unit_number,
            city: p.properties?.city,
            state: p.properties?.state,
            zipcode: p.properties?.zipcode,
            rent: p.monthly_rent,
            bedrooms: p.bedrooms,
            pets_allowed: propertyAllowsPets,
            score,
            tier,
            drive_time_minutes: driveTimeMinutes,
            drive_time_label: locationResult.label,
            drive_time_source: driveTimeSource,
            breakdown,
            ownership_type: hasClientEmail ? 'client_managed' : 'landlord_self_managed',
            client: portfolio ? {
              portfolio_id: portfolio.id,
              name: portfolio.client_name,
              email: portfolio.client_email,
              phone: portfolio.client_phone,
            } : null,
            _excluded: locationResult.excluded,
          };
        });

        const allMatches = await Promise.all(matchPromises);
        
        // Filter out 45+ min drives (excluded), sort by score, limit results
        const includedMatches = allMatches
          .filter(m => !m._excluded)
          .map(({ _excluded, ...rest }) => rest)
          .sort((a, b) => b.score - a.score)
          .slice(0, matchLimit);

        const excludedCount = allMatches.filter(m => m._excluded).length;

        response = {
          success: true,
          tenant: {
            id: tenant.id,
            name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim(),
            budget: tenantBudget,
            bedrooms: tenantBedrooms,
            has_pets: tenantHasPets,
            location: { city: tp.city, state: tp.state, zip: tenantZip },
          },
          matches: includedMatches,
          excluded_count: excludedCount,
          excluded_reason: excludedCount > 0 ? '45+ min drive time' : null,
        };
        status = 200;
      } else {
        // Match property to tenants (uses legacy scoring for now)
        const { data: unit } = await supabase
          .from('property_units')
          .select(`*, properties!inner(id, address, city, state, zipcode)`)
          .eq('id', property_id)
          .single();

        if (!unit) {
          return new Response(
            JSON.stringify({ success: false, error: 'Property unit not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: tenants } = await supabase
          .from('profiles')
          .select(`*, tenant_profiles!tenant_profiles_user_id_fkey(*)`)
          .eq('user_type', 'tenant')
          .in('housing_status', ['seeking', 'approved'])
          .limit(200);

        const matches = (tenants || []).map((t: any) => {
          const tp = t.tenant_profiles?.[0] || {};
          const tenantBudget = extractTenantBudget(tp, t);
          const tenantBedrooms = tp.bedrooms_approved || t.desired_bedrooms;
          const tenantHasPets = tp.has_pets || false;
          const tenantMoveIn = tp.move_in_window || t.desired_move_in_date;
          const isVoucherHolder = tp.voucher_holder || false;

          // V4 hard filter for pets
          const propertyAllowsPets = unit.properties?.pet_friendly ?? true;
          if (isPetsExcluded(tenantHasPets, propertyAllowsPets)) {
            return null;
          }

          // Use V4 scoring for consistency
          const breakdown = {
            location: 20, // Default location (unknown without drive time, 50% of 40)
            budget: calculateBudgetScoreV2(tenantBudget, unit.monthly_rent),
            bedrooms: calculateBedroomScoreV2(tenantBedrooms, unit.bedrooms, isVoucherHolder),
            move_in: calculateMoveInScore(tenantMoveIn, unit.availability_date),
          };

          const score = calculateOverallScoreV2(breakdown);
          const tier = getMatchTier(score, false);

          return {
            tenant_id: t.id,
            name: `${t.first_name || ''} ${t.last_name || ''}`.trim(),
            email: t.email,
            budget: tenantBudget,
            bedrooms_approved: tp.bedrooms_approved,
            voucher_holder: tp.voucher_holder,
            location: { city: tp.city, state: tp.state, zip: tp.zip_code },
            score,
            tier,
            breakdown,
          };
        })
        .filter((m: any) => m !== null)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, matchLimit);

        response = {
          success: true,
          property: {
            id: unit.id,
            property_id: unit.properties?.id,
            address: unit.properties?.address,
            rent: unit.monthly_rent,
            bedrooms: unit.bedrooms,
            location: { city: unit.properties?.city, state: unit.properties?.state, zip: unit.properties?.zipcode },
          },
          matches,
        };
        status = 200;
      }
    }

    else if (path === 'push' && method === 'POST') {
      if (!hasPermission(permissions, 'push')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: push required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { tenant_id, property_id, unit_id, notes, send_email = false } = body;

      if (!tenant_id || !property_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing tenant_id or property_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create property push record
      const { data: push, error } = await supabase
        .from('property_pushes')
        .insert({
          tenant_id,
          property_id,
          unit_id: unit_id || null,
          push_type: 'agent_match',
          notes,
          admin_id: authenticatedUserId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // === SMS NOTIFICATION TO TENANT (non-blocking) ===
      let smsSent = false;
      try {
        // Look up tenant phone and name
        const { data: tenantProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', tenant_id)
          .single();

        // Check if SMS system is enabled before attempting notification
        const { data: smsConfig } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'sms_system_enabled')
          .single();

        const smsEnabled = smsConfig?.config_value === true || smsConfig?.config_value === 'true';

        if (!smsEnabled) {
          console.log('[push] SMS system disabled, skipping notification');
        } else if (tenantProfile?.phone) {
          // Look up property address and rent
          const { data: property } = await supabase
            .from('properties')
            .select('address, city, state')
            .eq('id', property_id)
            .single();

          let rentInfo = '';
          if (unit_id) {
            const { data: unit } = await supabase
              .from('property_units')
              .select('monthly_rent, unit_number')
              .eq('id', unit_id)
              .single();
            if (unit?.monthly_rent) rentInfo = ` Rent: $${unit.monthly_rent}/mo.`;
            if (unit?.unit_number) rentInfo = ` Unit ${unit.unit_number}.${rentInfo}`;
          }

          const tenantName = [tenantProfile.first_name, tenantProfile.last_name].filter(Boolean).join(' ') || 'there';
          const address = property ? [property.address, property.city, property.state].filter(Boolean).join(', ') : 'a new property';

          const smsBody = `Hi ${tenantName}, a new property has been matched for you at ${address}.${rentInfo} View it here: https://openkey-housing-hub.lovable.app/dashboard?tab=My%20Matches`;

          // Call send-sms edge function internally (server-to-server)
          const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: tenantProfile.phone,
              body: smsBody,
              contact_name: tenantName !== 'there' ? tenantName : undefined,
              property_id,
              tenant_id,
            }),
          });

          if (smsResponse.ok) {
            smsSent = true;
            console.log(`[push] SMS sent to tenant ${tenant_id} at ${tenantProfile.phone}`);
          } else {
            const smsError = await smsResponse.text();
            console.error(`[push] SMS failed for tenant ${tenant_id}:`, smsError);
          }
        } else {
          console.log(`[push] No phone number for tenant ${tenant_id}, skipping SMS`);
        }
      } catch (smsErr) {
        console.error('[push] SMS notification error (non-blocking):', smsErr);
        // SMS failure does NOT block the push
      }

      // Optionally trigger email notification
      if (send_email) {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-property-match-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ tenant_id, property_id, unit_id }),
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      response = { success: true, push_id: push.id, tenant_id, property_id, unit_id, email_sent: send_email, sms_sent: smsSent };
      status = 200;

      // Notify owner about the push
      try {
        await notifyOwner({
          subject: 'Match Pushed',
          body: `Tenant ${tenant_id.substring(0, 8)}… matched to property ${property_id.substring(0, 8)}…${smsSent ? ' (tenant notified via SMS)' : ''}`,
        });
      } catch (e) { console.error('[Matchmaker] Owner SMS failed:', e); }
    }

    // ========== PUSH MANAGEMENT ENDPOINTS ==========

    else if (path.match(/^push\/[a-f0-9-]+$/) && method === 'PATCH') {
      if (!hasPermission(permissions, 'push')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: push required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pushId = path.split('/')[1];
      const { status: newStatus, reason } = body;

      if (!newStatus) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing status in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validStatuses = ['cancelled', 'expired', 'denied', 'interested', 'landlord_review', 'primary_applicant'];
      if (!validStatuses.includes(newStatus)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid status. Valid values: ${validStatuses.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current push
      const { data: existingPush } = await supabase
        .from('property_pushes')
        .select('id, push_status')
        .eq('id', pushId)
        .single();

      if (!existingPush) {
        return new Response(
          JSON.stringify({ success: false, error: 'Push not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('property_pushes')
        .update({ 
          push_status: newStatus, 
          notes: reason || existingPush.notes,
          updated_at: new Date().toISOString() 
        })
        .eq('id', pushId);

      if (error) throw error;

      response = { 
        success: true, 
        push_id: pushId, 
        previous_status: existingPush.push_status || 'push_sent', 
        new_status: newStatus,
        reason: reason || null
      };
      status = 200;
    }

    else if (path.match(/^push\/[a-f0-9-]+$/) && method === 'DELETE') {
      if (!hasPermission(permissions, 'push')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions: push required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pushId = path.split('/')[1];

      // Check if push exists
      const { data: existingPush } = await supabase
        .from('property_pushes')
        .select('id, tenant_id, property_id')
        .eq('id', pushId)
        .single();

      if (!existingPush) {
        return new Response(
          JSON.stringify({ success: false, error: 'Push not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('property_pushes')
        .delete()
        .eq('id', pushId);

      if (error) throw error;

      response = { 
        success: true, 
        message: 'Push deleted, property unlocked', 
        push_id: pushId,
        tenant_id: existingPush.tenant_id,
        property_id: existingPush.property_id
      };
      status = 200;
    }

    else if (path === 'history' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenant_id = url.searchParams.get('tenant_id');
      const property_id = url.searchParams.get('property_id');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      if (!tenant_id && !property_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Provide tenant_id or property_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabase
        .from('property_pushes')
        .select(`
          id, tenant_id, property_id, unit_id, push_type, notes, created_at,
          properties(address, city, state),
          profiles!property_pushes_tenant_id_fkey(first_name, last_name)
        `)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (tenant_id) query = query.eq('tenant_id', tenant_id);
      if (property_id) query = query.eq('property_id', property_id);

      const { data, error } = await query;

      if (error) throw error;

      const history = (data || []).map((p: any) => ({
        id: p.id,
        tenant: {
          id: p.tenant_id,
          name: p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Unknown',
        },
        property: {
          id: p.property_id,
          address: p.properties?.address,
          city: p.properties?.city,
          state: p.properties?.state,
        },
        unit_id: p.unit_id,
        push_type: p.push_type,
        notes: p.notes,
        created_at: p.created_at,
      }));

      response = { success: true, count: history.length, history };
      status = 200;
    }

    // ========== PUSHES LIST ENDPOINT ==========
    else if (path === 'pushes' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusFilter = url.searchParams.get('status');
      const tenant_id = url.searchParams.get('tenant_id');
      const property_id = url.searchParams.get('property_id');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('property_pushes')
        .select(`
          id, tenant_id, property_id, unit_id, push_type, status, notes, 
          pushed_at, created_at, updated_at, expires_at, email_sent, email_sent_at,
          lease_start_date, lease_end_date, lease_method,
          tenant_signed_at, landlord_signed_at, lease_fully_executed_at,
          properties(id, address, city, state, zipcode),
          profiles!fk_property_pushes_tenant_id(first_name, last_name, email, phone),
          property_units(id, unit_number, monthly_rent, bedrooms)
        `)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);
      if (tenant_id) query = query.eq('tenant_id', tenant_id);
      if (property_id) query = query.eq('property_id', property_id);

      const { data, error } = await query;
      if (error) throw error;

      const pushes = (data || []).map((p: any) => ({
        id: p.id,
        status: p.status || 'push_sent',
        push_type: p.push_type,
        tenant: {
          id: p.tenant_id,
          name: p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Unknown',
          email: p.profiles?.email,
          phone: p.profiles?.phone,
        },
        property: {
          id: p.property_id,
          address: p.properties?.address,
          city: p.properties?.city,
          state: p.properties?.state,
          zip: p.properties?.zipcode,
        },
        unit: p.property_units ? {
          id: p.unit_id,
          unit_number: p.property_units.unit_number,
          monthly_rent: p.property_units.monthly_rent,
          bedrooms: p.property_units.bedrooms,
        } : null,
        lease: {
          start_date: p.lease_start_date,
          end_date: p.lease_end_date,
          method: p.lease_method,
          tenant_signed_at: p.tenant_signed_at,
          landlord_signed_at: p.landlord_signed_at,
          fully_executed_at: p.lease_fully_executed_at,
        },
        email_sent: p.email_sent,
        email_sent_at: p.email_sent_at,
        notes: p.notes,
        pushed_at: p.pushed_at,
        expires_at: p.expires_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        days_since_push: Math.floor((Date.now() - new Date(p.pushed_at || p.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        hours_since_push: Math.floor((Date.now() - new Date(p.pushed_at || p.created_at).getTime()) / (1000 * 60 * 60)),
      }));

      // Summary stats
      const statusCounts: Record<string, number> = {};
      pushes.forEach((p: any) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });

      response = { success: true, count: pushes.length, status_summary: statusCounts, pushes };
      status = 200;
    }

    // ========== COMPUTED MATCHES ENDPOINT ==========
    else if (path === 'computed-matches' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tenant_id = url.searchParams.get('tenant_id');
      const unit_id = url.searchParams.get('unit_id');
      const tierFilter = url.searchParams.get('tier');
      const minScore = url.searchParams.get('min_score');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('computed_matches')
        .select(`
          id, tenant_id, unit_id, score, tier, breakdown, 
          drive_time_minutes, drive_time_source, computed_at,
          profiles!computed_matches_tenant_id_fkey(first_name, last_name, email, phone, housing_status, pipeline_stage),
          property_units!computed_matches_unit_id_fkey(
            id, unit_number, monthly_rent, bedrooms, bathrooms, status, on_market,
            properties!inner(id, address, city, state, zipcode, pet_friendly)
          )
        `)
        .limit(limit)
        .order('score', { ascending: false });

      if (tenant_id) query = query.eq('tenant_id', tenant_id);
      if (unit_id) query = query.eq('unit_id', unit_id);
      if (tierFilter) query = query.eq('tier', tierFilter);
      if (minScore) query = query.gte('score', parseInt(minScore));

      const { data, error } = await query;
      if (error) throw error;

      const matches = (data || []).map((m: any) => ({
        id: m.id,
        score: m.score,
        tier: m.tier,
        breakdown: m.breakdown,
        drive_time_minutes: m.drive_time_minutes,
        drive_time_source: m.drive_time_source,
        computed_at: m.computed_at,
        tenant: {
          id: m.tenant_id,
          name: m.profiles ? `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim() : 'Unknown',
          email: m.profiles?.email,
          phone: m.profiles?.phone,
          housing_status: m.profiles?.housing_status,
          pipeline_stage: m.profiles?.pipeline_stage,
        },
        unit: m.property_units ? {
          id: m.unit_id,
          unit_number: m.property_units.unit_number,
          monthly_rent: m.property_units.monthly_rent,
          bedrooms: m.property_units.bedrooms,
          bathrooms: m.property_units.bathrooms,
          status: m.property_units.status,
          on_market: m.property_units.on_market,
          property: m.property_units.properties ? {
            id: m.property_units.properties.id,
            address: m.property_units.properties.address,
            city: m.property_units.properties.city,
            state: m.property_units.properties.state,
            zip: m.property_units.properties.zipcode,
            pet_friendly: m.property_units.properties.pet_friendly,
          } : null,
        } : null,
      }));

      // Tier summary
      const tierCounts: Record<string, number> = {};
      matches.forEach((m: any) => {
        tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
      });

      response = { success: true, count: matches.length, tier_summary: tierCounts, matches };
      status = 200;
    }

    // ========== SEED ENDPOINT - Populate computed_matches for existing data ==========
    else if (path === 'seed' && method === 'POST') {
      if (!hasPermission(permissions, 'all')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin privileges required for seeding' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[SEED] Starting initial match computation...');

      // Fetch all active tenants - Use EXPLICIT FK hint for PostgREST join resolution
      const { data: allTenantProfilesRaw, error: tenantsError } = await supabase
        .from('tenant_profiles')
        .select(`
          *,
          profiles!tenant_profiles_user_id_fkey(
            id, first_name, last_name, housing_status, user_type
          )
        `);

      if (tenantsError) {
        console.error('[SEED] Error fetching tenant profiles:', tenantsError);
      }

      console.log(`[SEED] Raw tenant profiles fetched: ${allTenantProfilesRaw?.length || 0}`);

      // Filter BOTH user_type AND housing_status in JavaScript (PostgREST can't filter embedded tables)
      const allTenantProfiles = (allTenantProfilesRaw || []).filter(tp => 
        tp.profiles?.user_type === 'tenant' &&
        ['seeking', 'approved', 'unhoused'].includes(tp.profiles?.housing_status)
      );

      console.log(`[SEED] Active tenant profiles after JS filter: ${allTenantProfiles.length}`);

      // DEBUG: Log first tenant to verify data extraction
      if (allTenantProfiles.length) {
        const firstTp = allTenantProfiles[0];
        console.log('[SEED DEBUG] First tenant:', JSON.stringify({
          tp_id: firstTp.id,
          user_id: firstTp.user_id,
          zip_code: firstTp.zip_code,
          voucher_amount: firstTp.voucher_amount,
          bedrooms_approved: firstTp.bedrooms_approved,
          housing_status: firstTp.profiles?.housing_status,
          has_profiles: !!firstTp.profiles,
          profile_name: firstTp.profiles?.first_name,
        }));
      }

      // Fetch all on-market, non-occupied properties (BOTH unit and parent property must be on_market)
      const { data: allProperties, error: propertiesError } = await supabase
        .from('property_units')
        .select(`*, properties!inner(
          id, address, city, state, zipcode, deleted_at, portfolio_id, pet_friendly, latitude, longitude, on_market
        )`)
        .eq('on_market', true)
        .eq('properties.on_market', true)  // Parent property must also be on_market
        .not('status', 'eq', 'occupied')
        .is('properties.deleted_at', null);

      console.log(`[SEED] Properties fetched: ${allProperties?.length || 0}`);

      if (!allTenantProfiles?.length || !allProperties?.length) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No tenants or properties found to seed',
            debug: { tenants: allTenantProfiles?.length || 0, properties: allProperties?.length || 0 }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== CLEAN SEED: Delete all existing matches first ==========
      // This ensures stale cross-state matches and outdated records are removed
      console.log('[SEED] Deleting all existing computed_matches for clean rebuild...');
      const { error: deleteError, count: deleteCount } = await supabase
        .from('computed_matches')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('[SEED] Failed to clear computed_matches:', deleteError.message);
      } else {
        console.log(`[SEED] Cleared ${deleteCount ?? 'unknown'} existing matches`);
      }

      const matchesToInsert: any[] = [];
      let excludedByDriveTime = 0;
      const skipDriveTimeFilter = body?.skip_drive_time_filter ?? true; // Default to true for seeding
      
      // ========== CACHE-ONLY MODE FOR SEEDING ==========
      // Skip Google API calls to prevent timeout. Use cache → Haversine only.
      // Google API calls happen in real-time UI (Property Finder, Match Drawer)
      
      const seedStartTime = Date.now();
      console.log(`[SEED] Starting match computation: ${allTenantProfiles.length} tenants × ${allProperties.length} properties`);
      
      // ========== BULK-FETCH ALL DRIVE TIME CACHE ==========
      // Single query instead of 2000+ individual lookups = 10x faster
      console.log('[SEED] Fetching all cached drive times...');
      const { data: allCachedDriveTimes } = await supabase
        .from('drive_time_cache')
        .select('origin_zip, destination_zip, drive_time_minutes')
        .gt('expires_at', new Date().toISOString());

      const driveTimeCache = new Map<string, number>();
      (allCachedDriveTimes || []).forEach(c => {
        driveTimeCache.set(`${c.origin_zip}-${c.destination_zip}`, c.drive_time_minutes);
      });
      console.log(`[SEED] Loaded ${driveTimeCache.size} cached drive times into memory`);
      
      let cacheHits = 0;
      let haversineFallbacks = 0;

      // Compute all matches - now iterating over tenant_profiles directly
      for (let tenantIndex = 0; tenantIndex < allTenantProfiles.length; tenantIndex++) {
        const tp = allTenantProfiles[tenantIndex];
        const tenant = tp.profiles; // Profile is embedded in tenant_profiles
        // Extract data using helper functions for consistency
        const tenantBudget = extractTenantBudget(tp, tenant);
        const tenantBedrooms = tp.bedrooms_approved || tenant.desired_bedrooms;
        const tenantZip = tp.desired_zip_code || tp.zip_code || '';
        const tenantHasPets = tp.has_pets || false;
        const tenantMoveIn = tp.move_in_window || tenant.desired_move_in_date;
        const isVoucherHolder = tp.voucher_holder || false;
        
        let matchesForTenant = 0;

        for (const p of allProperties) {
          // STATE FILTER: Skip cross-state matches (same logic as compute-match-queue)
          const tenantState = (tp.desired_state || tp.state)?.toLowerCase();
          const propertyState = p.properties?.state?.toLowerCase();
          if (tenantState && propertyState && tenantState !== propertyState) {
            continue;
          }

          // BEDROOM PRE-FILTER: Skip if gap is 2+ bedrooms (same logic as compute-match-queue)
          if (bedroomGapTooLarge(tenantBedrooms, p.bedrooms)) {
            continue;
          }

          const propertyZip = p.properties?.zipcode || '';
          
          // ========== CACHE-ONLY DRIVE TIME (NO GOOGLE API DURING SEED) ==========
          let driveTimeMinutes: number | null = null;
          let driveTimeSource: 'google' | 'cache' | 'estimated' = 'estimated';
          
          if (tenantZip && propertyZip) {
            // Step 1: Check pre-loaded cache (instant O(1) Map lookup)
            const cacheKey = `${tenantZip}-${propertyZip}`;
            const cachedTime = driveTimeCache.get(cacheKey);
            
            if (cachedTime !== undefined) {
              driveTimeMinutes = cachedTime;
              driveTimeSource = 'cache';
              cacheHits++;
            } else if (p.properties?.latitude && p.properties?.longitude) {
              // Step 2: Haversine fallback (instant calculation)
              const tenantCentroid = getZipcodeCentroid(tenantZip);
              if (tenantCentroid) {
                const distance = haversineDistance(
                  tenantCentroid.lat, 
                  tenantCentroid.lon, 
                  p.properties.latitude, 
                  p.properties.longitude
                );
                driveTimeMinutes = estimateDriveTime(distance);
                driveTimeSource = 'estimated';
                haversineFallbacks++;
              }
            }
          } else if (p.properties?.latitude && p.properties?.longitude && tenantZip) {
            // Use centroid fallback when property zip is missing
            const tenantCentroid = getZipcodeCentroid(tenantZip);
            if (tenantCentroid) {
              const distance = haversineDistance(
                tenantCentroid.lat, 
                tenantCentroid.lon, 
                p.properties.latitude, 
                p.properties.longitude
              );
              driveTimeMinutes = estimateDriveTime(distance);
              driveTimeSource = 'estimated';
              haversineFallbacks++;
            }
          }
          // If no location data, driveTimeMinutes stays null (50% score)

          const locationResult = calculateLocationPercentage(driveTimeMinutes);
          
          if (locationResult.excluded && !skipDriveTimeFilter) {
            excludedByDriveTime++;
            continue;
          }

          const propertyAllowsPets = p.properties?.pet_friendly ?? true;

          // V4 hard filter for pets
          if (isPetsExcluded(tenantHasPets, propertyAllowsPets)) {
            continue;
          }

          const breakdown = {
            location: locationResult.percentage,
            budget: calculateBudgetPercentage(tenantBudget, p.monthly_rent),
            bedrooms: calculateBedroomPercentageV2(tenantBedrooms, p.bedrooms, isVoucherHolder),
            move_in: calculateTimingPercentage(tenantMoveIn, p.availability_date),
          };

          const score = calculateOverallPercentage(breakdown);
          const tier = getMatchTierFromPercentage(score, locationResult.excluded);

          matchesToInsert.push({
            tenant_id: tenant.id,
            unit_id: p.id,
            score,
            tier,
            breakdown,
            drive_time_minutes: driveTimeMinutes,
            drive_time_source: driveTimeSource,
            computed_at: new Date().toISOString(),
          });
          matchesForTenant++;
        }
        
        // Progress log after each tenant
        if ((tenantIndex + 1) % 5 === 0 || tenantIndex === allTenantProfiles.length - 1) {
          console.log(`[SEED] Processed tenant ${tenantIndex + 1}/${allTenantProfiles.length} (${matchesForTenant} matches this tenant)`);
        }
      }

      const computeTime = Date.now() - seedStartTime;
      console.log(`[SEED] Matches computed: ${matchesToInsert.length}, excluded: ${excludedByDriveTime}, cache hits: ${cacheHits}, haversine: ${haversineFallbacks}, time: ${computeTime}ms`);

      // Insert in batches of 500
      let insertedCount = 0;
      let errors: string[] = [];
      const batchSize = 500;

      for (let i = 0; i < matchesToInsert.length; i += batchSize) {
        const batch = matchesToInsert.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(matchesToInsert.length / batchSize);
        
        const { error: insertError } = await supabase
          .from('computed_matches')
          .upsert(batch, { 
            onConflict: 'tenant_id,unit_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error(`[SEED] Batch ${batchIndex}/${totalBatches} insert error:`, insertError);
          errors.push(insertError.message);
        } else {
          insertedCount += batch.length;
          console.log(`[SEED] Batch ${batchIndex}/${totalBatches} inserted: ${batch.length} matches`);
        }
      }

      const totalTime = Date.now() - seedStartTime;
      console.log(`[SEED] Complete! Inserted: ${insertedCount}, errors: ${errors.length}, total time: ${totalTime}ms`);

      response = {
        success: errors.length === 0,
        seeded_count: insertedCount,
        total_computed: matchesToInsert.length,
        excluded_by_drive_time: excludedByDriveTime,
        errors: errors.length > 0 ? errors : undefined,
        debug: {
          tenants: allTenantProfiles.length,
          properties: allProperties.length,
          potential_pairs: allTenantProfiles.length * allProperties.length,
          cache_hits: cacheHits,
          haversine_fallbacks: haversineFallbacks,
          compute_time_ms: computeTime,
          total_time_ms: totalTime,
        }
      };
      status = errors.length === 0 ? 200 : 207;
    }

    // ========== PLATFORM METRICS ENDPOINT ==========
    if (path === 'platform/metrics' && method === 'GET') {
      if (!hasPermission(permissions, 'read')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get distinct states and countries from properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('state, country, owner_id');

      const statesSet = new Set<string>();
      const countriesSet = new Set<string>();
      const ownersSet = new Set<string>();

      propertiesData?.forEach((p: any) => {
        if (p.state) statesSet.add(p.state);
        if (p.country) countriesSet.add(p.country);
        if (p.owner_id) ownersSet.add(p.owner_id);
      });

      // Count properties and units
      const propertyCount = propertiesData?.length || 0;

      const { count: unitCount } = await supabase
        .from('property_units')
        .select('id', { count: 'exact', head: true });

      // Aggregate rent payments
      const { data: completedPayments } = await supabase
        .from('rent_payments')
        .select('amount')
        .eq('status', 'completed');

      const { data: pendingPayments } = await supabase
        .from('rent_payments')
        .select('amount')
        .in('status', ['pending', 'processing']);

      const totalCollected = completedPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const totalPending = pendingPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const paymentCount = (completedPayments?.length || 0) + (pendingPayments?.length || 0);

      response = {
        success: true,
        metrics: {
          states: Array.from(statesSet).sort(),
          states_count: statesSet.size,
          countries: Array.from(countriesSet).sort(),
          countries_count: countriesSet.size,
          landlords: ownersSet.size,
          properties: propertyCount,
          units: unitCount || 0,
          rent_tracked: {
            total_collected: totalCollected,
            total_pending: totalPending,
            payment_count: paymentCount,
          },
        },
      };
      status = 200;
    }

    // Log the request
    const duration = Date.now() - startTime;
    const { error: logError } = await supabase.from('agent_api_logs').insert({
      api_key_id: keyId,
      endpoint: path,
      method,
      request_body: body,
      response_status: status,
      duration_ms: duration,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    if (logError) {
      console.error('Failed to log API request:', logError);
    }

    return new Response(
      JSON.stringify(response),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Agent API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
