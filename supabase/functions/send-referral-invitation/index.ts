import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

interface ReferralInvitationRequest {
  referrer_name: string;
  referred_name: string;
  referred_email: string;
  referred_phone?: string;
  referral_code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      referrer_name, 
      referred_name, 
      referred_email, 
      referred_phone, 
      referral_code 
    }: ReferralInvitationRequest = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already registered/been approved
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('referrer_id', user.id)
      .eq('referred_email', referred_email.toLowerCase())
      .in('status', ['registered', 'approved', 'first_payment', 'qualified'])
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Error checking existing referral:", checkError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to check existing referrals", 
          details: checkError.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (existingReferral) {
      return new Response(
        JSON.stringify({ 
          error: "This person has already registered or been approved through your referral",
          code: "ALREADY_REGISTERED"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Expire any old invitation_sent referrals before creating new one
    const { error: expireError } = await supabase
      .from('referrals')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('referrer_id', user.id)
      .eq('referred_email', referred_email.toLowerCase())
      .eq('status', 'invitation_sent');

    if (expireError) {
      console.error("Error expiring old referrals:", expireError);
      // Don't block the new invitation if expiring failed
    }

    // Create the referral invitation email
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://openkeyhousing.com';
    const signupUrl = `${appUrl}/signup?ref=${referral_code}`;
    
    const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <support@openkeyhousing.com>";
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Find Your Perfect Home!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏠 You're Invited!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Find your perfect home with special benefits</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${referred_name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${referrer_name}</strong> thought you'd be interested in our platform for finding your next rental property! 
              We've helped thousands of tenants find their perfect home with our streamlined application process.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #495057; margin: 0 0 15px 0;">🎁 Special Benefits for You:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #495057;">
                <li>Priority application processing</li>
                <li>Access to exclusive properties</li>
                <li>Dedicated support throughout your search</li>
                <li>Streamlined approval process</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Get Started - Find Your Home
              </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #1976d2;">
                <strong>💡 Tip:</strong> Use referral code <strong>${referral_code}</strong> when signing up to unlock these benefits!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            
            <p style="font-size: 14px; color: #666; text-align: center;">
              Questions? Reply to this email or contact our support team.<br>
              This invitation was sent by ${referrer_name} (${user.email}).
            </p>
          </div>
        </body>
      </html>
    `;

    // Send the email using raw Resend API (same as working tenant invitation)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: invitesFromEmail,
        to: [referred_email],
        subject: `${referrer_name} invited you to find your perfect rental home!`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        errorData
      });
      throw new Error(`Resend API error: ${emailResponse.status} - ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Referral invitation email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Referral invitation sent successfully",
        email_id: emailResult.id
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error sending referral invitation:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send referral invitation", 
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);