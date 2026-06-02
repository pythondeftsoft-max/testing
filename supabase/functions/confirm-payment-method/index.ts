import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-PAYMENT-METHOD] ${step}${detailsStr}`);
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

    const { setup_intent_id } = await req.json();
    logStep("Request body", { setup_intent_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the Setup Intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    if (!setupIntent.payment_method) {
      throw new Error("No payment method attached to setup intent");
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
    logStep("Payment method retrieved", { paymentMethodId: paymentMethod.id, type: paymentMethod.type });

    // Store payment method in our database
    const paymentMethodData = {
      user_id: user.id,
      stripe_payment_method_id: paymentMethod.id,
      type: paymentMethod.type,
      last_four: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4 || null,
      brand: paymentMethod.card?.brand || paymentMethod.us_bank_account?.bank_name || null,
      is_default: false
    };

    const { data: existingMethods } = await supabaseClient
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id);

    // Set as default if it's the user's first payment method
    if (!existingMethods || existingMethods.length === 0) {
      paymentMethodData.is_default = true;
    }

    const { data: savedMethod, error: saveError } = await supabaseClient
      .from('payment_methods')
      .insert(paymentMethodData)
      .select()
      .single();

    if (saveError) {
      logStep("Error saving payment method", saveError);
      throw new Error(`Failed to save payment method: ${saveError.message}`);
    }

    logStep("Payment method saved", { id: savedMethod.id });

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