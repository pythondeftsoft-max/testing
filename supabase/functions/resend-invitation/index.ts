
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendInvitationRequest {
  invitation_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { invitation_id }: ResendInvitationRequest = await req.json();

    if (!invitation_id) {
      return new Response(
        JSON.stringify({ error: 'Invitation ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Resending invitation for ID:', invitation_id);

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('portfolio_invitations')
      .select(`
        id,
        invited_email,
        role,
        portfolio_id,
        inviter_id,
        status
      `)
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      console.error('Error fetching invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Invitation is no longer pending' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get portfolio details
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('portfolios')
      .select('client_name')
      .eq('id', invitation.portfolio_id)
      .single();

    if (portfolioError || !portfolio) {
      console.error('Error fetching portfolio:', portfolioError);
      return new Response(
        JSON.stringify({ error: 'Portfolio not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get inviter details
    const { data: inviter, error: inviterError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', invitation.inviter_id)
      .single();

    const inviterName = inviter 
      ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || 'Team Member'
      : 'Team Member';

    // Update the invitation's updated_at timestamp
    const { error: updateError } = await supabaseClient
      .from('portfolio_invitations')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation_id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }

    // Call the send-portfolio-invitation function to resend the email
    const { data: emailData, error: emailError } = await supabaseClient.functions.invoke(
      'send-portfolio-invitation',
      {
        body: {
          portfolio_id: invitation.portfolio_id,
          portfolio_name: portfolio.client_name,
          inviter_name: inviterName,
          invited_email: invitation.invited_email,
          role: invitation.role,
          is_resend: true,
          existing_invitation_id: invitation_id
        }
      }
    );

    if (emailError) {
      console.error('Error resending invitation email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to resend invitation email' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Invitation resent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation resent successfully',
        invitation_id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in resend-invitation function:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
