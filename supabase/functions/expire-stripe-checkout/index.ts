import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[EXPIRE-STRIPE-CHECKOUT] Starting request');

    // Get user from auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[EXPIRE-STRIPE-CHECKOUT] Authentication error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('[EXPIRE-STRIPE-CHECKOUT] User authenticated:', user.id);

    const { placement_fee_id } = await req.json();

    if (!placement_fee_id) {
      throw new Error('placement_fee_id is required');
    }

    console.log('[EXPIRE-STRIPE-CHECKOUT] Processing fee:', placement_fee_id);

    // Get the placement fee record to find the stripe_session_id
    const { data: placementFee, error: feeError } = await supabaseClient
      .from('landlord_placement_fees')
      .select('stripe_session_id, payment_status')
      .eq('id', placement_fee_id)
      .single();

    if (feeError) {
      console.error('[EXPIRE-STRIPE-CHECKOUT] Error fetching placement fee:', feeError);
      throw new Error(`Failed to fetch placement fee: ${feeError.message}`);
    }

    if (!placementFee.stripe_session_id) {
      console.log('[EXPIRE-STRIPE-CHECKOUT] No Stripe session ID found, skipping expiration');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Stripe session to expire',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[EXPIRE-STRIPE-CHECKOUT] Found Stripe session:', placementFee.stripe_session_id);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Expire the checkout session
    try {
      const session = await stripe.checkout.sessions.expire(placementFee.stripe_session_id);
      console.log('[EXPIRE-STRIPE-CHECKOUT] Session expired successfully:', session.id);

      // Update the payment link status
      const { error: updateError } = await supabaseClient
        .from('placement_fee_payment_links')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', placementFee.stripe_session_id);

      if (updateError) {
        console.error('[EXPIRE-STRIPE-CHECKOUT] Error updating payment link status:', updateError);
      } else {
        console.log('[EXPIRE-STRIPE-CHECKOUT] Payment link status updated to expired');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Stripe checkout session expired successfully',
          session_id: session.id,
          status: session.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (stripeError: any) {
      // Handle cases where session is already expired or completed
      if (stripeError.code === 'resource_missing' || 
          (stripeError instanceof Error ? stripeError.message : String(stripeError))?.includes('expired') ||
          (stripeError instanceof Error ? stripeError.message : String(stripeError))?.includes('complete')) {
        console.log('[EXPIRE-STRIPE-CHECKOUT] Session already expired or completed:', (stripeError instanceof Error ? stripeError.message : String(stripeError)));
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Session already expired or completed',
            already_expired: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw stripeError;
    }

  } catch (error: any) {
    console.error('[EXPIRE-STRIPE-CHECKOUT] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error instanceof Error ? error.message : String(error)),
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
