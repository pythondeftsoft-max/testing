import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token }: AcceptInvitationRequest = await req.json();

    // Fetch invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('system_admin_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('system_admin_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify email matches and update profile with invitation info
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.email !== invitation.email) {
      return new Response(
        JSON.stringify({ 
          error: 'This invitation was sent to a different email address. Please log in with the invited email.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with invitation data if profile fields are empty
    const profileUpdates: any = {};
    if (invitation.first_name && !userProfile.first_name) {
      profileUpdates.first_name = invitation.first_name;
    }
    if (invitation.last_name && !userProfile.last_name) {
      profileUpdates.last_name = invitation.last_name;
    }
    if (invitation.phone && !userProfile.phone) {
      profileUpdates.phone = invitation.phone;
    }

    if (Object.keys(profileUpdates).length > 0) {
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
    }

    // Check if user already has admin access
    const { data: existingAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (existingAdmin) {
      // Update invitation status
      await supabase
        .from('system_admin_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'You already have system admin access'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create system admin record
    const { error: adminError } = await supabase
      .from('system_admins')
      .insert({
        user_id: user.id,
        role_name: invitation.role_name,
        notes: invitation.notes,
      });

    if (adminError) {
      console.error('Error creating system admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Failed to grant admin access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('system_admin_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }

    // Log security audit event
    await supabase.from('security_audit_log').insert({
      user_id: user.id,
      event_type: 'admin_access_granted',
      event_category: 'authentication',
      severity: 'high',
      description: `System admin access granted via invitation (Role: ${invitation.role_name})`,
      metadata: {
        role: invitation.role_name,
        invited_by: invitation.invited_by,
        invitation_id: invitation.id
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'System admin access granted successfully',
        role: invitation.role_name
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in accept-system-admin-invitation:', error);
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
