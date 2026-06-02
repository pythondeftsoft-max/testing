import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  configId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { configId, email, role, invitedBy }: InvitationRequest = await req.json();

    console.log('Processing team member invitation:', { configId, email, role, invitedBy });

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Check if team exists, create if not
    let { data: team, error: teamError } = await supabase
      .from('white_label_teams')
      .select('id')
      .eq('config_id', configId)
      .single();

    if (teamError && teamError.code === 'PGRST116') {
      // Team doesn't exist, create it
      const { data: newTeam, error: createTeamError } = await supabase
        .from('white_label_teams')
        .insert({
          config_id: configId,
          team_name: 'White Label Team',
          created_by: invitedBy
        })
        .select('id')
        .single();

      if (createTeamError) {
        throw createTeamError;
      }
      team = newTeam;
    } else if (teamError) {
      throw teamError;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);

    let userId = existingUser?.user?.id;

    // If user doesn't exist, create an invitation record
    if (!userId) {
      // Store invitation for when user signs up
      const { error: invitationError } = await supabase
        .from('white_label_team_invitations')
        .insert({
          team_id: team.id,
          email: email,
          role: role,
          invited_by: invitedBy,
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (invitationError) throw invitationError;
    } else {
      // User exists, add them directly to the team
      const { error: memberError } = await supabase
        .from('white_label_team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: role,
          added_by: invitedBy,
          is_active: true
        });

      if (memberError) throw memberError;
    }

    // Send invitation email
    const invitationLink = userId 
      ? `${Deno.env.get('SITE_URL')}/white-label/${configId}?invited=true`
      : `${Deno.env.get('SITE_URL')}/auth?invite=${invitationToken}`;

    // Add to email queue
    await supabase
      .from('email_queue')
      .insert({
        user_id: userId || invitedBy, // Use inviter's ID if no user exists yet
        to_email: email,
        subject: 'You\'ve been invited to join a White Label team',
        body: `
          <h2>Team Invitation</h2>
          <p>You've been invited to join a White Label team with ${role} access.</p>
          <p><a href="${invitationLink}" style="background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
        `,
        link: invitationLink,
        status: 'pending'
      });

    console.log('Team member invitation processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: userId ? 'User added to team' : 'Invitation sent',
        invitationToken: userId ? null : invitationToken
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in team-member-invitation function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);