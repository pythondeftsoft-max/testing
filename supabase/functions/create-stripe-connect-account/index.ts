import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
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
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user profile to check existing Stripe account
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_account_type, stripe_onboarding_complete, first_name, last_name, company_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    let accountId = profile.stripe_account_id;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      logStep("Creating new Stripe Connect account");
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_profile: {
          name: profile.company_name || `${profile.first_name} ${profile.last_name}`.trim() || "Property Management",
          product_description: "Property rental and management services"
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: true }
        },
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      });

      accountId = account.id;
      logStep("Created Stripe Connect account", { accountId });

      // Update user profile with account ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          stripe_account_id: accountId,
          stripe_account_type: 'express',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile", updateError);
      }
    }

    // Get request origin for redirects
    const origin = req.headers.get("origin") || "https://your-domain.com";
    
    // Check if existing account is accessible and get status
    let account;
    let isOnboardingComplete = false;
    let needsNewAccount = false;
    
    try {
      account = await stripe.accounts.retrieve(accountId);
      isOnboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
      logStep("Retrieved existing account", { 
        accountId: account.id, 
        isComplete: isOnboardingComplete,
        platform: account.controller?.type 
      });

      // Sync existing account to stripe_connect_accounts table
      const accountName = account.business_profile?.name || 
                         profile.company_name || 
                         `${profile.first_name} ${profile.last_name}`.trim() || 
                         "Property Management";

      const { data: upsertResult, error: upsertError } = await supabaseClient
        .from('stripe_connect_accounts')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          account_name: accountName,
          business_type: account.business_type || null,
          business_name: accountName,
          email: user.email,
          onboarding_complete: isOnboardingComplete,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,stripe_account_id',
          ignoreDuplicates: false
        })
        .select('id, stripe_account_id')
        .single();

      if (upsertError) {
        logStep("Warning: Failed to sync account to database", upsertError);
      }

      logStep("Synced existing account to database", { accountId, accountName });
    } catch (error: any) {
      logStep("Error retrieving account or platform mismatch", { 
        error: (error instanceof Error ? error.message : String(error)),
        accountId 
      });
      
      // If account belongs to different platform or is inaccessible, create new Express account
      if ((error instanceof Error ? error.message : String(error))?.includes("platform is responsible") || 
          (error instanceof Error ? error.message : String(error))?.includes("account ID needs to be") ||
          (error instanceof Error ? error.message : String(error))?.includes("does not have access") ||
          (error instanceof Error ? error.message : String(error))?.includes("Application access may have been revoked") ||
          error.code === 'account_not_found') {
        needsNewAccount = true;
        logStep("Account inaccessible - creating new Express account");
        
        // Create new Express account
        const newAccount = await stripe.accounts.create({
          type: 'express',
          email: user.email,
          business_profile: {
            name: profile.company_name || `${profile.first_name} ${profile.last_name}`.trim() || "Property Management",
            product_description: "Property rental and management services"
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
            us_bank_account_ach_payments: { requested: true }
          },
          metadata: {
            user_id: user.id,
            user_email: user.email,
            replaced_account: accountId
          }
        });
        
        accountId = newAccount.id;
        account = newAccount;
        isOnboardingComplete = false;
        
        logStep("Created new Express account", { newAccountId: accountId });
        
        // Update profile with new account
        await supabaseClient
          .from('profiles')
          .update({ 
            stripe_account_id: accountId,
            stripe_account_type: 'express',
            stripe_onboarding_complete: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } else {
        throw error;
      }
    }

    // Get external accounts (bank accounts) for payout information
    let externalAccount = null;
    if (isOnboardingComplete && !needsNewAccount) {
      try {
        const externalAccounts = await stripe.accounts.listExternalAccounts(accountId, {
          object: 'bank_account',
          limit: 1
        });
        if (externalAccounts.data.length > 0) {
          const bankAccount = externalAccounts.data[0] as Stripe.BankAccount;
          externalAccount = {
            bank_name: bankAccount.bank_name,
            last4: bankAccount.last4,
            routing_number: bankAccount.routing_number?.slice(-4),
            account_holder_type: bankAccount.account_holder_type,
            status: bankAccount.status
          };
        }
      } catch (error) {
        logStep("Warning: Could not retrieve external accounts", error);
      }
    }

    // Create appropriate account link
    let accountLink;
    let isDashboardLink = false;
    
    if (isOnboardingComplete && !needsNewAccount) {
      // Create dashboard login link for completed accounts
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        accountLink = { url: loginLink.url };
        isDashboardLink = true;
        logStep("Created dashboard login link");
      } catch (dashboardError) {
        // Fallback to onboarding if dashboard fails
        logStep("Dashboard link failed, using onboarding", dashboardError);
        accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${origin}/payment-settings?refresh=true`,
          return_url: `${origin}/payment-settings?success=true`,
          type: 'account_onboarding',
        });
      }
    } else {
      // Create onboarding link for incomplete accounts
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/payment-settings?refresh=true`,
        return_url: `${origin}/payment-settings?success=true`,
        type: 'account_onboarding',
      });
    }

    logStep("Created account link", { 
      url: accountLink.url, 
      isDashboardLink,
      needsNewAccount
    });

    // Update onboarding status in profile
    if (isOnboardingComplete !== profile.stripe_onboarding_complete) {
      await supabaseClient
        .from('profiles')
        .update({ 
          stripe_onboarding_complete: isOnboardingComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // Sync account to stripe_connect_accounts table
    const accountName = account.business_profile?.name || 
                       profile.company_name || 
                       `${profile.first_name} ${profile.last_name}`.trim() || 
                       "Property Management";

    const { data: finalUpsertResult, error: finalUpsertError } = await supabaseClient
      .from('stripe_connect_accounts')
      .upsert({
        user_id: user.id,
        stripe_account_id: accountId,
        account_name: accountName,
        business_type: account.business_type || null,
        business_name: accountName,
        email: user.email,
        onboarding_complete: isOnboardingComplete,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        details_submitted: account.details_submitted || false,
        is_default: true, // Set as default for now, users can change later
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,stripe_account_id',
        ignoreDuplicates: false
      })
      .select('id, stripe_account_id')
      .single();

    if (finalUpsertError) {
      logStep("Warning: Failed to sync final account to database", finalUpsertError);
    }

    logStep("Synced account to stripe_connect_accounts table", { accountId, accountName });

    return new Response(JSON.stringify({
      account_id: accountId,
      onboarding_url: accountLink.url,
      onboarding_complete: isOnboardingComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      business_profile: {
        name: account.business_profile?.name,
        url: account.business_profile?.url,
        product_description: account.business_profile?.product_description
      },
      external_account: externalAccount,
      payout_schedule: {
        delay_days: account.settings?.payouts?.debit_negative_balances ? 'auto' : account.settings?.payouts?.schedule?.delay_days || 'standard',
        interval: account.settings?.payouts?.schedule?.interval || 'daily'
      },
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || []
      },
      is_dashboard_link: isDashboardLink
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