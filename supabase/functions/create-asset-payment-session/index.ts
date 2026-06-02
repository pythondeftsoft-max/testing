import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ASSET-PAYMENT-SESSION] ${step}${detailsStr}`);
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

    const { 
      recurring_charge_id, 
      amount, 
      currency_code = 'USD',
      asset_id,
      payment_period_start,
      payment_period_end 
    } = await req.json();

    logStep("Request data", { 
      recurring_charge_id, 
      amount, 
      currency_code, 
      asset_id,
      user_id: user.id 
    });

    // Validate the charge belongs to this user
    const { data: charge, error: chargeError } = await supabaseClient
      .from('asset_recurring_charges')
      .select(`
        *,
        portfolio_assets(
          asset_name,
          portfolio_id,
          portfolios(manager_id)
        )
      `)
      .eq('id', recurring_charge_id)
      .eq('payer_user_id', user.id)
      .single();

    if (chargeError || !charge) {
      throw new Error("Invalid recurring charge or unauthorized access");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    logStep("Stripe customer", { customerId });

    // Create Stripe Checkout Session
    const origin = req.headers.get('origin') ?? 'https://kixsdhnfzjnxikmnbipi.lovable.app';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: currency_code.toLowerCase(),
            product_data: { 
              name: `Rent Payment - ${charge.portfolio_assets.asset_name}`,
              description: `${charge.charge_type} for ${payment_period_start} to ${payment_period_end}`
            },
            unit_amount: Math.round(Number(amount) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-confirmation?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/pay-rent?cancelled=true`,
      metadata: {
        recurring_charge_id,
        asset_id,
        user_id: user.id,
        payment_period_start: payment_period_start || '',
        payment_period_end: payment_period_end || ''
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('asset_payment_transactions')
      .insert({
        asset_id,
        payer_user_id: user.id,
        recurring_charge_id,
        amount: Number(amount),
        currency_code: currency_code.toUpperCase(),
        payment_method: 'stripe',
        stripe_session_id: session.id,
        status: 'pending',
        transaction_type: 'rent_payment',
        payment_period_start,
        payment_period_end,
        metadata: {
          stripe_customer_id: customerId,
          charge_type: charge.charge_type
        }
      })
      .select()
      .single();

    if (transactionError) {
      logStep("Error creating transaction", transactionError);
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    logStep("Transaction created", { transactionId: transaction.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      transaction_id: transaction.id
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