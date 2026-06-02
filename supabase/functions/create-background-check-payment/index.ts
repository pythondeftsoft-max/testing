import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [CREATE-BG-CHECK-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting background check payment creation");

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { tenantId, quantity = 1 } = await req.json();
    
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    logStep("Request parsed", { tenantId, quantity });

    // Get user email for Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || user.email;

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    logStep("Stripe initialized");

    // Find or create Stripe customer
    let customerId: string;
    
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create or get the background check product
    let product: Stripe.Product;
    const products = await stripe.products.search({
      query: "active:'true' AND metadata['type']:'background_check'",
      limit: 1,
    });

    if (products.data.length > 0) {
      product = products.data[0];
      logStep("Found existing background check product", { productId: product.id });
    } else {
      product = await stripe.products.create({
        name: 'Background Check',
        description: 'Comprehensive tenant background screening',
        metadata: {
          type: 'background_check',
        },
      });
      logStep("Created new background check product", { productId: product.id });
    }

    // Create or get the price
    let price: Stripe.Price;
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 1,
    });

    if (prices.data.length > 0) {
      price = prices.data[0];
      logStep("Found existing price", { priceId: price.id });
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 2500, // $25.00 in cents
        currency: 'usd',
        metadata: {
          type: 'background_check',
        },
      });
      logStep("Created new price", { priceId: price.id });
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('?')[0] || 'https://kixsdhnfzjnxikmnbipi.supabase.co';
    logStep("Determined origin for redirects", { origin });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/landlord-subscriptions?bg_check_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/landlord-subscriptions?bg_check_cancelled=true`,
      metadata: {
        user_id: user.id,
        tenant_id: tenantId,
        type: 'background_check',
        quantity: quantity.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in create-background-check-payment", { 
      message: (error instanceof Error ? error.message : String(error)),
      stack: error.stack 
    });
    
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
