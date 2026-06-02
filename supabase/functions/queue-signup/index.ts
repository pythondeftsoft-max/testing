import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, signupMetadata } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple encryption for password storage (XOR with secret + base64)
    // This is temporary storage - password is deleted immediately after account creation
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret";
    const encryptPassword = (pwd: string): string => {
      const encoded = new TextEncoder().encode(pwd);
      const keyBytes = new TextEncoder().encode(secret);
      const result = new Uint8Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) {
        result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
      }
      return btoa(String.fromCharCode(...result));
    };

    const encryptedPassword = encryptPassword(password);

    // Create Supabase client with service role (to bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in pending_signups
    const { data: existing } = await supabase
      .from('pending_signups')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .single();

    if (existing) {
      // Update existing pending signup with new data
      const { error: updateError } = await supabase
        .from('pending_signups')
        .update({
          encrypted_password: encryptedPassword,
          signup_metadata: signupMetadata || {},
          retry_count: 0,
          error_message: null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating pending signup:', updateError);
        throw updateError;
      }

      console.log(`Updated existing pending signup for ${email}`);
    } else {
      // Insert new pending signup
      const { error: insertError } = await supabase
        .from('pending_signups')
        .insert({
          email: email.toLowerCase().trim(),
          encrypted_password: encryptedPassword,
          signup_metadata: signupMetadata || {},
          status: 'pending',
          retry_count: 0,
        });

      if (insertError) {
        console.error('Error inserting pending signup:', insertError);
        throw insertError;
      }

      console.log(`Queued new signup for ${email}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Signup queued successfully. You will receive an email when your account is ready.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Queue signup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) || 'Failed to queue signup' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
