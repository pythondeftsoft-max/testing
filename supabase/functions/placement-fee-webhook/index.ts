import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (stripeWebhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log('Received Stripe webhook:', event.type);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.type === 'placement_fee' && metadata.placement_fee_id) {
        console.log('Processing placement fee payment for placement_fee_id:', metadata.placement_fee_id);

        const now = new Date().toISOString();
        const placementFeeId = metadata.placement_fee_id;

        // 1. Update landlord_placement_fees to paid
        console.log('Updating placement fee with ID:', placementFeeId);
        const { data: placementFee, error: feeError } = await supabase
          .from('landlord_placement_fees')
          .update({
            payment_status: 'paid',
            payment_date: now,
            payment_method: 'stripe',
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_session_id: session.id,
          })
          .eq('id', placementFeeId)
          .select('tenant_id, property_id, unit_id, worker_id, application_id')
          .single();

        if (feeError || !placementFee) {
          console.error('Error updating placement fee:', feeError);
          throw feeError;
        }

        console.log('Placement fee updated successfully:', placementFee);

        // 1b. Mark any active friendly payment links for this fee as paid
        const { error: linkPaidError } = await supabase
          .from('placement_fee_payment_links')
          .update({ paid_at: now })
          .eq('placement_fee_id', placementFeeId)
          .is('paid_at', null);
        if (linkPaidError) {
          console.error('Warning: failed to mark payment link(s) as paid:', linkPaidError);
        }

        // 2. Update unit_applications (if application exists)
        if (placementFee.application_id) {
          const { error: appError } = await supabase
            .from('unit_applications')
            .update({
              priority_payment_made: true,
              payment_received_date: now,
              payment_method: 'stripe',
              stripe_payment_intent_id: session.payment_intent as string,
              payment_notes: `Paid via Stripe - Session ID: ${session.id}`,
            })
            .eq('id', placementFee.application_id);

          if (appError) {
            console.error('Error updating application:', appError);
            // Don't throw - continue with other updates
          }
        }

        // 3. Update tenant to housed_paid
        console.log('Updating tenant pipeline stage to housed_paid');
        await supabase
          .from('profiles')
          .update({
            housing_status: 'housed',
            pipeline_stage: 'housed_paid',
          })
          .eq('id', placementFee.tenant_id);

        // 4. Update property unit to paid_housed and mark as occupied/offline
        console.log('Updating property unit pipeline stage and status');
        await supabase
          .from('property_units')
          .update({
            pipeline_stage: 'paid_housed',
            status: 'occupied',
            on_market: false,
            tenant_id: placementFee.tenant_id,
            current_tenant_id: placementFee.tenant_id,
          })
          .eq('id', placementFee.unit_id);

        // 4a. Update parent property status to occupied
        console.log('Updating parent property status to occupied');
        await supabase
          .from('properties')
          .update({
            status: 'occupied',
            on_market: false,
          })
          .eq('id', placementFee.property_id);

        // 4b. Update marketplace_applications status to 'housed' for this tenant
        console.log('Updating marketplace applications to housed for tenant:', placementFee.tenant_id);
        await supabase
          .from('marketplace_applications')
          .update({ 
            status: 'housed',
            lifecycle_stage: 'current_tenant',
            became_tenant_at: now,
          })
          .eq('user_id', placementFee.tenant_id)
          .eq('status', 'lease_signed');

        // 4c. Update property_applications status to 'housed' for this tenant
        console.log('Updating property applications to housed for tenant:', placementFee.tenant_id);
        await supabase
          .from('property_applications')
          .update({ 
            status: 'housed',
            housing_status: 'housed_and_paid'
          })
          .eq('tenant_id', placementFee.tenant_id)
          .eq('status', 'lease_signed');

        // 5. Create platform_transactions record
        const amount = (session.amount_total || 0) / 100; // Convert from cents
        await supabase
          .from('platform_transactions')
          .insert({
            transaction_type: 'placement_fee',
            gross_amount: amount,
            property_id: placementFee.property_id,
            tenant_id: placementFee.tenant_id,
            stripe_payment_intent_id: session.payment_intent as string,
            payment_status: 'completed',
            payment_date: now,
          });

        // 6. Award points to worker (if worker exists)
        if (placementFee.worker_id) {
          console.log('Awarding points to worker:', placementFee.worker_id);
          await supabase
            .from('matchmaker_actions')
            .insert({
              worker_id: placementFee.worker_id,
              action_type: 'placement_fee_received',
              entity_type: 'property',
              entity_id: placementFee.property_id,
              points_earned: 2,
              metadata: {
                tenant_id: placementFee.tenant_id,
                property_id: placementFee.property_id,
                payment_amount: amount,
                payment_method: 'stripe',
                stripe_payment_intent_id: session.payment_intent,
                placement_fee_id: placementFeeId,
              },
            });
        }

        // 7. Withdraw other applications by this tenant
        console.log('Withdrawing other applications by tenant:', placementFee.tenant_id);
        
        // Withdraw marketplace applications
        await supabase
          .from('marketplace_applications')
          .update({ 
            status: 'withdrawn', 
            lifecycle_stage: 'withdrawn',
            withdrawn_at: now,
            withdrawn_reason: 'Tenant housed in another unit',
          })
          .eq('user_id', placementFee.tenant_id)
          .neq('unit_id', placementFee.unit_id)
          .in('status', ['submitted', 'under_review', 'approved', 'lease_signing']);

        // Withdraw property applications (if they exist)
        if (placementFee.application_id) {
          const { data: otherApps } = await supabase
            .from('property_applications')
            .select('id, unit_id, is_primary_applicant')
            .eq('tenant_id', placementFee.tenant_id)
            .neq('id', placementFee.application_id)
            .neq('status', 'withdrawn');

          if (otherApps && otherApps.length > 0) {
            // Withdraw all other applications
            await supabase
              .from('property_applications')
              .update({
                status: 'withdrawn',
                withdrawn_at: now,
                withdrawn_reason: 'Tenant housed in another unit',
              })
              .in('id', otherApps.map(app => app.id));

            // For units where tenant was Primary, remove Primary status and return to available
            const primaryUnits = otherApps
              .filter(app => app.is_primary_applicant === true)
              .map(app => app.unit_id);

            if (primaryUnits.length > 0) {
              // Update property units: In Process → Available, unpause listing
              await supabase
                .from('property_units')
                .update({
                  pipeline_stage: 'available',
                  status: 'vacant',
                  on_market: true,
                  updated_at: now,
                })
                .in('id', primaryUnits);

              console.log(`Returned ${primaryUnits.length} units to available after tenant housed`);
            }
          }
        }
        
        console.log('All other applications withdrawn successfully');

        console.log('Placement fee payment processed successfully');
      }
    }

    // Handle payment_intent.succeeded for additional tracking
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;

      if (metadata?.type === 'placement_fee') {
        console.log('Payment intent succeeded for placement fee:', paymentIntent.id);
        // Additional logging or tracking if needed
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
