import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-CHECKOUT-PAYMENT-METHOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY is not set");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key found");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    logStep("Supabase client created");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Attempting to authenticate user");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("ERROR: Authentication failed", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or no email");
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json();
    const { session_id } = requestBody;
    logStep("Request body", { session_id, fullBody: requestBody });

    if (!session_id) {
      logStep("ERROR: No session_id provided");
      throw new Error("No session_id provided");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized");

    // Retrieve the Checkout Session
    logStep("Retrieving checkout session", { session_id });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Checkout session retrieved", { 
      sessionId: session.id, 
      status: session.status, 
      paymentStatus: session.payment_status,
      setupIntent: session.setup_intent 
    });

    if (session.status !== 'complete') {
      logStep("ERROR: Checkout session not complete", { status: session.status });
      throw new Error(`Checkout session is not complete. Status: ${session.status}`);
    }

    if (!session.setup_intent) {
      logStep("ERROR: No setup intent in checkout session", session);
      throw new Error("No setup intent found in checkout session");
    }

    // Retrieve the Setup Intent to get the payment method
    logStep("Retrieving setup intent", { setupIntentId: session.setup_intent });
    const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);
    logStep("Setup intent retrieved", { 
      setupIntentId: setupIntent.id, 
      status: setupIntent.status,
      paymentMethod: setupIntent.payment_method 
    });
    
    if (!setupIntent.payment_method) {
      logStep("ERROR: No payment method on setup intent", setupIntent);
      throw new Error("No payment method attached to setup intent");
    }

    logStep("Retrieving payment method", { paymentMethodId: setupIntent.payment_method });
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
    logStep("Payment method retrieved", { 
      paymentMethodId: paymentMethod.id, 
      type: paymentMethod.type,
      card: paymentMethod.card,
      usBankAccount: paymentMethod.us_bank_account 
    });

    // Check if payment method already exists
    logStep("Checking for existing payment method");
    const { data: existingPaymentMethod, error: existingError } = await supabaseClient
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethod.id)
      .maybeSingle();

    if (existingError) {
      logStep("ERROR: Failed to check existing payment method", existingError);
      throw new Error(`Failed to check existing payment method: ${existingError.message}`);
    }

    if (existingPaymentMethod) {
      logStep("Payment method already exists", { existingId: existingPaymentMethod.id });
      return new Response(JSON.stringify({
        payment_method: {
          id: existingPaymentMethod.id,
          stripe_id: paymentMethod.id,
          type: paymentMethod.type,
          already_exists: true
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Payment method doesn't exist yet, proceeding to save");

    // Store payment method in our database
    const paymentMethodData = {
      user_id: user.id,
      stripe_payment_method_id: paymentMethod.id,
      type: paymentMethod.type,
      last_four: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4 || null,
      brand: paymentMethod.card?.brand || paymentMethod.us_bank_account?.bank_name || null,
      is_default: false
    };
    logStep("Payment method data prepared", paymentMethodData);

    logStep("Checking for existing payment methods for user");
    const { data: existingMethods, error: existingMethodsError } = await supabaseClient
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id);

    if (existingMethodsError) {
      logStep("ERROR: Failed to check existing payment methods", existingMethodsError);
      throw new Error(`Failed to check existing payment methods: ${existingMethodsError.message}`);
    }

    // Set as default if it's the user's first payment method
    if (!existingMethods || existingMethods.length === 0) {
      paymentMethodData.is_default = true;
      logStep("Setting as default payment method (first for user)");
    }

    logStep("Inserting payment method into database", paymentMethodData);
    const { data: savedMethod, error: saveError } = await supabaseClient
      .from('payment_methods')
      .insert(paymentMethodData)
      .select()
      .single();

    if (saveError) {
      logStep("ERROR: Failed to save payment method to database", saveError);
      throw new Error(`Failed to save payment method: ${saveError.message}`);
    }

    logStep("Payment method saved successfully", { id: savedMethod.id });

    return new Response(JSON.stringify({
      payment_method: {
        id: savedMethod.id,
        stripe_id: paymentMethod.id,
        type: paymentMethod.type,
        last_four: savedMethod.last_four,
        brand: savedMethod.brand,
        is_default: savedMethod.is_default
      }
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