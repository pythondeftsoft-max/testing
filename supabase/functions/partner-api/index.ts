
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// Helper function to hash API keys using Web Crypto API
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify API key using the new hash function
    const apiKeyHash = await hashApiKey(apiKey)
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partner_integrations')
      .select('*')
      .eq('api_key_hash', apiKeyHash)
      .eq('active', true)
      .single()

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (path) {
      case 'referrals': {
        if (req.method === 'GET') {
          // Get referrals
          const { data: referrals, error } = await supabaseClient
            .from('referrals')
            .select('*')
            .eq('partner_source', partner.partner_name)
            .order('created_at', { ascending: false })

          if (error) throw error

          return new Response(
            JSON.stringify({ success: true, referrals }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (req.method === 'POST') {
          // Create referral
          const { referrer_id, referred_email, referred_name, referred_phone, business_type, tracking_code } = await req.json()
          
          if (!partner.permissions.includes('create_referrals')) {
            return new Response(
              JSON.stringify({ error: 'Insufficient permissions' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const referral_code = `${partner.partner_name.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          
          const { data: referral, error } = await supabaseClient
            .from('referrals')
            .insert({
              referrer_id,
              referral_code,
              referred_email,
              referred_name,
              referred_phone,
              business_type: business_type || 'residential',
              partner_source: partner.partner_name,
              tracking_code,
              invitation_sent_at: new Date().toISOString(),
              status: 'invitation_sent'
            })
            .select()
            .single()

          if (error) throw error

          // Log attribution event
          await supabaseClient
            .from('referral_attribution_events')
            .insert({
              referral_id: referral.id,
              event_type: 'partner_created',
              source: partner.partner_name,
              attribution_data: { tracking_code, api_key_used: true }
            })

          return new Response(
            JSON.stringify({ success: true, referral }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'track': {
        if (req.method === 'POST') {
          const { referral_code, event_type, metadata } = await req.json()
          
          // Find referral by code
          const { data: referral, error: findError } = await supabaseClient
            .from('referrals')
            .select('id')
            .eq('referral_code', referral_code)
            .single()

          if (findError || !referral) {
            return new Response(
              JSON.stringify({ error: 'Referral not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Log attribution event
          const { error } = await supabaseClient
            .from('referral_attribution_events')
            .insert({
              referral_id: referral.id,
              event_type,
              source: partner.partner_name,
              attribution_data: { ...metadata, partner_tracked: true }
            })

          if (error) throw error

          return new Response(
            JSON.stringify({ success: true, message: 'Event tracked' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      case 'analytics': {
        if (req.method === 'GET') {
          const { data: analytics, error } = await supabaseClient
            .from('referral_performance_analytics')
            .select('*')
            .limit(100)

          if (error) throw error

          return new Response(
            JSON.stringify({ success: true, analytics }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Partner API Error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
