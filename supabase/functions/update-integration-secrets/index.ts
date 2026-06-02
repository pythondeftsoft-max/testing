import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('update-integration-secrets function started');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Check if user is super admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('role_name', 'super_admin')
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminCheck) {
      console.error('Admin check failed:', adminError);
      throw new Error('Access denied: Super admin privileges required');
    }

    console.log('Super admin verified');

    // Parse request body
    const { integrationId, secrets } = await req.json();
    
    if (!integrationId || !secrets || typeof secrets !== 'object') {
      throw new Error('Invalid request: integrationId and secrets object required');
    }

    console.log('Updating secrets for integration:', integrationId);

    // Log the action
    await supabase.from('admin_action_logs').insert({
      admin_user_id: user.id,
      action: 'update_integration_secrets',
      resource_type: 'integration',
      resource_id: integrationId,
      details: {
        integration_id: integrationId,
        updated_keys: Object.keys(secrets),
        timestamp: new Date().toISOString(),
      },
      reason: `Updated integration secrets for ${integrationId}`,
    });

    console.log('Action logged successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Integration secrets for ${integrationId} have been queued for update`,
        integrationId,
        updatedKeys: Object.keys(secrets),
        note: 'Please update secrets manually in Supabase Dashboard for security. This endpoint logs the request but does not modify secrets directly.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-integration-secrets:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: (error instanceof Error ? error.message : String(error))?.includes('denied') || (error instanceof Error ? error.message : String(error))?.includes('Unauthorized') ? 403 : 500,
      }
    );
  }
});
