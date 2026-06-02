import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[HANDLE-AUTOPAY-SETUP-SUCCESS] ${step}${detailsStr}`);
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
    if (!user?.id) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    const { session_id, property_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    if (!property_id) throw new Error("property_id is required");

    logStep("Request params", { session_id, property_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['setup_intent', 'setup_intent.payment_method']
    });

    logStep("Session retrieved", { sessionId: session.id, mode: session.mode });

    if (session.mode !== 'setup') {
      throw new Error("Invalid session type - expected setup session");
    }

    const setupIntent = session.setup_intent as Stripe.SetupIntent;
    if (!setupIntent) throw new Error("No setup intent found in session");

    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;
    if (!paymentMethod) throw new Error("No payment method found in setup intent");

    logStep("Payment method retrieved", { 
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type 
    });

    // Get payment method details
    const isBank = paymentMethod.type === 'us_bank_account';
    const last_four = isBank 
      ? paymentMethod.us_bank_account?.last4 
      : paymentMethod.card?.last4;
    const brand = isBank 
      ? paymentMethod.us_bank_account?.bank_name 
      : paymentMethod.card?.brand;

    // Check if payment method already exists
    const { data: existingPM } = await supabaseClient
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethod.id)
      .eq('user_id', user.id)
      .single();

    let paymentMethodDbId: string;

    if (existingPM) {
      paymentMethodDbId = existingPM.id;
      logStep("Using existing payment method", { paymentMethodDbId });
    } else {
      // Save new payment method
      const { data: newPM, error: pmError } = await supabaseClient
        .from('payment_methods')
        .insert({
          user_id: user.id,
          stripe_payment_method_id: paymentMethod.id,
          type: paymentMethod.type,
          last_four: last_four || '',
          brand: brand || '',
          is_default: true
        })
        .select('id')
        .single();

      if (pmError) throw new Error(`Failed to save payment method: ${pmError.message}`);
      paymentMethodDbId = newPM.id;
      logStep("New payment method saved", { paymentMethodDbId });
    }

    // Get property details for autopay schedule
    const { data: property, error: propError } = await supabaseClient
      .from('properties')
      .select('monthly_rent, rent_due_day')
      .eq('id', property_id)
      .single();

    if (propError) throw new Error(`Failed to get property: ${propError.message}`);

    // Get rent amount from rent_splits if exists
    const { data: rentSplit } = await supabaseClient
      .from('rent_splits')
      .select('tenant_portion')
      .eq('property_id', property_id)
      .eq('is_active', true)
      .single();

    const amount = rentSplit?.tenant_portion || property.monthly_rent || 0;
    const autopay_day = property.rent_due_day || 1;

    // Calculate next payment date
    const today = new Date();
    let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), autopay_day);
    if (nextPaymentDate <= today) {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Update or create autopay schedule
    const { data: existingSchedule } = await supabaseClient
      .from('autopay_schedules')
      .select('id')
      .eq('property_id', property_id)
      .eq('tenant_id', user.id)
      .single();

    if (existingSchedule) {
      // Update existing schedule with new payment method
      const { error: updateError } = await supabaseClient
        .from('autopay_schedules')
        .update({
          payment_method_id: paymentMethodDbId,
          payment_method_type: paymentMethod.type,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSchedule.id);

      if (updateError) throw new Error(`Failed to update autopay schedule: ${updateError.message}`);
      logStep("Autopay schedule updated", { scheduleId: existingSchedule.id });
    } else {
      // Create new autopay schedule
      const { error: insertError } = await supabaseClient
        .from('autopay_schedules')
        .insert({
          property_id,
          tenant_id: user.id,
          payment_method_id: paymentMethodDbId,
          payment_method_type: paymentMethod.type,
          autopay_day,
          amount,
          status: 'active',
          next_payment_date: nextPaymentDate.toISOString().split('T')[0]
        });

      if (insertError) throw new Error(`Failed to create autopay schedule: ${insertError.message}`);
      logStep("Autopay schedule created");
    }

    return new Response(JSON.stringify({
      success: true,
      payment_method: {
        id: paymentMethodDbId,
        type: paymentMethod.type,
        last_four,
        brand
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR", { message: errorMessage, fullError: error });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
