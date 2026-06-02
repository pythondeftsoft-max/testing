import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-SUBSCRIPTION-CANCELLATIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Initialize Supabase with service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get pending cancellation requests
    const { data: requests, error: requestsError } = await supabaseService
      .from('subscription_cancellation_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 at a time

    if (requestsError) {
      logStep("Error fetching cancellation requests", { error: requestsError });
      throw new Error(`Failed to fetch requests: ${requestsError.message}`);
    }

    if (!requests || requests.length === 0) {
      logStep("No pending cancellation requests found");
      return new Response(JSON.stringify({ 
        message: "No pending cancellation requests",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Processing cancellation requests", { count: requests.length });

    let processedCount = 0;
    let errorCount = 0;

    // Process each request
    for (const request of requests) {
      try {
        logStep("Processing request", { 
          requestId: request.id,
          tenantId: request.tenant_id 
        });

        // Get tenant's active subscriptions
        const { data: subscriptions, error: subscriptionsError } = await supabaseService
          .from('subscriptions')
          .select('*')
          .eq('user_id', request.tenant_id)
          .eq('role', 'tenant')
          .eq('status', 'active');

        if (subscriptionsError) {
          throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
        }

        if (!subscriptions || subscriptions.length === 0) {
          logStep("No active subscriptions found for tenant", { 
            tenantId: request.tenant_id 
          });
          
          // Mark request as processed since there's nothing to cancel
          await supabaseService
            .from('subscription_cancellation_requests')
            .update({ 
              status: 'processed',
              processed_at: new Date().toISOString()
            })
            .eq('id', request.id);

          processedCount++;
          continue;
        }

        // Cancel subscriptions in Stripe
        for (const subscription of subscriptions) {
          if (subscription.stripe_subscription_id) {
            try {
              logStep("Cancelling Stripe subscription", { 
                subscriptionId: subscription.stripe_subscription_id 
              });

              await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
              
              // Update subscription status in database
              await supabaseService
                .from('subscriptions')
                .update({ 
                  status: 'canceled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id);

              logStep("Successfully cancelled subscription", { 
                subscriptionId: subscription.stripe_subscription_id
              });
            } catch (stripeError) {
              logStep("Error cancelling subscription in Stripe", { 
                subscriptionId: subscription.stripe_subscription_id,
                error: (stripeError instanceof Error ? stripeError.message : String(stripeError)) 
              });
              // Continue with other subscriptions
            }
          }
        }

        // Mark request as processed
        await supabaseService
          .from('subscription_cancellation_requests')
          .update({ 
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', request.id);

        processedCount++;
        logStep("Request processed successfully", { requestId: request.id });

      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
        
        logStep("Error processing request", { 
          requestId: request.id,
          error: errorMessage 
        });

        // Update request with error status
        await supabaseService
          .from('subscription_cancellation_requests')
          .update({ 
            status: 'failed',
            last_error: errorMessage,
            retry_count: (request.retry_count || 0) + 1,
            processed_at: new Date().toISOString()
          })
          .eq('id', request.id);
      }
    }

    logStep("Batch processing completed", { 
      total: requests.length,
      processed: processedCount,
      errors: errorCount 
    });

    return new Response(JSON.stringify({ 
      message: "Batch processing completed",
      total_requests: requests.length,
      processed: processedCount,
      errors: errorCount
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