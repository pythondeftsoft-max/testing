// Rerun Background Check Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RerunCheckRequest {
  checkId: string;
  rerunSections?: string[]; // ['identity', 'criminal', 'civil', 'sex_offender']
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

    const { checkId, rerunSections }: RerunCheckRequest = await req.json();

    // Get the original background check record
    const { data: originalCheck, error: fetchError } = await supabaseClient
      .from('background_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (fetchError || !originalCheck) {
      return new Response(
        JSON.stringify({ error: 'Original background check not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to rerun this check
    if (originalCheck.initiated_by !== authData.user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to rerun this background check' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the original check can be rerun
    if (!['completed', 'failed', 'cancelled'].includes(originalCheck.check_status)) {
      return new Response(
        JSON.stringify({ error: 'Can only rerun completed, failed, or cancelled background checks' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if form_data exists
    if (!originalCheck.form_data) {
      console.error('No form data found for background check:', checkId);
      return new Response(
        JSON.stringify({ error: 'Cannot rerun - original form data not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new background check record linked to the original
    const newRerunCount = (originalCheck.rerun_count || 0) + 1;
    
    const { data: newCheck, error: insertError } = await supabaseClient
      .from('background_checks')
      .insert({
        tenant_id: originalCheck.tenant_id,
        property_id: originalCheck.property_id,
        initiated_by: authData.user.id,
        check_type: originalCheck.check_type,
        check_status: 'pending',
        parent_check_id: checkId,
        rerun_count: newRerunCount,
        form_data: originalCheck.form_data,
        notes: `Rerun #${newRerunCount} of background check ${checkId}${rerunSections ? ` (sections: ${rerunSections.join(', ')})` : ''}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating rerun background check:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create rerun background check' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invoke the background check processor for the new check
    try {
      // Use stored form data for the processor request
      const formData = originalCheck.form_data;
      
      // Create request payload for background check processor using stored form data
      const processorRequest = {
        checkId: newCheck.id,
        personalInfo: formData.personalInfo || {},
        address: formData.address || {},
        employment: formData.employment || {},
        rerunSections: rerunSections || ['identity', 'criminal', 'civil', 'sex_offender']
      };

      // Call the background check processor
      const { error: processorError } = await supabaseClient.functions.invoke(
        'background-check-processor',
        {
          body: processorRequest,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (processorError) {
        console.error('Error invoking background check processor:', processorError);
        
        // Update the new check to failed status
        await supabaseClient
          .from('background_checks')
          .update({
            check_status: 'failed',
            notes: `Rerun failed: ${processorError.message || 'Unknown error'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', newCheck.id);

        throw new Error('Failed to process rerun background check');
      }

      return new Response(
        JSON.stringify({ 
          message: 'Background check rerun initiated successfully',
          data: newCheck,
          rerunCount: newRerunCount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processorError) {
      console.error('Background check processor error:', processorError);
      
      // Update the new check to failed status
      await supabaseClient
        .from('background_checks')
        .update({
          check_status: 'failed',
          notes: `Rerun failed: ${(processorError instanceof Error ? processorError.message : String(processorError)) || 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', newCheck.id);

      return new Response(
        JSON.stringify({ error: 'Failed to process background check rerun' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});