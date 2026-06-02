import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitationToken } = await req.json();
    
    if (!invitationToken) {
      return new Response(
        JSON.stringify({ error: 'Missing invitation token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user from auth header
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabaseClient.auth.getUser(jwt);
        currentUserId = user?.id;
      } catch (error) {
        console.error('Error getting user from auth:', error);
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (!currentUserId) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call the database function to accept the invitation
    const { data, error } = await supabase.rpc('accept_tenant_invitation', {
      p_invitation_token: invitationToken,
      p_user_id: currentUserId
    });

    if (error) {
      console.error('Error accepting invitation:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to accept invitation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = data[0];
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: result.message,
        propertyId: result.property_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in accept-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to accept invitation',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});