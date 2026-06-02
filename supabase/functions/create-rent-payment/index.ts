import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-RENT-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get authenticated user
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    const { propertyId, amount, dueDate, payment_method_id, setup_future_usage } = await req.json();

    if (!propertyId || !amount) {
      throw new Error('Missing required fields: propertyId, amount');
    }

    logStep('Request data', { propertyId, amount, payment_method_id, setup_future_usage });

    // Check if tenant has approved/housed application for this property
    // First check property_applications
    const { data: propertyApp } = await supabaseService
      .from('property_applications')
      .select('id, status')
      .eq('property_id', propertyId)
      .eq('tenant_id', user.id)
      .in('status', ['approved', 'housed'])
      .maybeSingle();

    let approvedApplication = propertyApp;

    // If not found, check marketplace_applications
    if (!approvedApplication) {
      const { data: marketplaceApp } = await supabaseService
        .from('marketplace_applications')
        .select('id, status')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .in('status', ['approved', 'housed'])
        .maybeSingle();
      
      approvedApplication = marketplaceApp;
    }

    if (!approvedApplication) {
      throw new Error('No approved application found for this property');
    }

    logStep('Approved application verified', { applicationId: approvedApplication.id, status: approvedApplication.status });

    // Get property details with simplified query
    const { data: property, error: propertyError } = await supabaseService
      .from('properties')
      .select('id, owner_id, portfolio_id, address')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      logStep('Property query error', propertyError);
      throw new Error('Property not found');
    }

    logStep('Property found', { propertyId: property.id, ownerId: property.owner_id });

    // Determine receiving account - check in order of precedence
    let receivingAccountId = null;
    
    // 1. Check property-specific payment settings
    const { data: propertyPaymentSettings } = await supabaseService
      .from('property_payment_settings')
      .select('receivables_connect_account_id')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (propertyPaymentSettings?.receivables_connect_account_id) {
      receivingAccountId = propertyPaymentSettings.receivables_connect_account_id;
      logStep('Using property-specific account', { accountId: receivingAccountId });
    }

    // 2. Check portfolio payment settings
    if (!receivingAccountId && property.portfolio_id) {
      const { data: portfolioPaymentSettings } = await supabaseService
        .from('portfolio_payment_settings')
        .select('connect_account_id')
        .eq('portfolio_id', property.portfolio_id)
        .eq('is_default', true)
        .maybeSingle();

      if (portfolioPaymentSettings?.connect_account_id) {
        receivingAccountId = portfolioPaymentSettings.connect_account_id;
        logStep('Using portfolio default account', { accountId: receivingAccountId });
      }
    }

    // 3. Check user's default Connect account
    if (!receivingAccountId) {
      const { data: defaultAccount } = await supabaseService
        .from('stripe_connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', property.owner_id)
        .eq('is_default', true)
        .eq('onboarding_complete', true)
        .maybeSingle();

      if (defaultAccount?.stripe_account_id) {
        receivingAccountId = defaultAccount.stripe_account_id;
        logStep('Using user global default account', { accountId: receivingAccountId });
      }
    }

    // If no receiving account, landlord hasn't set up payments
    if (!receivingAccountId) {
      throw new Error('Landlord has not set up payment receiving. Please contact your landlord.');
    }

    // Get tenant's Stripe customer ID from profiles table
    const { data: profileData } = await supabaseService
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = profileData?.stripe_customer_id;

    // Auto-create Stripe customer if missing
    if (!stripeCustomerId) {
      logStep('Creating new Stripe customer for tenant');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { 
          user_id: user.id,
          created_by: 'create-rent-payment'
        }
      });
      stripeCustomerId = customer.id;
      
      // Save to profile
      await supabaseService
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
      
      logStep('Stripe customer created and saved', { customerId: stripeCustomerId });
    }

    // Determine payment method type for fee calculation
    let paymentMethodType = 'card';
    if (payment_method_id) {
      const { data: paymentMethodData } = await supabaseService
        .from('payment_methods')
        .select('type')
        .eq('id', payment_method_id)
        .single();
      
      if (paymentMethodData) {
        paymentMethodType = paymentMethodData.type === 'us_bank_account' ? 'us_bank_account' : 'card';
      }
    }

    // Calculate fees using database function
    const { data: feeCalculation, error: feeError } = await supabaseService
      .rpc('calculate_platform_fees', {
        rent_amount: amount,
        payment_method: paymentMethodType
      });

    if (feeError) {
      logStep('Fee calculation error', feeError);
      throw new Error('Failed to calculate fees');
    }

    const feeData = Array.isArray(feeCalculation) ? feeCalculation[0] : feeCalculation;
    const totalAmount = Math.round(feeData.tenant_total * 100); // Convert to cents
    const tenantFeeAmount = Math.round(feeData.tenant_fee * 100);
    const platformFeeAmount = Math.round(feeData.platform_fee * 100);
    
    logStep('Fee calculation', {
      totalAmount,
      tenantFeeAmount,
      platformFeeAmount,
      paymentMethodType,
      receivingAccountId
    });

    // Create Payment Intent with both card and ACH options
    const paymentIntentData: any = {
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      // Support both card and ACH bank payments
      payment_method_types: ['card', 'us_bank_account'],
      confirm: false,
      return_url: `${req.headers.get('origin')}/tenant-dashboard`,
      metadata: {
        property_id: propertyId,
        tenant_id: user.id,
        due_date: dueDate || new Date().toISOString(),
      },
    };

    // If user wants to save the card for future use (one-time payment with save option)
    if (setup_future_usage) {
      paymentIntentData.setup_future_usage = 'off_session';
      logStep('Setting up future usage for card saving');
    }

    // Add payment method if provided
    if (payment_method_id) {
      const { data: paymentMethodData } = await supabaseService
        .from('payment_methods')
        .select('stripe_payment_method_id')
        .eq('id', payment_method_id)
        .single();
      
      if (paymentMethodData?.stripe_payment_method_id) {
        paymentIntentData.payment_method = paymentMethodData.stripe_payment_method_id;
      }
    }

    // Add application fee and transfer to landlord's Connect account
    paymentIntentData.application_fee_amount = tenantFeeAmount + platformFeeAmount;
    paymentIntentData.transfer_data = {
      destination: receivingAccountId,
    };
    paymentIntentData.metadata.tenant_fee_amount = tenantFeeAmount;
    paymentIntentData.metadata.platform_fee_amount = platformFeeAmount;
    paymentIntentData.metadata.payment_method_type = paymentMethodType;

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    logStep('Payment Intent created', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });

    // Record rent payment with calculated fees
    const { data: rentPayment } = await supabaseService
      .from('rent_payments')
      .insert({
        tenant_id: user.id,
        property_id: propertyId,
        amount: amount,
        original_rent_amount: amount,
        tenant_fee_amount: feeData.tenant_fee,
        platform_fee_amount: feeData.platform_fee,
        net_amount_to_pm: feeData.net_to_pm,
        due_date: dueDate || new Date().toISOString().split('T')[0],
        payment_date: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        payment_method: paymentMethodType,
        payment_source: 'tenant',
        receiving_account_id: receivingAccountId,
      })
      .select()
      .single();

    logStep('Rent payment recorded', { rentPaymentId: rentPayment?.id });

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        receivingAccount: 'custom',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('Error occurred', { error: (error instanceof Error ? error.message : String(error)) });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
