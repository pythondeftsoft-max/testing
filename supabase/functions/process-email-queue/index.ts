import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting email queue processing...");
    
    const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@openkeyhousing.com";
    const appUrl = Deno.env.get("APP_URL") || "https://openkeyhousing.com";

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        db: {
          schema: 'public'
        }
      }
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Helper function to add delay between emails (rate limit protection)
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    console.log("Fetching pending emails from queue...");
    
    // Get pending emails from the queue - fetch as plain data without any relationships
    const { data: emails, error: fetchError } = await supabaseClient
      .from("email_queue")
      .select("id, user_id, subject, body, link, status, to_email, audience, template_slug, category, metadata, email_type, auth_metadata, created_at, updated_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5); // Process 5 emails at a time to stay under rate limits

    if (fetchError) {
      console.error("Error fetching emails:", fetchError);
      throw new Error(`Failed to fetch emails: ${fetchError.message}`);
    }

    console.log(`Found ${emails?.length || 0} pending emails to process`);

    const results = [];
    
    if (emails && emails.length > 0) {
      for (const email of emails) {
        try {
          // Determine recipient email
          let recipientEmail = email.to_email;
          
          if (!recipientEmail) {
            // Fallback to user lookup if to_email is not set
            const { data: userEmail, error: userError } = await supabaseClient.rpc('get_user_email', { 
              user_id: email.user_id 
            });
            
            if (userError || !userEmail) {
              console.error(`Failed to get email for user ${email.user_id}:`, userError);
              throw new Error(`Could not resolve email address for user`);
            }
            recipientEmail = userEmail;
          }

          // Get user profile for personalization
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", email.user_id)
            .single();

          const userName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
            : 'User';

          let emailSubject = email.subject;
          let emailHtml = email.body;

          // Fetch template if template_slug is set
          let template = null;
          if (email.template_slug) {
            const { data: fetchedTemplate } = await supabaseClient
              .from("email_templates")
              .select("*")
              .eq("slug", email.template_slug)
              .single();
            
            template = fetchedTemplate;
          }

          // If using a template, render it with context
          if (email.template_slug && template) {
            const metadata = email.metadata || {};

            // Replace template placeholders
            emailSubject = template.subject_template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
              return metadata[key] || match;
            });

            // For tenant-focused emails, use clean OpenKey branding
            if (email.audience === 'tenant') {
              emailHtml = `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827;">
                  <!-- OpenKey Header -->
                  <tr>
                    <td align="center" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 16px; color:#fff; font-weight:700; font-size:24px; border-radius:8px 8px 0 0;">
                      OpenKey
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding:32px 24px; background:#ffffff; border:1px solid #e5e7eb; border-top:none;">
                      ${template.html_template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                        return metadata[key] || match;
                      })}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="background:#f9fafb; padding:24px 16px; color:#6b7280; font-size:12px; border-radius:0 0 8px 8px; border:1px solid #e5e7eb; border-top:none;">
                      <p style="margin:0 0 8px 0;">© 2024 OpenKey. All rights reserved.</p>
                      <p style="margin:0; font-size:11px;">
                        Helping tenants find great homes • <a href="${appUrl}/unsubscribe" style="color:#6b7280;">Unsubscribe</a>
                      </p>
                    </td>
                  </tr>
                </table>
              `;
            } else {
              // For landlord emails, keep the existing promotional template
              emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">OpenKey</h1>
                    <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your Property Management Platform</p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">${emailSubject}</h2>
                    
                    <div style="color: #4b5563; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
                      ${email.body.replace(/\n/g, '<br>')}
                    </div>

                    <!-- Subscription Info Box -->
                    <div style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #6366f1;">
                      <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">🚀 Upgrade to Landlord Pro</h3>
                      <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 15px;">
                        Get unlimited properties, advanced analytics, automated rent collection, and priority support.
                      </p>
                      <div style="background: #ffffff; padding: 20px; border-radius: 8px; margin: 15px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                          <span style="font-weight: bold; color: #1f2937;">Landlord Pro Plan</span>
                          <span style="font-size: 24px; font-weight: bold; color: #6366f1;">$29/month</span>
                        </div>
                        <ul style="color: #4b5563; margin: 10px 0; padding-left: 20px; font-size: 14px;">
                          <li>✅ Unlimited properties</li>
                          <li>✅ Advanced analytics & reporting</li>
                          <li>✅ Automated rent collection</li>
                          <li>✅ HAP payment tracking</li>
                          <li>✅ Priority customer support</li>
                        </ul>
                      </div>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${email.link || `${appUrl}/landlord-hap`}" 
                         style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                        Sign In to OpenKey & Subscribe Now
                      </a>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        Need help? Reply to this email or visit our support center.
                      </p>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                      © 2024 OpenKey. All rights reserved.
                    </p>
                    <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                      This notification was sent to ${userName}. You're receiving this because you have properties on OpenKey.
                    </p>
                  </div>
                </div>
              `;
            }
          } else if (email.email_type === 'auth_confirmation' || email.email_type === 'auth_reset' || email.email_type === 'auth_invite') {
            // Special handling for auth emails - use body directly (already contains confirmation link)
            emailHtml = `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827;">
                <!-- OpenKey Header -->
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 16px; color:#fff; font-weight:700; font-size:24px; border-radius:8px 8px 0 0;">
                    OpenKey
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding:32px 24px; background:#ffffff; border:1px solid #e5e7eb; border-top:none;">
                    <div style="line-height: 1.6;">${email.body.replace(/\n/g, '<br>')}</div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="background:#f9fafb; padding:24px 16px; color:#6b7280; font-size:12px; border-radius:0 0 8px 8px; border:1px solid #e5e7eb; border-top:none;">
                    <p style="margin:0 0 8px 0;">© 2024 OpenKey. All rights reserved.</p>
                    <p style="margin:0; font-size:11px;">
                      This is an automated authentication email from OpenKey.
                    </p>
                  </td>
                </tr>
              </table>
            `;
          } else {
            // Fallback for legacy emails without templates
            emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0;">OpenKey</h1>
                </div>
                <div style="padding: 30px; background: #ffffff;">
                  <h2>${emailSubject}</h2>
                  <div style="line-height: 1.6;">${email.body.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
            `;
          }

          // Determine sender identity based on agency email settings
          let fromAddress = `OpenKey Housing <${supportEmail}>`;
          const emailMetadata = email.metadata as Record<string, any> | null;
          const agencyId = emailMetadata?.agency_id;
          
          if (agencyId) {
            // Look up agency email settings for branded sending
            const { data: emailSettingsData } = await supabaseClient
              .from('agency_email_settings')
              .select('sender_mode, custom_domain, custom_from_email, domain_verified')
              .eq('agency_id', agencyId)
              .maybeSingle();

            // Get agency name for branding
            const { data: agencyData } = await supabaseClient
              .from('housing_authorities')
              .select('name')
              .eq('id', agencyId)
              .single();

            const agencyName = agencyData?.name || 'Housing Authority';
            
            if (emailSettingsData?.sender_mode === 'custom_domain' && emailSettingsData?.domain_verified && emailSettingsData?.custom_from_email) {
              // Custom domain mode — send from agency's own domain
              fromAddress = `${agencyName} <${emailSettingsData.custom_from_email}>`;
            } else {
              // Hybrid mode — send as "Agency via OpenKey"
              fromAddress = `${agencyName} via OpenKey <${supportEmail}>`;
            }
          }

          // Send email via Resend
          const emailResponse = await resend.emails.send({
            from: fromAddress,
            to: [recipientEmail],
            subject: emailSubject,
            html: emailHtml,
          });

          console.log(`Email sent for notification ${email.id}:`, emailResponse);

          // Check for rate limit errors
          if (emailResponse.error) {
            const error = emailResponse.error as any;
            if (error.statusCode === 429 || error.name === 'rate_limit_exceeded') {
              console.warn(`Rate limit hit for email ${email.id}, will retry later`);
              results.push({
                id: email.id,
                status: "rate_limited",
                subject: email.subject
              });
              // Keep status as "pending" so it will be retried
              continue;
            }
            throw new Error(`Resend API error: ${(error instanceof Error ? error.message : String(error))}`);
          }

          // Update email status to sent
          await supabaseClient
            .from("email_queue")
            .update({ 
              status: "sent",
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", email.id);

          results.push({
            id: email.id,
            status: "sent",
            subject: email.subject
          });

          // Add 500ms delay between each email to respect rate limits (2 emails/sec max)
          await sleep(500);

        } catch (emailError) {
          console.error(`Failed to send email ${email.id}:`, emailError);
          
          // Update email status to failed
          await supabaseClient
            .from("email_queue")
            .update({ 
              status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("id", email.id);

          results.push({
            id: email.id,
            status: "failed",
            subject: email.subject,
            error: (emailError instanceof Error ? emailError.message : String(emailError))
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("Error in process-email-queue function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
