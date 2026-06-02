import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-RENT-AUTOPAY] ${step}${detailsStr}`);
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all autopay schedules due for payment today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from('autopay_schedules')
      .select(`
        *,
        properties!inner(id, owner_id, monthly_rent, address),
        profiles!tenant_id(first_name, last_name)
      `)
      .eq('status', 'active')
      .lte('next_payment_date', today);

    if (schedulesError) {
      throw new Error(`Failed to fetch autopay schedules: ${schedulesError.message}`);
    }

    logStep("Found schedules to process", { count: schedules?.length || 0 });

    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const schedule of schedules || []) {
      try {
        logStep("Processing schedule", { scheduleId: schedule.id, tenantId: schedule.tenant_id });

        // Get customer from Stripe
        const customers = await stripe.customers.list({
          metadata: { user_id: schedule.tenant_id },
          limit: 1
        });

        if (customers.data.length === 0) {
          throw new Error("Customer not found in Stripe");
        }

        const customerId = customers.data[0].id;

        // Calculate platform fees
        const rentAmount = Number(schedule.amount);
        const tenantFeeAmount = rentAmount * 0.01; // 1% tenant fee
        const platformFeeAmount = rentAmount * 0.01; // 1% platform fee
        const totalAmount = rentAmount + tenantFeeAmount;
        const netToPropertyManager = rentAmount - platformFeeAmount;

        // Get receiving Connect account (same logic as create-rent-payment)
        const { data: propertyWithPayments } = await supabaseClient
          .from('properties')
          .select(`
            *,
            property_payment_settings!left (receivables_connect_account_id),
            portfolios!left (
              portfolio_payment_settings!left (connect_account_id)
            )
          `)
          .eq('id', schedule.property_id)
          .single();

        let receivingAccountId = null;
        
        if (propertyWithPayments?.property_payment_settings?.receivables_connect_account_id) {
          receivingAccountId = propertyWithPayments.property_payment_settings.receivables_connect_account_id;
        } else if (propertyWithPayments?.portfolios?.portfolio_payment_settings?.connect_account_id) {
          receivingAccountId = propertyWithPayments.portfolios.portfolio_payment_settings.connect_account_id;
        } else {
          // Get user's default Connect account
          const { data: defaultAccount } = await supabaseClient
            .from('stripe_connect_accounts')
            .select('stripe_account_id')
            .eq('user_id', schedule.properties.owner_id)
            .eq('is_default', true)
            .eq('onboarding_complete', true)
            .single();

          if (defaultAccount) {
            receivingAccountId = defaultAccount.stripe_account_id;
          }
        }

        // Create Payment Intent
        const paymentIntentData: any = {
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'usd',
          customer: customerId,
          payment_method: schedule.payment_method_id,
          confirmation_method: 'automatic',
          confirm: true,
          off_session: true, // This indicates it's for a saved payment method
          metadata: {
            tenant_id: schedule.tenant_id,
            property_id: schedule.property_id,
            autopay_schedule_id: schedule.id,
            payment_type: 'rent_autopay'
          }
        };

        // Add application fee and transfer if receiving account is specified
        if (receivingAccountId) {
          paymentIntentData.application_fee_amount = Math.round(platformFeeAmount * 100);
          paymentIntentData.transfer_data = {
            destination: receivingAccountId,
          };
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        // Create rent payment record
        const { data: rentPayment, error: rentPaymentError } = await supabaseClient
          .from('rent_payments')
          .insert({
            property_id: schedule.property_id,
            tenant_id: schedule.tenant_id,
            amount: rentAmount,
            payment_date: today,
            payment_source: 'tenant',
            payment_method: 'autopay',
            payment_type: 'rent',
            status: 'completed',
            payment_status: 'succeeded',
            stripe_payment_intent_id: paymentIntent.id,
            original_rent_amount: rentAmount,
            tenant_fee_amount: tenantFeeAmount,
            platform_fee_amount: platformFeeAmount,
            net_amount_to_pm: netToPropertyManager,
            autopay_enabled: true,
            autopay_payment_method_id: schedule.payment_method_id,
            reference_number: `AUTO-${Date.now()}`
          })
          .select()
          .single();

        if (rentPaymentError) {
          throw new Error(`Failed to create rent payment: ${rentPaymentError.message}`);
        }

        // Create autopay transaction record
        await supabaseClient
          .from('autopay_transactions')
          .insert({
            autopay_schedule_id: schedule.id,
            rent_payment_id: rentPayment.id,
            stripe_payment_intent_id: paymentIntent.id,
            amount: totalAmount,
            status: 'succeeded',
            processed_at: new Date().toISOString()
          });

        // Update autopay schedule for next month
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        nextPaymentDate.setDate(schedule.autopay_day);

        await supabaseClient
          .from('autopay_schedules')
          .update({
            next_payment_date: nextPaymentDate.toISOString().split('T')[0],
            failure_count: 0,
            last_failure_reason: null
          })
          .eq('id', schedule.id);

        // Send success notifications
        await Promise.all([
          // Notify tenant
          supabaseClient
            .from('notifications')
            .insert({
              user_id: schedule.tenant_id,
              title: 'Rent Payment Processed',
              description: `Your rent payment of $${rentAmount.toFixed(2)} has been processed successfully via autopay.`,
              type: 'success'
            }),
          // Notify landlord
          supabaseClient
            .from('notifications')
            .insert({
              user_id: schedule.properties.owner_id,
              title: 'Rent Payment Received',
              description: `Rent payment of $${rentAmount.toFixed(2)} received from ${schedule.profiles.first_name} ${schedule.profiles.last_name} via autopay.`,
              type: 'success'
            })
        ]);

        successCount++;
        logStep("Payment processed successfully", { scheduleId: schedule.id, paymentIntentId: paymentIntent.id });

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
        logStep("Payment failed", { scheduleId: schedule.id, error: errorMessage });

        // Update failure count
        const newFailureCount = (schedule.failure_count || 0) + 1;
        const shouldPause = newFailureCount >= 3;

        await supabaseClient
          .from('autopay_schedules')
          .update({
            failure_count: newFailureCount,
            last_failure_reason: errorMessage,
            status: shouldPause ? 'failed' : 'active'
          })
          .eq('id', schedule.id);

        // Create failed transaction record
        await supabaseClient
          .from('autopay_transactions')
          .insert({
            autopay_schedule_id: schedule.id,
            amount: Number(schedule.amount),
            status: 'failed',
            failure_reason: errorMessage,
            processed_at: new Date().toISOString()
          });

        // Notify tenant of failure
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: schedule.tenant_id,
            title: 'Autopay Failed',
            description: `Your rent autopay failed: ${errorMessage}. ${shouldPause ? 'Autopay has been paused. Please update your payment method.' : 'We will retry the payment.'}`,
            type: 'error'
          });
      }

      processedCount++;
    }

    logStep("Processing complete", { processedCount, successCount, failureCount });

    return new Response(JSON.stringify({
      processed: processedCount,
      succeeded: successCount,
      failed: failureCount
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