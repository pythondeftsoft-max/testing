import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  notes?: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, notes, firstName, lastName }: InvitationRequest = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
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

    // Check if user has permission to send account invitations
    // Use secure is_admin RPC instead of checking profiles.user_type
    const { data: isSystemAdmin, error: adminError } = await supabase
      .rpc('is_admin', { user_id: user.id });

    if (adminError) {
      console.error('Error checking admin status:', adminError);
    }

    // Then check account roles if not a system admin
    let hasPermission = isSystemAdmin === true;

    if (!isSystemAdmin) {
      const { data: accountRolePermission, error: permissionError } = await supabase
        .rpc('has_account_role', { 
          user_id_param: user.id, 
          required_roles: ['owner', 'admin_partner']
        });

      if (permissionError) {
        console.error('Permission check error:', permissionError);
        return new Response(
          JSON.stringify({ error: "Error checking permissions", details: permissionError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      hasPermission = accountRolePermission;
    }

    if (!hasPermission) {
      console.log('User lacks permission to send invitations:', user.id);
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to send account invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user already exists and has account role
    const normalizedEmail = email.toLowerCase();
    
    // First check if there's already a user with this email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (existingProfile) {
      // User exists, check if they already have an account role
      const { data: existingRole, error: roleError } = await supabase
        .from('account_roles')
        .select('id, role_name, is_active')
        .eq('user_id', existingProfile.id)
        .eq('is_active', true)
        .single();

      if (existingRole) {
        // User already has an active role
        return new Response(
          JSON.stringify({ 
            error: `User already has an active account role: ${existingRole.role_name}`,
            existingRole: existingRole.role_name,
            userExists: true
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from('account_invitations')
      .select('id, status, expires_at')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      // There's already a pending invitation that hasn't expired
      return new Response(
        JSON.stringify({ 
          error: "A pending invitation already exists for this email address",
          existingInvitation: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('account_invitations')
      .insert({
        email: normalizedEmail,
        role,
        invited_by: user.id,
        notes
      })
      .select('*')
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: invitationError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send invitation email if Resend is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        console.log('Sending invitation email to:', email);
        const resend = new Resend(resendApiKey);
        
        // Get inviter's profile
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const inviterName = inviterProfile 
          ? `${inviterProfile.first_name} ${inviterProfile.last_name}`.trim()
          : user.email;

        const invitationUrl = `${Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || "https://openkeyhousing.com"}/accept-invitation?token=${invitation.invitation_token}&type=account`;

        const recipientName = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'there';
        
        const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <support@openkeyhousing.com>";
        const companyName = Deno.env.get("COMPANY_NAME") || "OpenKey Housing";
        
        // Fetch the email template from database
        const { data: template, error: templateError } = await supabase
          .from('email_templates')
          .select('subject_template, html_template')
          .eq('slug', 'account_invitation')
          .eq('is_active', true)
          .single();

        if (templateError || !template) {
          console.error('Error fetching email template:', templateError);
          throw new Error('Email template not found');
        }

        // Build context variables for template
        const contextVariables = {
          recipient_name: recipientName,
          inviter_name: inviterName,
          role: role,
          notes: notes || '',
          invitation_url: invitationUrl,
          expiration_date: new Date(invitation.expires_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          company_name: companyName,
        };

        // Replace template variables
        let emailSubject = template.subject_template;
        let emailBody = template.html_template;

        Object.entries(contextVariables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailSubject = emailSubject.replace(regex, String(value));
          emailBody = emailBody.replace(regex, String(value));
        });

        // Handle conditional {{#if notes}} blocks
        if (notes) {
          emailBody = emailBody.replace(/{{#if notes}}([\s\S]*?){{\/if}}/g, '$1');
        } else {
          emailBody = emailBody.replace(/{{#if notes}}[\s\S]*?{{\/if}}/g, '');
        }
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: invitesFromEmail,
          to: [email],
          subject: emailSubject,
          html: emailBody,
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          throw emailError;
        }

        console.log('Invitation email sent successfully:', emailData);
        
        // Record successful email send in email queue
        await supabase.from('email_queue').insert({
          to_email: email,
          subject: emailSubject,
          body: emailBody,
          link: invitationUrl,
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_type: 'invitation',
          audience: 'all',
          template_slug: 'account_invitation',
          category: 'administration',
          metadata: {
            invitation_id: invitation.id,
            invitation_token: invitation.invitation_token,
            role: role,
            invited_by: user.id,
            inviter_name: inviterName,
            resend_email_id: emailData?.id,
          },
        });
        
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        
        // Still log to email_queue as 'pending' so it can be retried
        await supabase.from('email_queue').insert({
          to_email: email,
          subject: emailSubject,
          body: emailBody,
          link: invitationUrl,
          status: 'pending',
          email_type: 'invitation',
          audience: 'all',
          template_slug: 'account_invitation',
          category: 'administration',
          metadata: {
            invitation_id: invitation.id,
            invitation_token: invitation.invitation_token,
            role: role,
            invited_by: user.id,
            inviter_name: inviterName,
            error: (emailError instanceof Error ? emailError.message : String(emailError)),
          },
        });
        
        // Check if it's a domain verification error
        if (emailError.statusCode === 403 && emailError.error?.includes('testing emails')) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              warning: 'Invitation created but email requires domain verification',
              invitation,
              domainError: true,
              message: 'To send emails to other recipients, please verify a domain at resend.com/domains and update the from address in the edge function to use your verified domain.'
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        // Don't fail the request if email fails, invitation is still created
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Invitation created but email failed to send',
            invitation,
            emailError: (emailError instanceof Error ? emailError.message : String(emailError))
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email send');
    }

    // Create notification for the invited user (if they exist in the system)
    try {
      if (existingProfile) {
        // User exists in the system, create a notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: existingProfile.id,
            title: 'Account Role Invitation',
            description: `You've been invited to join as ${role}`,
            type: 'account_invite',
            link: `/accept-invitation?token=${invitation.invitation_token}&type=account`,
            metadata: {
              invitation_id: invitation.id,
              invitation_token: invitation.invitation_token,
              role: role,
              invited_by: user.id,
              type: 'account_invite'
            }
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't fail the request if notification creation fails
        } else {
          console.log('Notification created successfully for existing user');
        }
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue anyway - notification is not critical
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        message: "Account invitation sent successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in send-account-invitation function:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});