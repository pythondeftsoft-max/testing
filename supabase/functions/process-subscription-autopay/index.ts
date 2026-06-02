import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-SUBSCRIPTION-AUTOPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription autopay processing");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get due subscription renewals (today or overdue)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dueRenewals, error: renewalsError } = await supabaseClient
      .from('subscription_autopay_schedules')
      .select(`
        *,
        subscriptions!inner(
          id,
          user_id,
          plan_type,
          stripe_customer_id,
          status
        )
      `)
      .eq('status', 'active')
      .lte('next_renewal_date', today)
      .lt('failure_count', 3); // Don't process if failed too many times

    if (renewalsError) {
      throw new Error(`Failed to fetch due renewals: ${renewalsError.message}`);
    }

    logStep("Found due renewals", { count: dueRenewals?.length || 0 });

    const results = [];

    for (const renewal of dueRenewals || []) {
      try {
        logStep("Processing renewal", { scheduleId: renewal.id, userId: renewal.subscriptions.user_id });

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(renewal.amount * 100), // Convert to cents
          currency: 'usd',
          customer: renewal.subscriptions.stripe_customer_id,
          payment_method: renewal.payment_method_id,
          confirm: true,
          return_url: `${req.headers.get("origin") || "https://app.example.com"}/dashboard`,
          metadata: {
            subscription_id: renewal.subscription_id,
            autopay_schedule_id: renewal.id,
            type: 'subscription_renewal'
          }
        });

        // Record transaction
        const { error: transactionError } = await supabaseClient
          .from('subscription_autopay_transactions')
          .insert({
            autopay_schedule_id: renewal.id,
            amount: renewal.amount,
            status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
            stripe_payment_intent_id: paymentIntent.id,
            processed_at: new Date().toISOString()
          });

        if (transactionError) {
          logStep("Error recording transaction", transactionError);
        }

        if (paymentIntent.status === 'succeeded') {
          // Update subscription period
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(renewal.renewal_day);

          const { error: updateError } = await supabaseClient
            .from('subscription_autopay_schedules')
            .update({
              next_renewal_date: nextMonth.toISOString().split('T')[0],
              failure_count: 0,
              last_failure_reason: null
            })
            .eq('id', renewal.id);

          // Update subscription
          const nextPeriodEnd = new Date();
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

          await supabaseClient
            .from('subscriptions')
            .update({
              current_period_end: nextPeriodEnd.toISOString(),
              autopay_failures_count: 0,
              last_autopay_attempt: new Date().toISOString()
            })
            .eq('id', renewal.subscription_id);

          logStep("Renewal successful", { paymentIntentId: paymentIntent.id });
          results.push({ success: true, scheduleId: renewal.id, paymentIntentId: paymentIntent.id });

        } else {
          // Handle failure
          await supabaseClient
            .from('subscription_autopay_schedules')
            .update({
              failure_count: renewal.failure_count + 1,
              last_failure_reason: `Payment failed: ${paymentIntent.status}`
            })
            .eq('id', renewal.id);

          await supabaseClient
            .from('subscriptions')
            .update({
              autopay_failures_count: (renewal.subscriptions.autopay_failures_count || 0) + 1,
              last_autopay_attempt: new Date().toISOString()
            })
            .eq('id', renewal.subscription_id);

          logStep("Renewal failed", { paymentIntentId: paymentIntent.id, status: paymentIntent.status });
          results.push({ success: false, scheduleId: renewal.id, error: `Payment failed: ${paymentIntent.status}` });
        }

      } catch (error) {
        logStep("Error processing renewal", { scheduleId: renewal.id, error: (error instanceof Error ? error.message : String(error)) });
        
        // Update failure count
        await supabaseClient
          .from('subscription_autopay_schedules')
          .update({
            failure_count: renewal.failure_count + 1,
            last_failure_reason: (error instanceof Error ? error.message : String(error))
          })
          .eq('id', renewal.id);

        results.push({ success: false, scheduleId: renewal.id, error: (error instanceof Error ? error.message : String(error)) });
      }
    }

    logStep("Subscription autopay processing completed", { 
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
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