import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-PAYMENT-METHOD-CHECKOUT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json().catch(() => ({}));
    const { payment_method_types, property_id, purpose } = requestBody;
    logStep("Request body", { payment_method_types, property_id, purpose, requestBody });

    const origin = req.headers.get("origin") || "https://kixsdhnfzjnxikmnbipi.supabase.co";
    logStep("Origin determined", { origin });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    let customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }

    logStep("Customer ready", { customerId });

    // Build success/cancel URLs with property context if provided
    let successUrl = `${origin}/dashboard?tab=Autopay&autopay_setup_success=true&session_id={CHECKOUT_SESSION_ID}`;
    let cancelUrl = `${origin}/dashboard?tab=Autopay&setup_cancelled=true`;
    
    if (property_id) {
      successUrl += `&property_id=${property_id}`;
      cancelUrl += `&property_id=${property_id}`;
    }

    // Create Checkout Session for payment method setup
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      currency: 'usd',
      payment_method_types: payment_method_types || ['card', 'us_bank_account'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        property_id: property_id || '',
        purpose: purpose || 'autopay_setup'
      }
    });

    logStep("Checkout session created", { sessionId: checkoutSession.id, url: checkoutSession.url });

    return new Response(JSON.stringify({
      url: checkoutSession.url,
      session_id: checkoutSession.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    const errorCode = error?.code || 'unknown_error';
    const errorType = error?.type || 'api_error';
    
    logStep("ERROR", { 
      message: errorMessage, 
      code: errorCode, 
      type: errorType,
      fullError: error 
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      error_code: errorCode,
      error_type: errorType
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});