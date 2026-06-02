import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the current user from the auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !adminUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if requesting user is a super admin
    const { data: adminRecord, error: adminCheckError } = await supabaseAdmin
      .from('system_admins')
      .select('role_name, is_active')
      .eq('user_id', adminUser.id)
      .eq('is_active', true)
      .single();

    if (adminCheckError || !adminRecord || adminRecord.role_name !== 'super_admin') {
      console.error('Super admin check error:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Only super admins can impersonate users' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { target_user_id, target_user_email } = await req.json();

    if (!target_user_id || !target_user_email) {
      return new Response(
        JSON.stringify({ error: 'Target user ID and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if target user is an admin (prevent admin-to-admin impersonation)
    const { data: targetIsAdmin, error: targetAdminCheckError } = await supabaseAdmin.rpc('is_admin', {
      user_id: target_user_id
    });

    if (targetAdminCheckError) {
      console.error('Target admin check error:', targetAdminCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify target user' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (targetIsAdmin) {
      return new Response(
        JSON.stringify({ error: 'Cannot impersonate admin users' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate a sign-in link/token for the target user (NO password change)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: target_user_email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`
      }
    });

    if (linkError || !linkData) {
      console.error('Error generating auth link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create impersonation session' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Extract the hashed token directly from the response
    const tokenHash = linkData.properties.hashed_token;

    if (!tokenHash) {
      console.error('Failed to extract hashed_token from generateLink response');
      return new Response(
        JSON.stringify({ error: 'Failed to create impersonation session' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Log the impersonation event to security audit
    const { error: logError } = await supabaseAdmin
      .from('security_audit_log')
      .insert({
        user_id: adminUser.id,
        event_type: 'impersonation_started',
        severity: 'high',
        metadata: {
          admin_user_id: adminUser.id,
          admin_email: adminUser.email,
          target_user_id: target_user_id,
          target_user_email: target_user_email,
          timestamp: new Date().toISOString(),
        }
      });

    if (logError) {
      console.warn('Failed to log impersonation event:', logError);
    }

    console.log(`Admin ${adminUser.email} (${adminUser.id}) started impersonating user ${target_user_email} (${target_user_id})`);

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        message: 'Impersonation session created successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in impersonate-user function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to create impersonation session'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
