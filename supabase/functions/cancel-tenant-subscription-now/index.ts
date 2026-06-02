import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-TENANT-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Initialize Supabase with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");

    logStep("Processing cancellation for tenant", { tenant_id });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get tenant's active subscriptions from database
    const { data: subscriptions, error: subscriptionsError } = await supabaseService
      .from('subscriptions')
      .select('*')
      .eq('user_id', tenant_id)
      .eq('role', 'tenant')
      .eq('status', 'active');

    if (subscriptionsError) {
      logStep("Error fetching subscriptions", { error: subscriptionsError });
      throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("No active subscriptions found", { tenant_id });
      return new Response(JSON.stringify({ 
        message: "No active subscriptions found to cancel" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const cancelledSubscriptions = [];

    // Cancel each subscription in Stripe
    for (const subscription of subscriptions) {
      if (subscription.stripe_subscription_id) {
        try {
          logStep("Cancelling Stripe subscription", { 
            subscriptionId: subscription.stripe_subscription_id 
          });

          await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
          
          // Update subscription status in database
          await supabaseService
            .from('subscriptions')
            .update({ 
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

          cancelledSubscriptions.push({
            id: subscription.id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            status: 'canceled'
          });

          logStep("Successfully cancelled subscription", { 
            subscriptionId: subscription.stripe_subscription_id 
          });
        } catch (error) {
          logStep("Error cancelling subscription", { 
            subscriptionId: subscription.stripe_subscription_id,
            error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)
          });
          
          // Continue with other subscriptions even if one fails
          continue;
        }
      }
    }

    logStep("Cancellation process completed", { 
      tenant_id,
      cancelled_count: cancelledSubscriptions.length 
    });

    return new Response(JSON.stringify({ 
      message: "Subscription cancellation completed",
      cancelled_subscriptions: cancelledSubscriptions
    }), {
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