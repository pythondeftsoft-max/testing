import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "../_shared/resend.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 10;
const BATCH_SIZE = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const signupSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Decrypt password helper
    const decryptPassword = (encrypted: string): string => {
      const keyBytes = new TextEncoder().encode(signupSecret);
      const decoded = atob(encrypted);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      const result = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return new TextDecoder().decode(result);
    };

    // Get pending signups that haven't exceeded retry limit
    const { data: pendingSignups, error: fetchError } = await supabase
      .from('pending_signups')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Error fetching pending signups:', fetchError);
      throw fetchError;
    }

    if (!pendingSignups || pendingSignups.length === 0) {
      console.log('No pending signups to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending signups' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingSignups.length} pending signups`);

    let processed = 0;
    let failed = 0;

    for (const signup of pendingSignups) {
      try {
        // Mark as processing
        await supabase
          .from('pending_signups')
          .update({ 
            status: 'processing', 
            last_attempt_at: new Date().toISOString() 
          })
          .eq('id', signup.id);

        // Decrypt password
        const password = decryptPassword(signup.encrypted_password);

        // Create user via Admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: signup.email,
          password: password,
          email_confirm: true, // Auto-confirm since we'll email them
          user_metadata: signup.signup_metadata || {},
        });

        if (authError) {
          // Check if user already exists
          if (authError.message?.includes('already been registered') || 
              authError.message?.includes('already exists')) {
            console.log(`User ${signup.email} already exists, marking as completed`);
            await supabase
              .from('pending_signups')
              .update({ 
                status: 'completed', 
                completed_at: new Date().toISOString(),
                encrypted_password: null, // Clear sensitive data
                error_message: 'User already existed'
              })
              .eq('id', signup.id);
            processed++;
            continue;
          }
          throw authError;
        }

        console.log(`Successfully created user: ${signup.email}`);

        // Mark as completed and clear sensitive data
        console.log(`Marking ${signup.email} as completed...`);
        const { error: updateError } = await supabase
          .from('pending_signups')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            encrypted_password: null, // Security: delete password immediately
          })
          .eq('id', signup.id);

        if (updateError) {
          console.error(`Failed to mark ${signup.email} as completed:`, updateError);
          // Retry once
          const { error: retryError } = await supabase
            .from('pending_signups')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString(),
              encrypted_password: null,
            })
            .eq('id', signup.id);
          
          if (retryError) {
            console.error(`Retry also failed for ${signup.email}:`, retryError);
          } else {
            console.log(`Retry succeeded for ${signup.email}`);
          }
        } else {
          console.log(`Successfully marked ${signup.email} as completed`);
        }

        // Send welcome email if Resend is configured
        if (resendApiKey) {
          try {
            const resend = new Resend(resendApiKey);
            const firstName = signup.signup_metadata?.first_name || 'there';
            const userType = signup.signup_metadata?.user_type || 'user';
            
            await resend.emails.send({
              from: 'OpenKey Housing <no-reply@openkeyhousing.com>',
              to: [signup.email],
              subject: '🎉 Your OpenKey Account is Ready!',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
                  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">🏠 Welcome to OpenKey!</h1>
                    </div>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                      Hi ${firstName},
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                      Great news! Your OpenKey ${userType === 'landlord' ? 'Landlord' : 'Tenant'} account has been created successfully.
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                      You can now sign in and ${userType === 'landlord' ? 'start managing your properties' : 'browse available properties'}.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://openkey-housing-hub.lovable.app/auth" 
                         style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Sign In Now
                      </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                      If you didn't create this account, please ignore this email or contact our support team.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} OpenKey Housing. All rights reserved.
                    </p>
                  </div>
                </body>
                </html>
              `,
            });
            console.log(`Welcome email sent to ${signup.email}`);
          } catch (emailError) {
            console.error(`Failed to send welcome email to ${signup.email}:`, emailError);
            // Don't fail the signup if email fails
          }
        }

        processed++;

      } catch (error: any) {
        console.error(`Failed to process signup for ${signup.email}:`, error);
        
        // Increment retry count and mark back as pending
        await supabase
          .from('pending_signups')
          .update({ 
            status: 'pending',
            retry_count: (signup.retry_count || 0) + 1,
            error_message: (error instanceof Error ? error.message : String(error)) || 'Unknown error',
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', signup.id);

        failed++;
      }
    }

    // Clean up expired signups
    const { error: cleanupError } = await supabase
      .from('pending_signups')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cleanupError) {
      console.error('Error cleaning up expired signups:', cleanupError);
    }

    // Also clean up completed signups older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('pending_signups')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', sevenDaysAgo);

    console.log(`Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        failed,
        message: `Processed ${processed} signups, ${failed} failed` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Process pending signups error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) || 'Processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
