import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check admin status
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.user_type !== 'admin') {
      throw new Error("Admin access required");
    }

    const { customerId } = await req.json();
    if (!customerId) throw new Error("Customer ID is required");

    logStep("Admin verified, syncing subscription", { customerId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get customer subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    logStep("Retrieved Stripe subscriptions", { count: subscriptions.data.length });

    // Update each subscription in our database
    for (const subscription of subscriptions.data) {
      const subscriptionTier = subscription.items.data[0]?.price?.unit_amount <= 999 
        ? "Basic" 
        : subscription.items.data[0]?.price?.unit_amount <= 1999 
          ? "Premium" 
          : "Enterprise";

      await supabaseClient
        .from('subscriptions')
        .upsert({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan_type: subscriptionTier,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'stripe_subscription_id',
          ignoreDuplicates: false 
        });

      logStep("Updated subscription", { subscriptionId: subscription.id, status: subscription.status });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced: subscriptions.data.length 
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