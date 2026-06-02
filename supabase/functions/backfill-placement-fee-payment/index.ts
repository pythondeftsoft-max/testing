import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placement_fee_id } = await req.json();

    if (!placement_fee_id) {
      throw new Error('placement_fee_id is required');
    }

    console.log('Backfilling placement fee payment:', placement_fee_id);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the placement fee record
    const { data: placementFee, error: feeQueryError } = await supabaseClient
      .from('landlord_placement_fees')
      .select('*')
      .eq('id', placement_fee_id)
      .single();

    if (feeQueryError || !placementFee) {
      throw new Error(`Placement fee not found: ${feeQueryError?.message}`);
    }

    if (!placementFee.stripe_session_id) {
      throw new Error('No Stripe session ID found for this placement fee');
    }

    if (placementFee.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          alreadyProcessed: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Verifying Stripe session:', placementFee.stripe_session_id);

    // Initialize Stripe and verify the session
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.retrieve(placementFee.stripe_session_id);

    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    console.log('Payment verified, processing workflow');

    const now = new Date().toISOString();

    // 1. Update landlord_placement_fees to paid
    const { error: updateFeeError } = await supabaseClient
      .from('landlord_placement_fees')
      .update({
        payment_status: 'paid',
        payment_date: now,
        payment_method: 'stripe',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: now,
      })
      .eq('id', placement_fee_id);

    if (updateFeeError) {
      throw new Error(`Failed to update placement fee: ${updateFeeError.message}`);
    }

    console.log('Placement fee updated to paid');

    // Clean up other pending fees for same placement
    await supabaseClient
      .from('landlord_placement_fees')
      .delete()
      .eq('property_id', placementFee.property_id)
      .eq('unit_id', placementFee.unit_id)
      .eq('tenant_id', placementFee.tenant_id)
      .eq('payment_status', 'pending')
      .neq('id', placement_fee_id);

    console.log('Cleaned up duplicate pending fees');

    // 2. Update tenant to housed_paid
    await supabaseClient
      .from('profiles')
      .update({
        housing_status: 'housed',
        pipeline_stage: 'housed_paid',
        updated_at: now,
      })
      .eq('id', placementFee.tenant_id);

    console.log('Tenant status updated to housed_paid');

    // 3. Update property unit to paid_housed and mark as occupied
    await supabaseClient
      .from('property_units')
      .update({
        pipeline_stage: 'paid_housed',
        status: 'occupied',
        on_market: false,
        tenant_id: placementFee.tenant_id,
        current_tenant_id: placementFee.tenant_id,
        updated_at: now,
      })
      .eq('id', placementFee.unit_id);

    console.log('Unit status updated to occupied');

    // 3b. Update parent property status to occupied
    await supabaseClient
      .from('properties')
      .update({
        status: 'occupied',
        on_market: false,
        updated_at: now,
      })
      .eq('id', placementFee.property_id);

    console.log('Property status updated to occupied');

    // 4. Update marketplace_applications to housed
    await supabaseClient
      .from('marketplace_applications')
      .update({ 
        status: 'housed',
        updated_at: now,
      })
      .eq('user_id', placementFee.tenant_id)
      .eq('status', 'lease_signed');

    console.log('Marketplace applications updated to housed');

    // 4b. Ensure unit_applications row exists & is stamped so analytics counters reflect this match
    const { data: existingUa } = await supabaseClient
      .from('unit_applications')
      .select('id')
      .eq('tenant_id', placementFee.tenant_id)
      .eq('unit_id', placementFee.unit_id)
      .maybeSingle();

    if (existingUa) {
      const { error: uaError } = await supabaseClient
        .from('unit_applications')
        .update({
          status: 'approved',
          priority_payment_made: true,
          payment_received_date: now,
          lease_signed_date: now,
          payment_method: 'stripe',
          stripe_payment_intent_id: session.payment_intent as string,
          payment_notes: `Backfilled from Stripe session ${session.id}`,
          updated_at: now,
        })
        .eq('id', existingUa.id);
      if (uaError) console.error('Failed to stamp unit_applications (non-blocking):', uaError);
      else console.log('unit_applications stamped with payment/lease dates');
    } else {
      const { error: uaInsertError } = await supabaseClient
        .from('unit_applications')
        .insert({
          tenant_id: placementFee.tenant_id,
          unit_id: placementFee.unit_id,
          status: 'approved',
          priority_payment_made: true,
          payment_received_date: now,
          lease_signed_date: now,
          payment_method: 'stripe',
          stripe_payment_intent_id: session.payment_intent as string,
          payment_notes: `Created by backfill from Stripe session ${session.id}`,
          is_primary_applicant: true,
        });
      if (uaInsertError) console.error('Failed to insert unit_applications (non-blocking):', uaInsertError);
      else console.log('unit_applications row created for backfilled placement');
    }

    // 5. Create platform_transactions record
    const amount = (session.amount_total || 0) / 100;
    await supabaseClient
      .from('platform_transactions')
      .insert({
        transaction_type: 'placement_fee',
        gross_amount: amount,
        property_id: placementFee.property_id,
        tenant_id: placementFee.tenant_id,
        stripe_payment_intent_id: session.payment_intent as string,
        payment_status: 'completed',
        payment_date: now,
        created_at: now,
        updated_at: now,
      });

    console.log('Platform transaction recorded');

    // 6. Award points to worker if applicable
    if (placementFee.worker_id) {
      await supabaseClient
        .from('matchmaker_actions')
        .insert({
          worker_id: placementFee.worker_id,
          action_type: 'placement_fee_received',
          entity_type: 'property',
          entity_id: placementFee.property_id,
          points_earned: 2,
          metadata: {
            tenant_id: placementFee.tenant_id,
            payment_amount: amount,
          },
          created_at: now,
        });

      console.log('Worker points awarded');
    }

    // 7. Withdraw other applications
    await supabaseClient
      .from('marketplace_applications')
      .update({ 
        status: 'withdrawn', 
        lifecycle_stage: 'withdrawn',
        withdrawn_at: now,
        withdrawn_reason: 'Tenant housed in another unit',
        updated_at: now,
      })
      .eq('user_id', placementFee.tenant_id)
      .neq('unit_id', placementFee.unit_id)
      .in('status', ['submitted', 'under_review', 'approved', 'lease_signing']);

    console.log('Other applications withdrawn');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Placement fee payment backfilled successfully',
        details: {
          tenantId: placementFee.tenant_id,
          unitId: placementFee.unit_id,
          amount: amount,
          paymentDate: now,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error backfilling placement fee payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
