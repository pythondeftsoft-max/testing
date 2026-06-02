
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

interface PortfolioInvitationRequest {
  portfolio_id: string;
  portfolio_name: string;
  inviter_name: string;
  invited_email: string;
  role: 'admin_partner' | 'editor' | 'viewer' | 'maintenance';
}

const ROLE_LABELS = {
  admin_partner: 'Admin Partner',
  editor: 'Editor',
  viewer: 'Viewer',
  maintenance: 'Maintenance',
};

const ROLE_DESCRIPTIONS = {
  admin_partner: 'Full access to the portfolio (cannot delete portfolio or account)',
  editor: 'Can manage tenants, update rent logs, upload documents, etc.',
  viewer: 'Read-only access to all data in the portfolio',
  maintenance: 'Limited access, only view unit maintenance status and submit tickets',
};

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
      portfolio_id,
      portfolio_name,
      inviter_name,
      invited_email,
      role
    }: PortfolioInvitationRequest = await req.json();

    console.log('=== DEBUG PORTFOLIO INVITATION START ===');
    console.log('Portfolio ID:', portfolio_id);
    console.log('Inviter User ID:', user.id);
    console.log('Invited Email:', invited_email);
    console.log('Role:', role);

    // Verify user has permission to invite to this portfolio
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .select('manager_id')
      .eq('id', portfolio_id)
      .single();

    if (portfolioError || !portfolioData) {
      console.error('Portfolio not found:', portfolioError);
      return new Response(
        JSON.stringify({ error: "Portfolio not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is portfolio manager or has admin_partner role
    const { data: userRole } = await supabase
      .from('portfolio_roles')
      .select('role_name')
      .eq('portfolio_id', portfolio_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isManager = portfolioData.manager_id === user.id;
    const isAdminPartner = userRole?.role_name === 'admin_partner';

    if (!isManager && !isAdminPartner) {
      console.error('User cannot invite to this portfolio');
      return new Response(
        JSON.stringify({ error: "Insufficient permissions to invite users to this portfolio" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invited email belongs to an existing user
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email === invited_email);

    console.log('Looking for existing user with email:', invited_email);
    console.log('Found existing user:', existingAuthUser?.id);

    // Check if invitation already exists for this email/portfolio
    const { data: existingInvitation } = await supabase
      .from('portfolio_invitations')
      .select('id, status')
      .eq('portfolio_id', portfolio_id)
      .eq('invited_email', invited_email)
      .maybeSingle();

    // If there's an existing pending or expired invitation, delete it
    if (existingInvitation && ['pending', 'expired'].includes(existingInvitation.status)) {
      console.log('Deleting existing invitation:', existingInvitation.id);
      await supabase
        .from('portfolio_invitations')
        .delete()
        .eq('id', existingInvitation.id);
    }

    // If invitation was already accepted, don't allow resending
    if (existingInvitation && existingInvitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: "User has already accepted this invitation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create portfolio invitation record
    const invitationData = {
      portfolio_id,
      invited_email,
      status: 'pending',
      inviter_id: user.id,
      role: role
    };

    console.log('Inserting invitation with data:', invitationData);

    const { data: invitation, error: invitationError } = await supabase
      .from('portfolio_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating portfolio invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Created portfolio invitation:', invitation.id);

    // If user exists, create in-app notification (but only for non-tenants)
    if (existingAuthUser?.id) {
      console.log('Creating in-app notification for existing user:', existingAuthUser.id);
      
      // Check user type - only send to landlords/property managers/admins
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', existingAuthUser.id)
        .single();
      
      console.log('User profile type:', userProfile?.user_type);
      
      // Only create notification if user is not a tenant
      if (userProfile && userProfile.user_type !== 'tenant') {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: existingAuthUser.id,
            type: 'portfolio_invite',
            title: `Portfolio Team Invitation`,
            description: `${inviter_name} has invited you to join the "${portfolio_name}" portfolio as ${ROLE_LABELS[role]}`,
            metadata: {
              invitation_id: invitation.id,
              portfolio_id: portfolio_id,
              portfolio_name: portfolio_name,
              inviter_name: inviter_name,
              role: role,
              role_label: ROLE_LABELS[role]
            },
            link: `/accept-invitation?token=${invitation.id}&type=portfolio`
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        } else {
          console.log('Successfully created in-app notification for non-tenant user');
        }
      } else {
        console.log('Skipping in-app notification - user is a tenant');
      }
    }

    // Create the invitation link pointing to AcceptInvitation page
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://openkeyhousing.com';
    const invitationUrl = `${appUrl}/accept-invitation?token=${invitation.id}&type=portfolio`;
    
    const invitesFromEmail = Deno.env.get("INVITES_FROM_EMAIL") || "OpenKey Housing <support@openkeyhousing.com>";
    
    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', 'portfolio_invitation')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Error fetching email template:', templateError);
      return new Response(
        JSON.stringify({ error: "Email template not found" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Replace template variables
    const variables = {
      inviterName: inviter_name,
      portfolioName: portfolio_name,
      roleLabel: ROLE_LABELS[role],
      roleDescription: ROLE_DESCRIPTIONS[role],
      invitationUrl: invitationUrl
    };

    const emailHtml = replaceTemplateVariables(template.html_template, variables);
    const emailSubject = replaceTemplateVariables(template.subject_template, variables);
    
    // Queue the email for processing
    const { error: queueError } = await supabase.from('email_queue').insert({
      user_id: existingAuthUser?.id || user.id, // Use invited user's ID if they exist, otherwise inviter's ID
      to_email: invited_email,
      subject: emailSubject,
      body: emailHtml,
      link: invitationUrl,
      status: 'pending',
      email_type: 'invitation',
      audience: 'all',
      template_slug: 'portfolio_invitation',
      category: 'team_management',
      metadata: {
        invitation_id: invitation.id,
        portfolio_id: portfolio_id,
        portfolio_name: portfolio_name,
        role: role,
        role_label: ROLE_LABELS[role],
        inviter_id: user.id,
        inviter_name: inviter_name,
        has_in_app_notification: !!existingAuthUser?.id,
      },
    });

    if (queueError) {
      console.error('Error queueing email:', queueError);
      throw queueError;
    }

    console.log('Portfolio invitation queued successfully for:', invited_email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Portfolio invitation queued successfully",
        invitation_id: invitation.id,
        has_in_app_notification: !!existingAuthUser?.id
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
    console.error("Error sending portfolio invitation:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send portfolio invitation", 
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