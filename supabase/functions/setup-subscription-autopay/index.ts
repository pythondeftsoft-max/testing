import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-SUBSCRIPTION-AUTOPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Setting up subscription autopay");

    const { payment_method_id, renewal_day, amount } = await req.json();
    
    if (!payment_method_id || !renewal_day || !amount) {
      throw new Error("Missing required parameters");
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Calculate next renewal date
    const nextRenewalDate = new Date();
    nextRenewalDate.setDate(renewal_day);
    if (nextRenewalDate.getDate() !== renewal_day || nextRenewalDate <= new Date()) {
      nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
      nextRenewalDate.setDate(renewal_day);
    }

    // Create or update autopay schedule
    const { data: autopaySchedule, error: autopayError } = await supabaseClient
      .from('subscription_autopay_schedules')
      .upsert({
        user_id: userData.user.id,
        payment_method_id,
        payment_method_type: 'card',
        renewal_day,
        amount,
        status: 'active',
        next_renewal_date: nextRenewalDate.toISOString().split('T')[0],
        failure_count: 0
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (autopayError) {
      logStep("Error creating autopay schedule", autopayError);
      throw new Error("Failed to create autopay schedule");
    }

    logStep("Subscription autopay setup successful", { 
      scheduleId: autopaySchedule.id,
      nextRenewalDate: nextRenewalDate.toISOString().split('T')[0]
    });

    return new Response(JSON.stringify({
      success: true,
      autopay_schedule: autopaySchedule,
      next_renewal_date: nextRenewalDate.toISOString().split('T')[0]
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