import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting weekly quota reset...')

    // Call the database function to reset quotas
    const { data, error } = await supabase.rpc('reset_weekly_application_quotas')

    if (error) {
      console.error('Error resetting weekly quotas:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to reset quotas', details: (error instanceof Error ? error.message : String(error)) }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully reset quotas for ${data} tenants`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset quotas for ${data} tenants`,
        reset_count: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})