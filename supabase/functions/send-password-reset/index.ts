import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://openkeyhousing.com";
const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@openkeyhousing.com";
const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <no-reply@openkeyhousing.com>";

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Generating password reset for email: ${email}`);

    // Generate password reset link using admin client
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo || `${req.headers.get('origin') || appUrl}/auth?mode=reset`
      }
    });

    if (error) {
      console.error("Error generating reset link:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate reset link" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user profile for personalization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', data.user?.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '';

    // Fetch email template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('slug', 'password_reset')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ error: "Email template not found" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Replace template variables
    const variables = {
      userName: userName || 'User',
      resetLink: data.properties?.action_link || '',
      supportEmail: supportEmail
    };

    const emailHtml = replaceTemplateVariables(template.html_template, variables);
    const emailSubject = replaceTemplateVariables(template.subject_template, variables);
    
    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: invitesFromEmail,
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Password reset email sent successfully:", emailResponse.data?.id);

    // Record in email queue
    await supabaseAdmin.from('email_queue').insert({
      user_id: data.user?.id,
      to_email: email,
      subject: emailSubject,
      body: emailHtml,
      link: data.properties?.action_link || '',
      status: 'sent',
      sent_at: new Date().toISOString(),
      email_type: 'transactional',
      audience: 'all',
      template_slug: 'password_reset',
      category: 'authentication',
      metadata: {
        user_id: data.user?.id,
        user_name: userName,
        resend_email_id: emailResponse.data?.id,
      },
    });

    return new Response(
      JSON.stringify({ 
        message: "Password reset email sent successfully",
        emailId: emailResponse.data?.id
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
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);