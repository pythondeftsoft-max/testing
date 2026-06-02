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

    console.log('Starting coordinate backfill for existing properties...')

    // Get all properties without coordinates
    const { data: properties, error: fetchError } = await supabaseClient
      .from('properties')
      .select('id, street_address, city, state, zipcode')
      .or('latitude.is.null,longitude.is.null')
      .not('street_address', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${properties?.length || 0} properties to geocode`)

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No properties need geocoding', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let errorCount = 0

    // Process each property
    for (const property of properties) {
      try {
        const address = [
          property.street_address,
          property.city,
          property.state,
          property.zipcode
        ].filter(Boolean).join(', ')

        if (!address.trim()) {
          console.log(`Skipping property ${property.id} - no valid address`)
          continue
        }

        // Call the geocode-address function
        const geocodeResponse = await supabaseClient.functions.invoke('geocode-address', {
          body: {
            property_id: property.id,
            address: address
          }
        })

        if (geocodeResponse.error) {
          console.error(`Error geocoding property ${property.id}:`, geocodeResponse.error)
          errorCount++
        } else {
          console.log(`Successfully geocoded property ${property.id}`)
          successCount++
        }

        // Rate limiting - wait 1 second between requests to be respectful to Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error processing property ${property.id}:`, error)
        errorCount++
      }
    }

    console.log(`Backfill complete: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true,
        total: properties.length,
        geocoded: successCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})