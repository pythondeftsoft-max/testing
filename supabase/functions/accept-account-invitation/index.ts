
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  invitationToken: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitationToken } = await req.json() as AcceptInvitationRequest;
    
    console.log('Accepting invitation with token:', invitationToken);
    
    if (!invitationToken) {
      console.error('No invitation token provided');
      return new Response(
        JSON.stringify({ error: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id, user.email);

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('account_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .single();

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invitation) {
      console.error('No invitation found for token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation found:', invitation.id, invitation.email, invitation.role, invitation.status);

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      console.error('Invitation already processed:', invitation.status);
      return new Response(
        JSON.stringify({ error: 'Invitation has already been processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      console.error('Invitation expired at:', invitation.expires_at);
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify that the user's email matches the invitation
    if (user.email !== invitation.email) {
      console.error('Email mismatch:', user.email, 'vs', invitation.email);
      return new Response(
        JSON.stringify({ error: 'Email mismatch. Please log in with the invited email address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('All validations passed, accepting invitation');

    // Start transaction to update invitation and create role
    const { error: updateError } = await supabase
      .from('account_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to accept invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation status updated to accepted');

    // Create the account role for the user
    const { error: roleError } = await supabase
      .from('account_roles')
      .insert({
        user_id: user.id,
        role_name: invitation.role,
        is_active: true,
        added_by: invitation.invited_by,
      });

    if (roleError) {
      console.error('Error creating account role:', roleError);
      
      // Rollback invitation status
      await supabase
        .from('account_invitations')
        .update({
          status: 'pending',
          accepted_at: null,
          accepted_by: null,
        })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Failed to grant account role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Account role created successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation accepted successfully',
        role: invitation.role
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in accept-account-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
