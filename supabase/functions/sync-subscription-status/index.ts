import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription sync");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Initialize Supabase with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No Stripe customer found for this email" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Update profile with stripe_customer_id if not set
    await supabaseService
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    logStep("Found subscriptions", { count: subscriptions.data.length });

    // Get user profile to determine role
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    const userType = profile?.user_type || 'tenant';
    const role = userType === 'tenant' ? 'tenant' : 'landlord';

    // Process each active subscription
    for (const subscription of subscriptions.data) {
      logStep("Processing subscription", { 
        subscriptionId: subscription.id, 
        status: subscription.status 
      });

      // Determine plan type from price
      const priceAmount = subscription.items?.data?.[0]?.price?.unit_amount || 0;
      let planType = 'tenant_pro';
      if (role === 'landlord') {
        planType = 'landlord_starter';
      } else if (priceAmount >= 1000) {
        planType = 'tenant_pro';
      }

      // Upsert subscription record
      const { error: subError } = await supabaseService
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
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

      if (subError) {
        logStep("Error upserting subscription", { error: subError.message });
        throw subError;
      }

      // Update user profile based on role
      if (role === 'landlord') {
        await supabaseService
          .from('profiles')
          .update({
            subscription_active: subscription.status === 'active',
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_tier: planType
          })
          .eq('id', user.id);
      } else {
        // Update tenant profile
        await supabaseService
          .from('tenant_profiles')
          .upsert({
            user_id: user.id,
            is_plus_subscriber: subscription.status === 'active',
            plus_subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

      logStep("Subscription synced successfully", { 
        subscriptionId: subscription.id, 
        userId: user.id, 
        role, 
        planType 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      subscriptionsFound: subscriptions.data.length,
      message: "Subscription status synced successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR in sync-subscription-status", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});