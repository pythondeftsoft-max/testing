import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-RENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Use service role key for database updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) {
      throw new Error("Missing payment_intent_id");
    }
    logStep("Payment intent ID received", { payment_intent_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ['latest_charge.payment_method']
    });
    logStep("Payment intent retrieved", { status: paymentIntent.status });

    // Determine payment method from Stripe
    let paymentMethod = 'card'; // default
    if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'object') {
      const charge = paymentIntent.latest_charge as any;
      if (charge.payment_method && typeof charge.payment_method === 'object') {
        const method = charge.payment_method as any;
        if (method.type === 'us_bank_account') {
          paymentMethod = 'bank_transfer';
        } else if (method.type === 'card') {
          paymentMethod = 'card';
        } else {
          paymentMethod = method.type || 'card';
        }
      }
    }
    logStep("Payment method detected", { paymentMethod });

    // Update payment record based on status
    let updateData: any = {
      payment_status: paymentIntent.status,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    };

    if (paymentIntent.status === 'succeeded') {
      updateData.status = 'completed';
      updateData.payment_date = new Date().toISOString().split('T')[0];
      logStep("Payment succeeded");
    } else if (paymentIntent.status === 'payment_failed') {
      updateData.status = 'failed';
      logStep("Payment failed");
    }

    const { data: paymentData, error: updateError } = await supabaseClient
      .from('rent_payments')
      .update(updateData)
      .eq('stripe_payment_intent_id', payment_intent_id)
      .eq('tenant_id', user.id)
      .select('*, properties(address, owner_id)')
      .single();

    if (updateError) {
      logStep("Error updating payment", updateError);
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }
    logStep("Payment record updated");

    // Send notifications and record platform transaction if payment succeeded
    if (paymentIntent.status === 'succeeded' && paymentData) {
      // Record platform transaction for Connect payment
      if (paymentData.platform_fee_amount) {
        await supabaseClient.from('platform_transactions').insert({
          payment_id: paymentData.id,
          property_id: paymentData.property_id,
          tenant_id: paymentData.tenant_id,
          property_manager_id: paymentData.properties.owner_id,
          stripe_payment_intent_id: payment_intent_id,
          transaction_type: 'rent_payment',
          gross_amount: (paymentData.original_rent_amount || paymentData.amount) + paymentData.tenant_fee_amount,
          tenant_fee: paymentData.tenant_fee_amount,
          platform_fee: paymentData.platform_fee_amount,
          net_to_pm: paymentData.net_amount_to_pm
        });
        logStep("Platform transaction recorded");
      }

      // Notify tenant
      await supabaseClient.from('notifications').insert({
        user_id: user.id,
        title: 'Payment Confirmed',
        description: `Your rent payment of $${paymentData.amount} has been successfully processed.`,
        type: 'success'
      });

      // Notify landlord
      if (paymentData.properties?.owner_id) {
        await supabaseClient.from('notifications').insert({
          user_id: paymentData.properties.owner_id,
          title: 'Payment Received',
          description: `Rent payment of $${paymentData.amount} received for ${paymentData.properties.address}.`,
          type: 'success'
        });
      }
      logStep("Notifications sent");
    }

    return new Response(JSON.stringify({
      success: true,
      payment_status: paymentIntent.status,
      payment_data: paymentData
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