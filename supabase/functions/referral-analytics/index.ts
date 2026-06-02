
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'get_performance_analytics': {
        const { portfolio_id, time_period } = params
        
        const { data: analytics, error } = await supabaseClient
          .from('referral_performance_analytics')
          .select('*')
          .eq('source_portfolio_id', portfolio_id)
          .order('month_year', { ascending: false })
          .limit(12)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, analytics }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_cohort_analysis': {
        const { portfolio_id, cohort_period, analysis_months } = params
        
        const { data: cohorts, error } = await supabaseClient
          .rpc('get_referral_cohort_analysis', {
            p_portfolio_id: portfolio_id,
            p_cohort_period: cohort_period || 'month',
            p_analysis_months: analysis_months || 12
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, cohorts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_success_probability': {
        const { referrer_id, business_type } = params
        
        const { data: probability, error } = await supabaseClient
          .rpc('calculate_referral_success_probability', {
            p_referrer_id: referrer_id,
            p_business_type: business_type
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, probability: probability[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_cross_business_metrics': {
        const { source_business_type, target_business_type, base_amount } = params
        
        const { data: bonus, error } = await supabaseClient
          .rpc('calculate_cross_business_bonus', {
            p_source_business_type: source_business_type,
            p_target_business_type: target_business_type,
            p_base_amount: base_amount || 100
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, cross_business_bonus: bonus }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Analytics Error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
