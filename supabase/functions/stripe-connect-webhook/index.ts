import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (!webhookSecret) {
      logStep("STRIPE_WEBHOOK_SECRET is not configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err instanceof Error ? err.message : String(err)) });
      return new Response(`Webhook Error: ${(err instanceof Error ? err.message : String(err))}`, { status: 400 });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabaseClient, paymentIntent, stripe);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferCreated(supabaseClient, transfer);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(supabaseClient, account);
        break;
      }

      case 'application_fee.created': {
        const applicationFee = event.data.object as Stripe.ApplicationFee;
        await handleApplicationFeeCreated(supabaseClient, applicationFee);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(supabaseClient, session);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handlePaymentSucceeded(supabaseClient: any, paymentIntent: Stripe.PaymentIntent, stripe: Stripe) {
  logStep("Handling payment succeeded", { paymentIntentId: paymentIntent.id, metadata: paymentIntent.metadata });

  // Check if this is a placement fee payment
  if (paymentIntent.metadata?.payment_type === 'placement_fee') {
    logStep("Processing placement fee payment");
    
    const placementFeeId = paymentIntent.metadata.placement_fee_id;
    
    if (placementFeeId) {
      const { error: updateError } = await supabaseClient
        .from('landlord_placement_fees')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: paymentIntent.id,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', placementFeeId);

      if (updateError) {
        logStep("Failed to update placement fee", updateError);
      } else {
        logStep("Placement fee marked as paid", { placementFeeId });
      }
    }
    return;
  }

  // Handle autopay setup if enabled
  const enableAutopay = paymentIntent.metadata?.enable_autopay === 'true';
  const tenantId = paymentIntent.metadata?.tenant_id;
  const propertyId = paymentIntent.metadata?.property_id;
  const paymentMethodId = paymentIntent.payment_method;

  if (enableAutopay && tenantId && propertyId && paymentMethodId) {
    logStep("Processing autopay setup", { tenantId, propertyId, paymentMethodId });
    
    try {
      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId as string);
      
      const isBank = paymentMethod.type === 'us_bank_account';
      const last_four = isBank 
        ? paymentMethod.us_bank_account?.last4 
        : paymentMethod.card?.last4;
      const brand = isBank 
        ? paymentMethod.us_bank_account?.bank_name 
        : paymentMethod.card?.brand;

      // Check if payment method already exists in DB
      const { data: existingPM } = await supabaseClient
        .from('payment_methods')
        .select('id')
        .eq('stripe_payment_method_id', paymentMethodId)
        .eq('user_id', tenantId)
        .maybeSingle();

      let paymentMethodDbId: string;

      if (existingPM) {
        paymentMethodDbId = existingPM.id;
        logStep("Using existing payment method", { paymentMethodDbId });
      } else {
        // Save new payment method to DB
        const { data: newPM, error: pmError } = await supabaseClient
          .from('payment_methods')
          .insert({
            user_id: tenantId,
            stripe_payment_method_id: paymentMethodId,
            type: paymentMethod.type,
            last_four: last_four || '',
            brand: brand || '',
            is_default: true
          })
          .select('id')
          .single();

        if (pmError) {
          logStep("Failed to save payment method", pmError);
        } else {
          paymentMethodDbId = newPM.id;
          logStep("New payment method saved", { paymentMethodDbId });
        }
      }

      // Calculate autopay schedule details
      const rentDueDay = parseInt(paymentIntent.metadata?.rent_due_day || '1');
      const baseRentAmount = parseFloat(paymentIntent.metadata?.base_rent_amount || '0');
      
      const today = new Date();
      let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay);
      if (nextPaymentDate <= today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      // Check for existing autopay schedule
      const { data: existingSchedule } = await supabaseClient
        .from('autopay_schedules')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingSchedule) {
        // Calculate next payment date (advance to next month after payment)
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        nextPaymentDate.setDate(rentDueDay);
        
        // Update existing schedule with real payment method and updated next_payment_date
        const { error: updateError } = await supabaseClient
          .from('autopay_schedules')
          .update({
            payment_method_id: paymentMethodDbId!,
            payment_method_type: paymentMethod.type,
            status: 'active',
            failure_count: 0,
            last_failure_reason: null,
            next_payment_date: nextPaymentDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);

        if (updateError) {
          logStep("Failed to update autopay schedule", updateError);
        } else {
          logStep("Autopay schedule updated with payment method and next_payment_date", { 
            scheduleId: existingSchedule.id,
            nextPaymentDate: nextPaymentDate.toISOString().split('T')[0]
          });
        }
      } else {
        // Create new autopay schedule
        const { error: insertError } = await supabaseClient
          .from('autopay_schedules')
          .insert({
            property_id: propertyId,
            tenant_id: tenantId,
            payment_method_id: paymentMethodDbId!,
            payment_method_type: paymentMethod.type,
            autopay_day: rentDueDay,
            amount: baseRentAmount,
            status: 'active',
            next_payment_date: nextPaymentDate.toISOString().split('T')[0]
          });

        if (insertError) {
          logStep("Failed to create autopay schedule", insertError);
        } else {
          logStep("Autopay schedule created with payment method");
        }
      }
    } catch (autopayError) {
      logStep("Error processing autopay setup", { error: autopayError });
    }
  }

  // Original rent payment logic - set paid_at timestamp for status tracking
  const now = new Date().toISOString();
  const { data: payment, error: updateError } = await supabaseClient
    .from('rent_payments')
    .update({
      status: 'completed',
      payment_status: 'succeeded',
      paid_at: now,
      updated_at: now
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .select('*, properties(owner_id)')
    .single();

  if (updateError) {
    logStep("Failed to update payment", updateError);
    return;
  }

  // Record platform transaction
  await supabaseClient.from('platform_transactions').insert({
    payment_id: payment.id,
    property_id: payment.property_id,
    tenant_id: payment.tenant_id,
    property_manager_id: payment.properties.owner_id,
    stripe_payment_intent_id: paymentIntent.id,
    transaction_type: 'rent_payment',
    gross_amount: (payment.original_rent_amount || payment.amount) + (payment.tenant_fee_amount || 0),
    tenant_fee: payment.tenant_fee_amount || 0,
    platform_fee: payment.platform_fee_amount || 0,
    net_to_pm: payment.net_amount_to_pm || payment.amount
  });

  logStep("Platform transaction recorded");
}

async function handleTransferCreated(supabaseClient: any, transfer: Stripe.Transfer) {
  logStep("Handling transfer created", { transferId: transfer.id });

  // Update platform transaction with transfer ID
  const { error } = await supabaseClient
    .from('platform_transactions')
    .update({
      stripe_transfer_id: transfer.id,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', transfer.metadata?.payment_intent_id);

  if (error) {
    logStep("Failed to update transfer ID", error);
  }
}

async function handleAccountUpdated(supabaseClient: any, account: Stripe.Account) {
  logStep("Handling account updated", { accountId: account.id });

  const isOnboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;

  // Update user profile with onboarding status
  const { error } = await supabaseClient
    .from('profiles')
    .update({
      stripe_onboarding_complete: isOnboardingComplete,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    logStep("Failed to update profile", error);
  }
}

async function handleApplicationFeeCreated(supabaseClient: any, applicationFee: Stripe.ApplicationFee) {
  logStep("Handling application fee created", { feeId: applicationFee.id });

  // Update platform transaction with application fee ID
  const { error } = await supabaseClient
    .from('platform_transactions')
    .update({
      stripe_application_fee_id: applicationFee.id,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', applicationFee.charge);

  if (error) {
    logStep("Failed to update application fee", error);
  }
}

async function handleCheckoutSessionCompleted(supabaseClient: any, session: Stripe.Checkout.Session) {
  logStep("Handling checkout session completed", { sessionId: session.id, metadata: session.metadata });

  const metadata = session.metadata;
  
  // Handle rent payment checkout sessions (created via create-rent-checkout)
  // These have property_id and tenant_id but no 'type' field
  if (metadata?.property_id && metadata?.tenant_id && !metadata?.type) {
    logStep('Processing rent payment checkout session');
    
    const now = new Date().toISOString();
    
    // Update rent_payments record with the payment intent ID
    const { data: updatedPayment, error: updateError } = await supabaseClient
      .from('rent_payments')
      .update({
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'completed',
        payment_status: 'succeeded',
        paid_at: now,
        updated_at: now,
      })
      .eq('stripe_session_id', session.id)
      .select('*, properties(owner_id, address)')
      .maybeSingle();

    if (updateError) {
      logStep('Error updating rent payment from checkout', updateError);
    } else if (updatedPayment) {
      logStep('Rent payment updated from checkout', { 
        paymentId: updatedPayment.id, 
        paymentIntentId: session.payment_intent 
      });
      
      // Record platform transaction
      await supabaseClient.from('platform_transactions').insert({
        payment_id: updatedPayment.id,
        property_id: updatedPayment.property_id,
        tenant_id: updatedPayment.tenant_id,
        property_manager_id: updatedPayment.properties?.owner_id,
        stripe_payment_intent_id: session.payment_intent as string,
        transaction_type: 'rent_payment',
        gross_amount: (updatedPayment.original_rent_amount || updatedPayment.amount) + (updatedPayment.tenant_fee_amount || 0),
        tenant_fee: updatedPayment.tenant_fee_amount || 0,
        platform_fee: updatedPayment.platform_fee_amount || 0,
        net_to_pm: updatedPayment.net_amount_to_pm || updatedPayment.amount
      });
      
      logStep('Platform transaction recorded for rent checkout');
    }
    
    return; // Exit after handling rent payment
  }
  
  if (metadata?.type === 'placement_fee' && metadata.placement_fee_id) {
    logStep('Processing placement fee checkout', { placementFeeId: metadata.placement_fee_id });
    
    const now = new Date().toISOString();
    const placementFeeId = metadata.placement_fee_id;

    // 1. Update landlord_placement_fees to paid
    const { data: placementFee, error: feeError } = await supabaseClient
      .from('landlord_placement_fees')
      .update({
        payment_status: 'paid',
        payment_date: now,
        payment_method: 'stripe',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id: session.id,
        updated_at: now,
      })
      .eq('id', placementFeeId)
      .select('tenant_id, property_id, unit_id, worker_id, application_id')
      .single();

    if (feeError || !placementFee) {
      logStep('Error updating placement fee', feeError);
      return;
    }

    logStep('Placement fee updated, processing workflow', placementFee);

    // Clean up other pending fees for same placement
    await supabaseClient
      .from('landlord_placement_fees')
      .delete()
      .eq('property_id', placementFee.property_id)
      .eq('unit_id', placementFee.unit_id)
      .eq('tenant_id', placementFee.tenant_id)
      .eq('payment_status', 'pending')
      .neq('id', placementFeeId);

    logStep('Cleaned up duplicate pending fees');

    // 2. Update tenant to housed_paid
    await supabaseClient
      .from('profiles')
      .update({
        housing_status: 'housed',
        pipeline_stage: 'housed_paid',
        updated_at: now,
      })
      .eq('id', placementFee.tenant_id);

    logStep('Tenant status updated to housed_paid');

    // 3. Update property unit to paid_housed and mark as occupied
    await supabaseClient
      .from('property_units')
      .update({
        pipeline_stage: 'paid_housed',
        status: 'occupied',
        on_market: false,
        updated_at: now,
      })
      .eq('id', placementFee.unit_id);

    logStep('Unit status updated to occupied');

    // 3b. Also update parent property to off-market
    await supabaseClient
      .from('properties')
      .update({
        on_market: false,
        status: 'occupied',
        updated_at: now,
      })
      .eq('id', placementFee.property_id);

    logStep('Parent property marked as off-market');

    // 4. Update marketplace_applications to housed
    await supabaseClient
      .from('marketplace_applications')
      .update({ 
        status: 'housed',
        lifecycle_stage: 'current_tenant',
        is_primary_applicant: false, // No longer an applicant
        updated_at: now,
      })
      .eq('user_id', placementFee.tenant_id)
      .eq('status', 'lease_signed');

    logStep('Marketplace applications updated to housed');

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

    logStep('Platform transaction recorded');

    // 6. Award points to worker
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

      logStep('Worker points awarded');
    }

    // 7. Withdraw housed tenant's other applications (to different units)
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

    logStep('Housed tenant\'s other applications withdrawn');

    // 8. Withdraw OTHER tenants' applications to the same property/unit
    await supabaseClient
      .from('marketplace_applications')
      .update({ 
        status: 'withdrawn', 
        lifecycle_stage: 'withdrawn',
        withdrawn_at: now,
        withdrawn_reason: 'Unit filled - tenant housed',
        updated_at: now,
      })
      .eq('property_id', placementFee.property_id)
      .neq('user_id', placementFee.tenant_id)
      .in('status', ['submitted', 'under_review', 'approved', 'lease_signing']);

    logStep('Other tenants\' applications to same property withdrawn');
    logStep('Placement fee processed successfully', { 
      tenantId: placementFee.tenant_id, 
      unitId: placementFee.unit_id 
    });
  }
}