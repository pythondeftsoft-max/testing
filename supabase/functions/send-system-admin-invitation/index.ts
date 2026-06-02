import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "../_shared/resend.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: string;
  notes?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'http://localhost:3000';
    const fromEmail = Deno.env.get('INVITES_FROM_EMAIL') || 'onboarding@resend.dev';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get JWT from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a system admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Only system admins can send invitations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, notes, first_name, last_name, phone }: InvitationRequest = await req.json();

    // Check if user already has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profile) {
      const { data: existingAdmin } = await supabase
        .from('system_admins')
        .select('id')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .single();

      if (existingAdmin) {
        return new Response(
          JSON.stringify({ error: 'User already has system admin access' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('system_admin_invitations')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'A pending invitation already exists for this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create invitation (7 days expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await supabase
      .from('system_admin_invitations')
      .insert({
        email,
        role_name: role,
        invited_by: user.id,
        notes,
        first_name,
        last_name,
        phone,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile 
      ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || inviterProfile.email
      : user.email;

    const acceptUrl = `${siteUrl}/accept-admin-invite?token=${invitation.invitation_token}`;

    // Fetch email template from database
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', 'system_admin_invitation')
      .eq('is_active', true)
      .single();

    // Format dates
    const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const expiresTime = new Date(expiresAt).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    // Prepare email subject and body
    let emailSubject = `${inviterName} invited you to join as ${role}`;
    let emailHtml = '';

    if (emailTemplate) {
      console.log('Using email template from database');
      
      // Replace variables in subject
      emailSubject = emailTemplate.subject_template
        .replace(/\{\{inviter_name\}\}/g, inviterName)
        .replace(/\{\{role\}\}/g, role);

      // Replace variables in HTML
      emailHtml = emailTemplate.html_template
        .replace(/\{\{recipient_name\}\}/g, first_name || email.split('@')[0])
        .replace(/\{\{recipient_full_name\}\}/g, `${first_name || ''} ${last_name || ''}`.trim() || email)
        .replace(/\{\{inviter_name\}\}/g, inviterName)
        .replace(/\{\{role\}\}/g, role)
        .replace(/\{\{expires_date\}\}/g, expiresDate)
        .replace(/\{\{expires_time\}\}/g, expiresTime)
        .replace(/\{\{accept_url\}\}/g, acceptUrl);

      // Handle notes section
      if (notes) {
        const notesHtml = `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p>
                          <p style="margin: 4px 0 0; font-size: 16px; color: #1f2937; font-weight: 600;">${notes}</p>
                        </td>
                      </tr>`;
        emailHtml = emailHtml.replace(/\{\{notes_section\}\}/g, notesHtml);
      } else {
        emailHtml = emailHtml.replace(/\{\{notes_section\}\}/g, '');
      }
    } else {
      // Fallback to simple template
      console.log('Email template not found, using fallback');
      const greeting = first_name ? `Hi ${first_name}` : 'Hi';
      emailSubject = `${greeting} - You've been invited as a System Administrator`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">System Administrator Invitation</h2>
          <p>${greeting},</p>
          <p>You've been invited by <strong>${inviterName}</strong> to become a System Administrator.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 5px 0;"><strong>Invited by:</strong> ${inviterName}</p>
            <p style="margin: 5px 0;"><strong>Expires:</strong> ${expiresDate} at ${expiresTime}</p>
            ${notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days on ${expiresDate}.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, please ignore this email.
          </p>
        </div>
      `;
    }

    // Send email
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('Email sent:', emailResult);

    // Record in email queue for tracking
    const { error: queueError } = await supabase
      .from('email_queue')
      .insert({
        user_id: profile?.id || user.id, // Use profile ID if exists, otherwise inviter ID
        to_email: email,
        subject: emailSubject,
        body: emailHtml,
        link: acceptUrl,
        status: 'sent',
        sent_at: new Date().toISOString(),
        email_type: 'admin_invitation',
        audience: 'all',
        template_slug: 'system_admin_invitation',
        category: 'administration',
        metadata: {
          invitation_id: invitation.id,
          invitation_token: invitation.invitation_token,
          role: role,
          invited_by: user.id,
          inviter_name: inviterName,
          resend_email_id: emailResult.data?.id,
        },
      });

    if (queueError) {
      console.error('Error recording email in queue:', queueError);
      // Don't fail the request - email was already sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        message: 'Invitation sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-system-admin-invitation:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
