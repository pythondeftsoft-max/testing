
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { property_id, asset_id, address, country = 'US' } = await req.json()

    if ((!property_id && !asset_id) || !address) {
      return new Response(
        JSON.stringify({ error: 'Missing property_id/asset_id or address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Geocoding address: ${address} in country: ${country} for ${property_id ? 'property' : 'asset'}: ${property_id || asset_id}`);

    // Determine geocoding approach based on country and address type
    let geocodingUrl: string;
    let headers: Record<string, string> = {
      'User-Agent': 'OpenKey-Platform/1.0 (contact@openkey.com)'
    };

    // For high-accuracy requirements or premium countries, use Google Geocoding API
    const googleApiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    const premiumCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'];
    
    if (googleApiKey && premiumCountries.includes(country)) {
      geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=${country.toLowerCase()}&key=${googleApiKey}`;
      headers = {}; // Google API doesn't need User-Agent
    } else {
      // Use Nominatim for international coverage (free tier)
      const countryParam = country !== 'US' ? `&countrycodes=${country.toLowerCase()}` : '';
      geocodingUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1${countryParam}`;
    }
    
    const response = await fetch(geocodingUrl, { headers });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    let latitude: number, longitude: number;
    
    if (googleApiKey && premiumCountries.includes(country)) {
      // Handle Google Geocoding API response
      if (!data.results || data.results.length === 0) {
        console.log(`No geocoding results found for address: ${address}, but this is not a critical error`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No geocoding results found - property saved without coordinates',
            address, 
            country 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const location = data.results[0].geometry.location;
      latitude = location.lat;
      longitude = location.lng;
    } else {
      // Handle Nominatim response
      if (!data || data.length === 0) {
        console.log(`No geocoding results found for address: ${address}, but this is not a critical error`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No geocoding results found - property saved without coordinates',
            address, 
            country 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { lat, lon } = data[0];
      latitude = parseFloat(lat);
      longitude = parseFloat(lon);
    }

    console.log(`Geocoded ${address} to: ${latitude}, ${longitude}`);

    // Update the appropriate entity with coordinates
    if (property_id) {
      const { error: updateError } = await supabaseClient
        .from('properties')
        .update({ 
          latitude, 
          longitude 
        })
        .eq('id', property_id);

      if (updateError) {
        console.error('Error updating property coordinates:', updateError);
        throw updateError;
      }
    } else if (asset_id) {
      // Update portfolio asset location metadata
      const { data: asset, error: fetchError } = await supabaseClient
        .from('portfolio_assets')
        .select('location_metadata')
        .eq('id', asset_id)
        .single();

      if (fetchError) {
        console.error('Error fetching asset:', fetchError);
        throw fetchError;
      }

      const updatedMetadata = {
        ...asset.location_metadata,
        latitude,
        longitude,
        geocoded_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('portfolio_assets')
        .update({ 
          location_metadata: updatedMetadata
        })
        .eq('id', asset_id);

      if (updateError) {
        console.error('Error updating asset coordinates:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        latitude, 
        longitude,
        address,
        country,
        entity_id: property_id || asset_id,
        entity_type: property_id ? 'property' : 'asset'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
