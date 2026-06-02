import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (not strictly needed here but kept for parity/potential auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { zipcode, city, state, country = 'us' } = body as {
      zipcode?: string;
      city?: string;
      state?: string;
      country?: string;
    };

    if (!zipcode && !city) {
      return new Response(
        JSON.stringify({ error: 'Provide either zipcode or city' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer US Census TIGER ZCTA polygons when searching a US ZIP code, then fall back to Nominatim
    if (zipcode && (country?.toLowerCase?.() === 'us')) {
      try {
        const zcta = zipcode.toString().padStart(5, '0').slice(0, 5);
        const censusHeaders: Record<string, string> = {
          'User-Agent': 'OpenKeyMaps/1.0 (contact: support@openkey.app)',
          'Accept': 'application/json',
          'Referer': 'https://openkey.app',
        };
        // Try GeoJSON directly first
        const geoUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ZCTA5/MapServer/0/query?where=ZCTA5CE20='${zcta}'&outFields=ZCTA5CE20,NAME&returnGeometry=true&outSR=4326&f=geojson`;
        let censusRes = await fetch(geoUrl, { headers: censusHeaders });
        let censusData: any = null;
        if (censusRes.ok) {
          censusData = await censusRes.json().catch(() => null);
        }
        // Fallback to Esri JSON and convert if GeoJSON is not available
        if (!censusData?.features?.length) {
          const esriUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ZCTA5/MapServer/0/query?where=ZCTA5CE20='${zcta}'&outFields=ZCTA5CE20,NAME&returnGeometry=true&outSR=4326&f=json`;
          censusRes = await fetch(esriUrl, { headers: censusHeaders });
          if (censusRes.ok) {
            const esri = await censusRes.json().catch(() => null);
            const feature = esri?.features?.[0];
            const rings: any[] | undefined = feature?.geometry?.rings;
            if (Array.isArray(rings) && rings.length) {
              const coords = rings.map((ring: number[][]) => ring.map(([x, y]) => [x, y]));
              censusData = {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    properties: feature?.attributes || {},
                    geometry: { type: 'Polygon', coordinates: coords },
                  },
                ],
              };
            }
          }
        }
        if (censusData?.features?.length) {
          const feat = censusData.features[0];
          const geom = feat.geometry;
          if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
            const computeBBox = (geometry: any): [number, number, number, number] => {
              let west = 180, south = 90, east = -180, north = -90;
              const update = (lng: number, lat: number) => {
                if (lng < west) west = lng;
                if (lng > east) east = lng;
                if (lat < south) south = lat;
                if (lat > north) north = lat;
              };
              if (geometry.type === 'Polygon') {
                (geometry.coordinates as number[][][]).forEach((ring) => ring.forEach(([lng, lat]) => update(lng, lat)));
              } else {
                (geometry.coordinates as number[][][][]).forEach((poly) => poly.forEach((ring) => ring.forEach(([lng, lat]) => update(lng, lat))));
              }
              return [west, south, east, north];
            };
            const bbox = computeBBox(geom);
            const centerLat = (bbox[1] + bbox[3]) / 2;
            const centerLng = (bbox[0] + bbox[2]) / 2;
            const payload = {
              success: true,
              display_name: `ZCTA ${zcta} (US Census)`,
              type: 'zcta',
              bbox: bbox as [number, number, number, number],
              center: [centerLat, centerLng] as [number, number],
              geometry: geom,
            };
            return new Response(JSON.stringify(payload), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (e) {
        console.warn('Census ZCTA lookup failed, falling back to Nominatim', e);
      }
    }

    // Build Nominatim structured search URL
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      polygon_geojson: '1', // request actual polygon geometry for accurate zone rendering
      polygon_threshold: '0.001', // simplify polygons slightly to keep responses light
      countrycodes: country,
    });

    if (zipcode) {
      params.set('postalcode', zipcode);
    } else if (city) {
      params.set('city', city);
      if (state) params.set('state', state);
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OpenKeyMaps/1.0 (contact: support@openkey.app)',
        'Accept': 'application/json',
        'Referer': 'https://openkey.app',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Nominatim error:', res.status, text);
      return new Response(
        JSON.stringify({ error: `Geocoding failed (${res.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No area found for query' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const item = results[0];
    // Nominatim boundingbox order: [south, north, west, east]
    const bb = item.boundingbox as [string, string, string, string] | undefined;
    if (!bb) {
      return new Response(
        JSON.stringify({ error: 'No bounding box available for area' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const south = parseFloat(bb[0]);
    const north = parseFloat(bb[1]);
    const west = parseFloat(bb[2]);
    const east = parseFloat(bb[3]);

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    const payload = {
      success: true,
      display_name: item.display_name as string,
      type: item.type as string,
      bbox: [west, south, east, north] as [number, number, number, number],
      center: [lat, lon] as [number, number],
      geometry: item.geojson as unknown, // GeoJSON geometry (Polygon or MultiPolygon)
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('geocode-area error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});