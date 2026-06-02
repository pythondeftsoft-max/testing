import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  tenant: {
    name: "Tenant Priority Filing",
    price: 1500, // $15.00 in cents
    features: [
      "Unlimited property applications",
      "Priority placement in application queue",
      "Auto-cancels when matched successfully",
      "Enhanced profile visibility",
      "Priority customer support"
    ]
  },
  landlord: {
    name: "OpenKey Landlord Per-Unit", 
    price: 143, // $1.43 in cents per unit
    features: [
      "Per-unit pricing for properties over 10",
      "Request tenant functionality",
      "Cash flow tracking widgets",
      "Portfolio metrics dashboard",
      "Advanced property analytics",
      "Tenant application management"
    ]
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const requestBody = await req.json();
    const { role, quantity } = requestBody;
    logStep("Request body parsed", { role, quantity, fullBody: requestBody });
    
    if (!role || !['tenant', 'landlord'].includes(role)) {
      logStep("Invalid role provided", { role, validRoles: ['tenant', 'landlord'] });
      throw new Error("Invalid role. Must be 'tenant' or 'landlord'");
    }

    // Validate user profile and role consistency
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('user_type, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logStep("Profile fetch error", { profileError, profile });
      throw new Error(`User profile not found: ${profileError?.message || 'No profile data'}`);
    }

    // Check if user is a system admin using secure RPC
    const { data: isSystemAdmin } = await supabaseService.rpc('is_admin', { user_id: user.id });

    // Check role consistency with user type (admins can subscribe to any role)
    const validRoleMapping = {
      'tenant': ['tenant', 'individual_owner'], // individual_owner can be tenant too
      'landlord': ['individual_owner', 'property_manager', 'admin', 'landlord']
    };

    logStep("Validating role consistency", {
      requestedRole: role, 
      userType: profile.user_type, 
      validTypes: validRoleMapping[role as keyof typeof validRoleMapping] 
    });

    // System admins bypass role validation
    if (!isSystemAdmin && !validRoleMapping[role as keyof typeof validRoleMapping].includes(profile.user_type)) {
      const errorMsg = `Cannot create ${role} subscription for user type ${profile.user_type}. Valid types for ${role}: ${validRoleMapping[role as keyof typeof validRoleMapping].join(', ')}`;
      logStep("Role validation failed", { errorMsg });
      throw new Error(errorMsg);
    }

    const plan = SUBSCRIPTION_PLANS[role as keyof typeof SUBSCRIPTION_PLANS];
    logStep("Plan selected and role validated", { 
      role, 
      userType: profile.user_type, 
      plan: plan.name 
    });

    // For landlords, calculate billable units if not provided
    let subscriptionQuantity = quantity || 1;
    if (role === 'landlord' && !quantity) {
      const { data: propertyLimit } = await supabaseService
        .rpc('check_property_limit_exceeded', { landlord_id: user.id });
      
      if (propertyLimit && propertyLimit.length > 0) {
        const limit = propertyLimit[0];
        subscriptionQuantity = Math.max(1, limit.billable_units); // At least 1 unit
        logStep("Calculated landlord units", { 
          currentProperties: limit.current_properties,
          billableUnits: limit.billable_units,
          quantity: subscriptionQuantity
        });
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          role: role
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });

      // Update profile with Stripe customer ID using service role
      await supabaseService
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      
      logStep("Profile updated with Stripe customer ID", { customerId });
    }

    // Check for existing active subscription using our database instead of Stripe
    // This prevents issues with stale Stripe data
    const { data: existingSubscriptions } = await supabaseService
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', role)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString());

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      logStep("Active subscription already exists in database", { 
        subscriptionId: existingSubscriptions[0].stripe_subscription_id 
      });
      return new Response(JSON.stringify({ 
        error: "User already has an active subscription" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Also check Stripe for safety, but don't block if we find stale data
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (stripeSubscriptions.data.length > 0) {
      logStep("Found active subscription in Stripe but not in database - syncing", { 
        subscriptionId: stripeSubscriptions.data[0].id 
      });
      
      // Sync the subscription to our database
      const subscription = stripeSubscriptions.data[0];
      await supabaseService
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0]?.price?.id,
          role: role,
          plan_type: role === 'tenant' ? 'tenant_pro' : 'landlord_starter',
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { 
          onConflict: 'stripe_subscription_id' 
        });

      return new Response(JSON.stringify({ 
        error: "User already has an active subscription (synced from Stripe)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create the product and price if they don't exist
    let product;
    try {
      const products = await stripe.products.list({ limit: 100 });
      product = products.data.find(p => p.name === plan.name);
      
      if (!product) {
        product = await stripe.products.create({
          name: plan.name,
          description: `${plan.name} - ${plan.features.join(', ')}`,
          metadata: { role: role }
        });
        logStep("Product created", { productId: product.id });
      }
    } catch (error) {
      logStep("Error managing product", { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }

    // Create or find the price
    let price;
    try {
      const prices = await stripe.prices.list({ 
        product: product.id,
        active: true,
        limit: 1
      });
      
      if (prices.data.length > 0) {
        price = prices.data[0];
      } else {
        price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: plan.price,
          recurring: { interval: 'month' },
          product: product.id,
          metadata: { role: role }
        });
        logStep("Price created", { priceId: price.id });
      }
    } catch (error) {
      logStep("Error managing price", { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }

    // Create checkout session - Use the request origin to ensure users return to the same instance
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split('/')[0] + '//' + req.headers.get("referer")?.split('/')[2] || "https://b3ed1340-284d-495e-8589-41c8e94a2dae.lovableproject.com";
    logStep("Using origin for checkout", { origin });
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: subscriptionQuantity,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?subscription=success&role=${role}`,
      cancel_url: `${origin}/dashboard?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        role: role
      }
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url 
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error);
    logStep("ERROR in create-subscription-checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});