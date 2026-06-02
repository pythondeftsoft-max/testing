
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Resend client and configuration
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
const APP_URL = Deno.env.get("APP_URL") ?? Deno.env.get("SITE_URL") ?? "";
const INVITES_FROM_EMAIL = Deno.env.get("INVITES_FROM_EMAIL") ?? "Invitations <onboarding@resend.dev>";

interface ResendInvitationRequest {
  invitationId: string;
}

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitationId }: ResendInvitationRequest = await req.json();

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Invitation ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('account_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found or already processed" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has permission to resend this invitation
    const { data: hasPermission, error: permissionError } = await supabase
      .rpc('has_account_role', {
        user_id_param: user.id,
        required_roles: ['owner', 'admin_partner'],
      });

    if (permissionError) {
      console.error('Permission check error:', permissionError);
    }
    if (!hasPermission) {
      console.warn('User lacks permission to resend account invitations', { userId: user.id });
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to resend account invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update invitation with new expiry and token
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('account_invitations')
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send the email directly via Resend using the existing invitation token
    let emailWarning: string | null = null;

    if (!Deno.env.get("RESEND_API_KEY")) {
      console.warn("RESEND_API_KEY not set; skipping email send");
      emailWarning = "Email sending is not configured; invitation extended but no email sent.";
    } else {
      try {
        // Try to enrich inviter's name from profile (optional)
        let inviterName = user.email;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name,last_name')
            .eq('id', user.id)
            .single();
          if (profile?.first_name || profile?.last_name) {
            inviterName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || inviterName;
          }
        } catch (_ignore) {}

        const token = (updatedInvitation as any).invitation_token || (invitation as any).invitation_token || (invitation as any).token;
        const inviteUrl = APP_URL && token ? `${APP_URL}/invitation?token=${token}` : null;

        // Fetch email template
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('slug', 'account_invitation_resend')
          .eq('is_active', true)
          .single();

        if (templateError || !template) {
          console.error('Error fetching email template:', templateError);
          emailWarning = "Invitation updated, but email template not found.";
        } else {
          // Replace template variables
          const expiresAt = new Date((updatedInvitation as any).expires_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const variables = {
            inviterName: inviterName || 'Someone',
            role: (invitation as any).role,
            inviteUrl: inviteUrl || '',
            expiresAt: expiresAt
          };

          const emailHtml = replaceTemplateVariables(template.html_template, variables);
          const emailSubject = replaceTemplateVariables(template.subject_template, variables);

          const emailResult = await resend.emails.send({
            from: INVITES_FROM_EMAIL,
            to: [(invitation as any).email],
            subject: emailSubject,
            html: emailHtml,
          });

          if ((emailResult as any)?.error) {
            console.error('Resend error:', (emailResult as any).error);
            emailWarning = "Invitation updated, but email failed to send.";
          } else {
            // Record in email queue
            try {
              await supabase.from('email_queue').insert({
                to_email: (invitation as any).email,
                subject: emailSubject,
                body: emailHtml,
                link: inviteUrl || '',
                status: 'sent',
                sent_at: new Date().toISOString(),
                email_type: 'invitation',
                audience: 'all',
                template_slug: 'account_invitation_resend',
                category: 'administration',
                metadata: {
                  invitation_id: invitationId,
                  role: (invitation as any).role,
                  invited_by: user.id,
                  inviter_name: inviterName,
                  is_resend: true,
                  resend_email_id: (emailResult as any)?.data?.id,
                },
              });
            } catch (queueError) {
              console.error('Error recording email in queue:', queueError);
            }
          }
        }
      } catch (e) {
        console.error('Error sending email via Resend:', e);
        emailWarning = "Invitation updated, but email failed to send.";
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: updatedInvitation,
        message: emailWarning ? `Invitation extended, but email not sent: ${emailWarning}` : "Account invitation resent successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in resend-account-invitation function:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});