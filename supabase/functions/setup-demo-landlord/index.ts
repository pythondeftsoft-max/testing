import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Set up demo Stripe account for the property owner
    const { error } = await supabaseService
      .from('profiles')
      .update({
        stripe_account_id: 'acct_demo_landlord',
        stripe_onboarding_complete: true
      })
      .eq('id', 'b7843bb0-64bd-4ff3-9392-b73c111832ce');

    if (error) {
      throw new Error(`Failed to update profile: ${(error instanceof Error ? error.message : String(error))}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Demo landlord Stripe account set up successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: (error instanceof Error ? error.message : String(error)) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});