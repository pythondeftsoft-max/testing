import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import Stripe from 'https://esm.sh/stripe@17.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authHeader = req.headers.get('Authorization') || '';

    let supabaseClient;

    // Try user auth first
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    
    if (user) {
      supabaseClient = userClient;
      console.log(`Authenticated as user ${user.id}`);
    } else if (serviceRoleKey) {
      // Fallback to service role for programmatic access
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey
      );
      console.log('Using service role authentication (no user session)');
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Syncing plan ${plan_id} to Stripe`);

    // Fetch plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('Plan fetch error:', planError);
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-11-20.acacia',
    });

    let stripeProductId = plan.stripe_product_id;
    let stripePriceId = plan.stripe_price_id;

    // Create or update Stripe product
    if (stripeProductId) {
      console.log(`Updating Stripe product ${stripeProductId}`);
      await stripe.products.update(stripeProductId, {
        name: plan.name,
        description: plan.description || undefined,
        metadata: {
          plan_id: plan.id,
          role: plan.role,
          target_audience: plan.target_audience || '',
        },
      });
    } else {
      console.log('Creating new Stripe product');
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || undefined,
        metadata: {
          plan_id: plan.id,
          role: plan.role,
          target_audience: plan.target_audience || '',
        },
      });
      stripeProductId = product.id;
      console.log(`Created Stripe product ${stripeProductId}`);
    }

    // Create or update Stripe price
    if (plan.price > 0) {
      console.log('Creating new Stripe price');
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: plan.price,
        currency: plan.currency.toLowerCase(),
        recurring: {
          interval: plan.billing_interval as 'month' | 'year',
        },
        metadata: {
          plan_id: plan.id,
        },
      });
      stripePriceId = price.id;
      console.log(`Created Stripe price ${stripePriceId}`);

      // Deactivate old prices
      if (plan.stripe_price_id && plan.stripe_price_id !== stripePriceId) {
        try {
          await stripe.prices.update(plan.stripe_price_id, { active: false });
          console.log(`Deactivated old price ${plan.stripe_price_id}`);
        } catch (e) {
          console.warn('Failed to deactivate old price:', e);
        }
      }
    }

    // Update database with Stripe IDs
    const { error: updateError } = await supabaseClient
      .from('subscription_plans')
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        stripe_synced_at: new Date().toISOString(),
      })
      .eq('id', plan_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update plan with Stripe IDs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully synced plan ${plan_id} to Stripe`);

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
