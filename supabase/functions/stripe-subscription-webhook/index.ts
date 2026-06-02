import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

// Log webhook events to database for debugging
const logWebhookEvent = async (supabase: any, eventType: string, eventData: any, error?: string) => {
  try {
    await supabase.from('webhook_events').insert({
      webhook_type: 'subscription',
      event_type: eventType,
      event_data: eventData,
      error_message: error,
      processed: !error,
      processed_at: error ? null : new Date().toISOString()
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
};

// Award points for rent payments
const awardRentPaymentPoints = async (supabase: any, paymentData: any) => {
  try {
    const { data: payment } = await supabase
      .from('rent_payments')
      .select(`
        *,
        properties!inner(owner_id, monthly_rent)
      `)
      .eq('stripe_payment_intent_id', paymentData.payment_intent)
      .single();

    if (!payment) {
      logStep('No matching rent payment found', { paymentIntentId: paymentData.payment_intent });
      return;
    }

    const amountInDollars = paymentData.amount_received / 100; // Convert from cents
    const isEarly = payment.payment_date && payment.payment_date < payment.due_date;
    
    // Tenant gets 1 point per dollar paid
    const tenantPoints = Math.floor(amountInDollars);
    
    // Landlord gets 0.2 points per dollar collected
    const landlordPoints = Math.floor(amountInDollars * 0.2);

    // Award points to tenant
    await supabase.rpc('award_points', {
      p_user_id: payment.tenant_id,
      p_event_type: 'rent_payment',
      p_points_change: tenantPoints,
      p_notes: `Rent payment points${isEarly ? ' (early payment)' : ''}: $${amountInDollars}`,
      p_related_entity_id: payment.id,
      p_related_entity_type: 'rent_payment'
    });

    // Award points to landlord
    await supabase.rpc('award_points', {
      p_user_id: payment.properties.owner_id,
      p_event_type: 'rent_collection',
      p_points_change: landlordPoints,
      p_notes: `Rent collection points: $${amountInDollars}`,
      p_related_entity_id: payment.id,
      p_related_entity_type: 'rent_payment'
    });

    logStep('Rent payment points awarded', { 
      tenantId: payment.tenant_id, 
      tenantPoints,
      landlordId: payment.properties.owner_id,
      landlordPoints,
      amount: amountInDollars 
    });

  } catch (error) {
    logStep('Error awarding rent payment points', { error: (error instanceof Error ? error.message : String(error)) });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verify webhook signature
    let event;
    try {
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } else {
        // For development, parse without verification
        event = JSON.parse(body);
      }
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err instanceof Error ? err.message : String(err)) });
      return new Response(`Webhook Error: ${(err instanceof Error ? err.message : String(err))}`, { status: 400 });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Log webhook event to database
    await logWebhookEvent(supabaseService, event.type, event.data.object);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabaseService);
        // Award points for rent payments
        await awardRentPaymentPoints(supabaseService, event.data.object);
        break;
        
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabaseService);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, supabaseService);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object, supabaseService);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabaseService);
        break;
      
      default:
        logStep("Unhandled event type", { type: event.type });
        await logWebhookEvent(supabaseService, event.type, event.data.object, `Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR in stripe-subscription-webhook", { message: errorMessage });
    
    // Log error to database
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      await logWebhookEvent(supabaseService, 'error', { error: errorMessage }, errorMessage);
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionChange(subscription: any, supabase: any) {
  logStep("Handling subscription change", { 
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer
  });

  try {
    // Try to find customer by stripe_customer_id first
    let customer = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('stripe_customer_id', subscription.customer)
      .maybeSingle();

    // If not found by stripe_customer_id, try to find by email from Stripe
    if (!customer.data) {
      logStep("Customer not found by stripe_customer_id, fetching from Stripe", { customerId: subscription.customer });
      
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
      const stripeCustomer = await stripe.customers.retrieve(subscription.customer);
      
      if (stripeCustomer && !stripeCustomer.deleted && stripeCustomer.email) {
        logStep("Retrieved customer from Stripe", { email: stripeCustomer.email });
        
        // Find user by email in auth.users and then get profile
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(stripeCustomer.email);
        
        if (authUser?.user && !authError) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, user_type')
            .eq('id', authUser.user.id)
            .maybeSingle();

          if (userProfile) {
            // Update the profile with stripe_customer_id
            await supabase
              .from('profiles')
              .update({ stripe_customer_id: subscription.customer })
              .eq('id', userProfile.id);
            
            customer = { data: userProfile };
            logStep("Found and updated customer by email", { userId: userProfile.id, email: stripeCustomer.email });
          }
        } else {
          logStep("Auth user not found for email", { email: stripeCustomer.email, authError });
        }
      } else {
        logStep("Invalid Stripe customer", { stripeCustomer: !!stripeCustomer, deleted: stripeCustomer?.deleted });
      }
    }

    if (!customer.data) {
      logStep("Customer not found in profiles", { customerId: subscription.customer });
      return;
    }

    const userId = customer.data.id;
    const userType = customer.data.user_type;
    
    // Determine role from user type or subscription metadata
    let role = userType === 'tenant' ? 'tenant' : 'landlord';
    if (subscription.metadata?.role) {
      role = subscription.metadata.role;
    } else if (subscription.items?.data?.[0]?.price?.metadata?.role) {
      role = subscription.items.data[0].price.metadata.role;
    }

    // Get plan type from price amount or metadata
    const priceAmount = subscription.items?.data?.[0]?.price?.unit_amount || 0;
    let planType = 'tenant_pro';
    if (role === 'landlord') {
      planType = 'landlord_starter';
    } else if (priceAmount >= 1000) { // $10 or more for premium tenant plans
      planType = 'tenant_pro';
    }

    logStep("Processing subscription for user", { userId, role, planType, status: subscription.status });

    // Upsert subscription record
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0]?.price?.id,
        role: role,
        plan_type: planType,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { 
        onConflict: 'stripe_subscription_id' 
      });

    if (error) {
      logStep("Error upserting subscription", { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }

    // Update user profile based on role
    if (role === 'landlord') {
      await supabase
        .from('profiles')
        .update({
          subscription_active: subscription.status === 'active',
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          subscription_tier: planType
        })
        .eq('id', userId);
    } else {
      // Update tenant profile
      await supabase
        .from('tenant_profiles')
        .upsert({
          user_id: userId,
          is_plus_subscriber: subscription.status === 'active',
          plus_subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
        }, {
          onConflict: 'user_id'
        });
    }

    logStep("Subscription updated successfully", { userId, role, status: subscription.status });
  } catch (error) {
    logStep("Error in handleSubscriptionChange", { error: (error instanceof Error ? error.message : String(error)) });
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription: any, supabase: any) {
  logStep("Handling subscription cancellation", { subscriptionId: subscription.id });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logStep("Error updating subscription status", { error: (error instanceof Error ? error.message : String(error)) });
    throw error;
  }

  // Get subscription to find user and role
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, role')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (subscriptionData) {
    if (subscriptionData.role === 'landlord') {
      await supabase
        .from('profiles')
        .update({
          subscription_active: false,
          subscription_expires_at: null,
          subscription_tier: null
        })
        .eq('id', subscriptionData.user_id);
    } else {
      await supabase
        .from('tenant_profiles')
        .update({
          is_plus_subscriber: false,
          plus_subscription_expires_at: null
        })
        .eq('user_id', subscriptionData.user_id);
    }
  }

  logStep("Subscription cancellation processed");
}

async function handlePaymentSucceeded(invoice: any, supabase: any) {
  logStep("Payment succeeded", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
  
  // Ensure subscription is marked as active
  if (invoice.subscription) {
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', invoice.subscription);
  }
}

async function handleCheckoutCompleted(session: any, supabase: any) {
  logStep("Handling checkout completion", { 
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
    customerEmail: session.customer_details?.email
  });

  try {
    // Get customer info from the session
    const customerEmail = session.customer_details?.email;
    const customerId = session.customer;
    
    if (!customerEmail) {
      logStep("No customer email in checkout session");
      return;
    }

    // Find user by email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(customerEmail);
    
    if (!authUser?.user || authError) {
      logStep("Auth user not found for checkout", { email: customerEmail, authError });
      return;
    }

    // Get or update user profile
    let { data: userProfile } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('id', authUser.user.id)
      .maybeSingle();

    if (userProfile) {
      // Update profile with stripe_customer_id if not already set
      if (!userProfile.stripe_customer_id) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userProfile.id);
      }
      
      logStep("Customer profile updated from checkout", { userId: userProfile.id, email: customerEmail });
    }

    // If there's a subscription, handle it
    if (session.subscription) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      if (subscription) {
        logStep("Processing subscription from checkout session", { subscriptionId: subscription.id });
        await handleSubscriptionChange(subscription, supabase);
      }
    }

    logStep("Checkout completion processed successfully");
  } catch (error) {
    logStep("Error in handleCheckoutCompleted", { error: (error instanceof Error ? error.message : String(error)) });
    throw error;
  }
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  logStep("Payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
  
  // Mark subscription as past_due
  if (invoice.subscription) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', invoice.subscription);
  }
}
