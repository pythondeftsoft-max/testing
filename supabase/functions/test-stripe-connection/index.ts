import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          connected: false,
          error: 'STRIPE_SECRET_KEY is not configured',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Test the connection by retrieving account details
    const account = await stripe.account.retrieve();

    // Check account capabilities
    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;
    const detailsSubmitted = account.details_submitted || false;

    // Get capabilities status
    const capabilities = {
      card_payments: account.capabilities?.card_payments || 'inactive',
      transfers: account.capabilities?.transfers || 'inactive',
      link_payments: account.capabilities?.link_payments || 'inactive',
    };

    return new Response(
      JSON.stringify({
        connected: true,
        accountId: account.id,
        email: account.email || 'Not provided',
        businessName: account.business_profile?.name || 'Not set',
        country: account.country,
        currency: account.default_currency?.toUpperCase() || 'USD',
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        capabilities,
        accountType: account.type,
        created: account.created ? new Date(account.created * 1000).toISOString() : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error testing Stripe connection:', error);
    
    return new Response(
      JSON.stringify({
        connected: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to connect to Stripe',
        errorType: error.type || 'unknown',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
