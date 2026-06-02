import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Weekly application refresh notification starting...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get all non-subscriber tenants who have applied before (have engagement)
    const { data: tenants, error: tenantsError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email:id (email)
      `)
      .eq('user_type', 'tenant')
      .in('id', 
        supabase
          .from('property_applications')
          .select('tenant_id')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Active in last 30 days
      );

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    if (!tenants?.length) {
      console.log("No active tenants found for notification");
      return new Response(JSON.stringify({ message: "No tenants to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;
    let notificationsCreated = 0;

    // Process each tenant
    for (const tenant of tenants) {
      try {
        // Check if they have active subscription
        const { data: hasSubscription } = await supabase.rpc('has_active_subscription', {
          subscription_user_id: tenant.id,
          subscription_role: 'tenant'
        });

        // Skip subscribers (they have unlimited applications)
        if (hasSubscription) {
          console.log(`Skipping subscriber: ${tenant.first_name} ${tenant.last_name}`);
          continue;
        }

        // Get user's email from auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(tenant.id);
        
        if (authError || !authUser?.user?.email) {
          console.log(`No email found for tenant: ${tenant.id}`);
          continue;
        }

        const email = authUser.user.email;
        const firstName = tenant.first_name || 'there';

        // Send email notification
        const emailResponse = await resend.emails.send({
          from: "OpenKey <noreply@openkey.co>",
          to: [email],
          subject: "Your Weekly Application Credits Have Been Refreshed! 🏠",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Application Credits Refreshed</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">OpenKey</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Housing Partner</p>
              </div>
              
              <div style="background: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 25px;">
                <h2 style="color: #1a202c; margin: 0 0 15px 0; font-size: 22px;">Good News, ${firstName}! 🎉</h2>
                <p style="margin: 0; font-size: 16px; color: #4a5568;">Your weekly application credits have been refreshed and you can now apply to <strong>5 more properties</strong> on OpenKey!</p>
              </div>

              <div style="margin: 30px 0;">
                <h3 style="color: #2d3748; margin-bottom: 15px; font-size: 18px;">Ready to Find Your Perfect Home?</h3>
                <p style="margin-bottom: 20px; color: #4a5568;">Don't let great opportunities slip away. Browse our latest available properties and submit your applications today.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://openkey.co/marketplace" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Browse Properties</a>
                </div>
              </div>

              <div style="background: #e6fffa; padding: 20px; border-radius: 8px; border: 1px solid #81e6d9; margin: 25px 0;">
                <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tip:</h4>
                <p style="margin: 0; color: #047857; font-size: 14px;">Want unlimited applications? Upgrade to <strong>OpenKey Plus</strong> for just $19.99/month and apply to as many properties as you want, plus get priority support and exclusive listings!</p>
                <div style="margin-top: 15px;">
                  <a href="https://openkey.co/plus" style="color: #047857; text-decoration: none; font-weight: 600; font-size: 14px;">Learn More About Plus →</a>
                </div>
              </div>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #718096; font-size: 14px; margin: 0;">
                  Happy house hunting!<br>
                  The OpenKey Team
                </p>
              </div>
            </body>
            </html>
          `,
          text: `Hi ${firstName}!

Your weekly application credits have been refreshed! You can now apply to 5 more properties on OpenKey.

Ready to find your perfect home? Browse our latest available properties at: https://openkey.co/marketplace

Want unlimited applications? Upgrade to OpenKey Plus for just $19.99/month: https://openkey.co/plus

Happy house hunting!
The OpenKey Team`
        });

        if (emailResponse.error) {
          console.error(`Email error for ${email}:`, emailResponse.error);
        } else {
          emailsSent++;
          console.log(`Email sent to: ${email}`);
        }

        // Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: tenant.id,
            title: 'Application Credits Refreshed! 🏠',
            description: 'Your weekly application credits have been refreshed. You can now apply to 5 more properties this week.',
            type: 'success',
            link: '/marketplace',
            category: 'applications',
            priority: 'medium'
          });

        if (notificationError) {
          console.error(`Notification error for ${tenant.id}:`, notificationError);
        } else {
          notificationsCreated++;
        }

      } catch (error) {
        console.error(`Error processing tenant ${tenant.id}:`, error);
        continue;
      }
    }

    console.log(`Weekly refresh notifications completed: ${emailsSent} emails sent, ${notificationsCreated} notifications created`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weekly refresh notifications sent`,
        stats: {
          tenantsProcessed: tenants.length,
          emailsSent,
          notificationsCreated
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in weekly-application-refresh-notify function:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});