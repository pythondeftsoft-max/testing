import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-RENT-AUTOPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    if (!user) throw new Error("User not authenticated");

    const { property_id, payment_method_id, autopay_day, amount } = await req.json();
    logStep("Request body", { property_id, payment_method_id, autopay_day, amount });

    // Validate inputs
    if (!property_id || !payment_method_id || !autopay_day || !amount) {
      throw new Error("Missing required fields");
    }

    if (autopay_day < 1 || autopay_day > 28) {
      throw new Error("Autopay day must be between 1 and 28");
    }

    // Verify user has access to the property (either tenant or owner)
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('owner_id, monthly_rent')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      throw new Error("Property not found");
    }

    // Check if user has an approved application for this property or is the owner
    const { data: application } = await supabaseClient
      .from('property_applications')
      .select('status')
      .eq('property_id', property_id)
      .eq('tenant_id', user.id)
      .eq('status', 'approved')
      .single();

    if (!application && property.owner_id !== user.id) {
      throw new Error("Not authorized to set up autopay for this property");
    }

    // Verify payment method belongs to user
    const { data: paymentMethod, error: pmError } = await supabaseClient
      .from('payment_methods')
      .select('stripe_payment_method_id, type')
      .eq('id', payment_method_id)
      .eq('user_id', user.id)
      .single();

    if (pmError || !paymentMethod) {
      throw new Error("Payment method not found");
    }

    // Calculate next payment date
    const now = new Date();
    const nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), autopay_day);
    
    // If the autopay day has already passed this month, schedule for next month
    if (nextPaymentDate <= now) {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Create or update autopay schedule
    const autopayData = {
      tenant_id: user.id,
      property_id,
      payment_method_id: paymentMethod.stripe_payment_method_id,
      payment_method_type: paymentMethod.type,
      autopay_day,
      amount,
      status: 'active',
      next_payment_date: nextPaymentDate.toISOString().split('T')[0],
      failure_count: 0,
      last_failure_reason: null
    };

    const { data: schedule, error: scheduleError } = await supabaseClient
      .from('autopay_schedules')
      .upsert(autopayData, { onConflict: 'tenant_id,property_id' })
      .select()
      .single();

    if (scheduleError) {
      logStep("Error creating autopay schedule", scheduleError);
      throw new Error(`Failed to create autopay schedule: ${scheduleError.message}`);
    }

    logStep("Autopay schedule created", { scheduleId: schedule.id });

    // Send notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Autopay Set Up Successfully',
        description: `Rent autopay has been set up for your property. Next payment scheduled for ${nextPaymentDate.toLocaleDateString()}.`,
        type: 'success'
      });

    return new Response(JSON.stringify({
      schedule: {
        id: schedule.id,
        next_payment_date: schedule.next_payment_date,
        autopay_day: schedule.autopay_day,
        amount: schedule.amount,
        status: schedule.status
      }
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