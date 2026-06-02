// Cancel Background Check Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CancelCheckRequest {
  checkId: string;
  cancellationReason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { checkId, cancellationReason }: CancelCheckRequest = await req.json();

    // Get the background check record
    const { data: checkData, error: fetchError } = await supabaseClient
      .from('background_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (fetchError || !checkData) {
      return new Response(
        JSON.stringify({ error: 'Background check not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to cancel this check
    if (checkData.initiated_by !== authData.user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to cancel this background check' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the check can be cancelled
    if (!['pending', 'processing'].includes(checkData.check_status)) {
      return new Response(
        JSON.stringify({ error: 'Cannot cancel a background check that is not in progress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the background check to cancelled status
    const { data: updatedCheck, error: updateError } = await supabaseClient
      .from('background_checks')
      .update({
        check_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: authData.user.id,
        cancellation_reason: cancellationReason || 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', checkId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating background check:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel background check' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Background check cancelled successfully',
        data: updatedCheck
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});