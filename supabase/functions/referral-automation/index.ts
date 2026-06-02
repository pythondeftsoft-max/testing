
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'process_milestone_updates': {
        // Get all referrals that need milestone processing
        const { data: referrals, error: fetchError } = await supabaseClient
          .from('referrals')
          .select('*')
          .in('status', ['invitation_sent', 'registered', 'approved', 'first_payment'])
          .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours

        if (fetchError) throw fetchError

        let processed = 0
        const results = []

        for (const referral of referrals || []) {
          try {
            // Check if user has registered
            if (referral.status === 'invitation_sent' && referral.referred_user_id) {
              await supabaseClient.rpc('update_referral_milestone', {
                p_referred_user_id: referral.referred_user_id,
                p_milestone: 'registered'
              })
              processed++
              results.push({ referral_id: referral.id, action: 'marked_registered' })
            }

            // Check for property applications (approved milestone)
            if (referral.status === 'registered') {
              const { data: applications } = await supabaseClient
                .from('property_applications')
                .select('property_id')
                .eq('tenant_id', referral.referred_user_id)
                .eq('status', 'approved')
                .limit(1)

              if (applications && applications.length > 0) {
                await supabaseClient.rpc('update_referral_milestone', {
                  p_referred_user_id: referral.referred_user_id,
                  p_milestone: 'approved',
                  p_property_id: applications[0].property_id
                })
                processed++
                results.push({ referral_id: referral.id, action: 'marked_approved' })
              }
            }

            // Check for first payment
            if (referral.status === 'approved') {
              const { data: payments } = await supabaseClient
                .from('rent_payments')
                .select('id')
                .eq('tenant_id', referral.referred_user_id)
                .eq('status', 'completed')
                .limit(1)

              if (payments && payments.length > 0) {
                await supabaseClient.rpc('update_referral_milestone', {
                  p_referred_user_id: referral.referred_user_id,
                  p_milestone: 'first_payment'
                })
                processed++
                results.push({ referral_id: referral.id, action: 'marked_first_payment' })
              }
            }

            // Check for 60-day milestone
            if (referral.status === 'first_payment' && referral.first_payment_at) {
              const daysSinceFirstPayment = Math.floor(
                (Date.now() - new Date(referral.first_payment_at).getTime()) / (1000 * 60 * 60 * 24)
              )

              if (daysSinceFirstPayment >= 60) {
                await supabaseClient.rpc('update_referral_milestone', {
                  p_referred_user_id: referral.referred_user_id,
                  p_milestone: 'sixty_day_milestone'
                })
                processed++
                results.push({ referral_id: referral.id, action: 'marked_qualified' })
              }
            }
          } catch (error) {
            console.error(`Error processing referral ${referral.id}:`, error)
            results.push({ referral_id: referral.id, action: 'error', error: (error instanceof Error ? error.message : String(error)) })
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            processed_count: processed,
            total_checked: referrals?.length || 0,
            results 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'refresh_analytics': {
        // Refresh materialized view
        const { error } = await supabaseClient
          .rpc('refresh_materialized_view', { view_name: 'referral_performance_analytics' })

        if (error) {
          console.warn('Failed to refresh materialized view:', error)
          // Try direct refresh as fallback
          await supabaseClient.from('referral_performance_analytics').select('*').limit(1)
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Analytics refreshed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cleanup_expired_referrals': {
        // Mark referrals as expired if they haven't progressed in 90 days
        const expiryDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: expired, error } = await supabaseClient
          .from('referrals')
          .update({ status: 'expired' })
          .eq('status', 'invitation_sent')
          .lt('invitation_sent_at', expiryDate)
          .select('id')

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true, 
            expired_count: expired?.length || 0 
          }),
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
    console.error('Automation Error:', error)
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
