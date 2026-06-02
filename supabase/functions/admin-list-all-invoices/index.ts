import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-LIST-ALL-INVOICES] ${step}${detailsStr}`);
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

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check admin status
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.user_type !== 'admin') {
      throw new Error("Admin access required");
    }

    const { limit = 100, starting_after } = await req.json();

    logStep("Admin verified, fetching all invoices", { limit });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch all invoices (not limited to a specific customer)
    const invoicesParams: any = {
      limit: Math.min(limit, 100),
    };
    
    if (starting_after) {
      invoicesParams.starting_after = starting_after;
    }

    const invoices = await stripe.invoices.list(invoicesParams);

    // Get all customer IDs to fetch subscription details
    const customerIds = [...new Set(invoices.data.map(inv => inv.customer).filter(Boolean))];
    
    // Fetch subscriptions from database to get user info
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id, user_id, profiles(full_name, email)')
      .in('stripe_customer_id', customerIds);

    if (subsError) {
      logStep("Warning: Could not fetch subscription details", subsError);
    }

    // Create a map of customer IDs to user info
    const customerMap = new Map();
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (sub.stripe_customer_id) {
          customerMap.set(sub.stripe_customer_id, {
            user_id: sub.user_id,
            user_name: sub.profiles?.full_name || 'Unknown',
            user_email: sub.profiles?.email || 'Unknown',
          });
        }
      });
    }

    const formattedInvoices = invoices.data.map(invoice => {
      const customerInfo = customerMap.get(invoice.customer as string) || {};
      const subscriptionItem = invoice.lines.data[0];
      
      return {
        id: invoice.id,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        due_date: invoice.due_date,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        number: invoice.number,
        customer_id: invoice.customer,
        customer_email: invoice.customer_email,
        user_name: customerInfo.user_name,
        user_email: customerInfo.user_email,
        user_id: customerInfo.user_id,
        plan_name: subscriptionItem?.description || 'Unknown',
        period_start: invoice.period_start,
        period_end: invoice.period_end,
      };
    });

    logStep("All invoices retrieved", { count: formattedInvoices.length });

    return new Response(JSON.stringify({ 
      invoices: formattedInvoices,
      has_more: invoices.has_more 
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
