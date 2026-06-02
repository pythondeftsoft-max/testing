import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RENT-PAYMENT-INTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { 
      propertyId, 
      amount, 
      tenantFeeAmount = 0,
      totalAmount,
      paymentMethod = 'us_bank_account',
      dueDate,
      enableAutopay = false
    } = await req.json();

    if (!propertyId || !amount) {
      throw new Error("Missing required fields: propertyId, amount");
    }

    const chargeAmount = totalAmount || amount;

    logStep("Request data", { propertyId, amount, tenantFeeAmount, totalAmount, chargeAmount, paymentMethod, dueDate, enableAutopay });

    // Validate tenant has access to this property
    const { data: propertyApp } = await supabaseClient
      .from('property_applications')
      .select('id, status')
      .eq('property_id', propertyId)
      .eq('tenant_id', user.id)
      .in('status', ['approved', 'housed'])
      .maybeSingle();

    let approvedApplication = propertyApp;

    if (!approvedApplication) {
      const { data: marketplaceApp } = await supabaseClient
        .from('marketplace_applications')
        .select('id, status')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .in('status', ['approved', 'housed'])
        .maybeSingle();
      
      approvedApplication = marketplaceApp;
    }

    if (!approvedApplication) {
      throw new Error("No approved application found for this property");
    }

    logStep("Application verified", { applicationId: approvedApplication.id });

    // Get property details
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('id, owner_id, portfolio_id, address, rent_due_day')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new Error("Property not found");
    }

    logStep("Property found", { propertyId: property.id, ownerId: property.owner_id });

    // Find receiving Stripe Connect account
    let receivingAccountId = null;
    
    const { data: propertyPaymentSettings } = await supabaseClient
      .from('property_payment_settings')
      .select('receivables_connect_account_id')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (propertyPaymentSettings?.receivables_connect_account_id) {
      receivingAccountId = propertyPaymentSettings.receivables_connect_account_id;
    }

    if (!receivingAccountId && property.portfolio_id) {
      const { data: portfolioPaymentSettings } = await supabaseClient
        .from('portfolio_payment_settings')
        .select('connect_account_id')
        .eq('portfolio_id', property.portfolio_id)
        .eq('is_default', true)
        .maybeSingle();

      if (portfolioPaymentSettings?.connect_account_id) {
        receivingAccountId = portfolioPaymentSettings.connect_account_id;
      }
    }

    if (!receivingAccountId) {
      const { data: defaultAccount } = await supabaseClient
        .from('stripe_connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', property.owner_id)
        .eq('is_default', true)
        .eq('onboarding_complete', true)
        .maybeSingle();

      if (defaultAccount?.stripe_account_id) {
        receivingAccountId = defaultAccount.stripe_account_id;
      }
    }

    if (!receivingAccountId) {
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', property.owner_id)
        .single();

      if (ownerProfile?.stripe_account_id && ownerProfile?.stripe_onboarding_complete) {
        receivingAccountId = ownerProfile.stripe_account_id;
      }
    }

    if (!receivingAccountId) {
      throw new Error("Landlord has not set up payment receiving. Please contact your landlord.");
    }

    logStep("Receiving account found", { receivingAccountId });

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
      
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
    }

    logStep("Customer ready", { customerId });

    // Convert amounts to cents
    const chargeAmountInCents = Math.round(Number(chargeAmount) * 100);
    const baseAmountInCents = Math.round(Number(amount) * 100);

    // Calculate platform fee (0.5% of base rent amount)
    const platformFeeInCents = Math.round(baseAmountInCents * 0.005);

    // Create PaymentIntent with transfer
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: chargeAmountInCents,
      currency: 'usd',
      customer: customerId,
      payment_method_types: [paymentMethod],
      application_fee_amount: platformFeeInCents,
      transfer_data: {
        destination: receivingAccountId,
      },
      metadata: {
        property_id: propertyId,
        tenant_id: user.id,
        base_rent_amount: amount.toString(),
        tenant_fee_amount: tenantFeeAmount.toString(),
        total_amount: chargeAmount.toString(),
        payment_method: paymentMethod,
        due_date: dueDate || new Date().toISOString().split('T')[0],
        enable_autopay: enableAutopay ? 'true' : 'false',
        rent_due_day: property.rent_due_day?.toString() || '1',
        property_address: property.address,
      },
    };

    // Only set setup_future_usage if autopay is enabled
    if (enableAutopay) {
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      clientSecret: paymentIntent.client_secret ? 'present' : 'missing',
      enableAutopay 
    });

    // Create pending rent payment record
    const { data: rentPayment, error: rentPaymentError } = await supabaseClient
      .from('rent_payments')
      .insert({
        tenant_id: user.id,
        property_id: propertyId,
        amount: amount,
        original_rent_amount: amount,
        due_date: dueDate || new Date().toISOString().split('T')[0],
        status: 'pending',
        payment_method: paymentMethod === 'card' ? 'stripe_card' : 'stripe_ach',
        payment_source: 'tenant',
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select()
      .single();

    if (rentPaymentError) {
      logStep("Error creating rent payment record", rentPaymentError);
    } else {
      logStep("Rent payment record created", { rentPaymentId: rentPayment?.id });
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      rentPaymentId: rentPayment?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
