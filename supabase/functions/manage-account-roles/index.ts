import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GrantRoleRequest {
  action: 'grant';
  user_id: string;
  role_name: 'owner' | 'co_owner' | 'admin_partner' | 'support_assistant';
  notes?: string;
}

interface RevokeRoleRequest {
  action: 'revoke';
  account_role_id: string;
  reason?: string;
}

interface ListRolesRequest {
  action: 'list';
  user_id?: string; // Optional: get roles for specific user, otherwise get all
}

interface GetUserRoleRequest {
  action: 'get-user-role';
  user_id: string;
}

type AccountRoleRequest = GrantRoleRequest | RevokeRoleRequest | ListRolesRequest | GetUserRoleRequest;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as AccountRoleRequest;
    
    if (!body.action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the current user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user has permission to manage account roles
    const { data: hasPermission } = await supabase
      .rpc('is_account_admin', { p_user_id: user.id });

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to manage account roles' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle different actions
    switch (body.action) {
      case 'grant':
        return await handleGrantRole(supabase, user.id, body);
      
      case 'revoke':
        return await handleRevokeRole(supabase, user.id, body);
      
      case 'list':
        return await handleListRoles(supabase, body);
      
      case 'get-user-role':
        return await handleGetUserRole(supabase, body);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in manage-account-roles function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleGrantRole(supabase: any, grantedBy: string, request: GrantRoleRequest) {
  try {
    console.log(`Granting role ${request.role_name} to user ${request.user_id}`);

    // Check if user already has this role
    const { data: existingRole, error: existingError } = await supabase
      .from('account_roles')
      .select('id')
      .eq('user_id', request.user_id)
      .eq('role_name', request.role_name)
      .eq('is_active', true)
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: 'User already has this role' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Grant the role
    const { data: newRole, error: grantError } = await supabase
      .from('account_roles')
      .insert({
        user_id: request.user_id,
        role_name: request.role_name,
        granted_by: grantedBy,
        notes: request.notes || null
      })
      .select(`
        id,
        role_name,
        granted_at,
        notes,
        profiles!account_roles_user_id_fkey(first_name, last_name, email)
      `)
      .single();

    if (grantError) {
      console.error('Error granting role:', grantError);
      return new Response(
        JSON.stringify({ error: 'Failed to grant role', details: grantError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully granted role:', newRole);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Role granted successfully',
        role: newRole
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handleGrantRole:', error);
    throw error;
  }
}

async function handleRevokeRole(supabase: any, revokedBy: string, request: RevokeRoleRequest) {
  try {
    console.log(`Revoking account role ${request.account_role_id}`);

    // Get role info before deactivating
    const { data: roleInfo, error: roleError } = await supabase
      .from('account_roles')
      .select(`
        id,
        user_id,
        role_name,
        profiles!account_roles_user_id_fkey(first_name, last_name, email)
      `)
      .eq('id', request.account_role_id)
      .eq('is_active', true)
      .single();

    if (roleError || !roleInfo) {
      return new Response(
        JSON.stringify({ error: 'Role not found or already revoked' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Deactivate the role (soft delete)
    const { error: revokeError } = await supabase
      .from('account_roles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.account_role_id);

    if (revokeError) {
      console.error('Error revoking role:', revokeError);
      return new Response(
        JSON.stringify({ error: 'Failed to revoke role', details: revokeError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully revoked role:', roleInfo);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Role revoked successfully',
        revoked_role: roleInfo
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handleRevokeRole:', error);
    throw error;
  }
}

async function handleListRoles(supabase: any, request: ListRolesRequest) {
  try {
    console.log('Listing account roles', request.user_id ? `for user ${request.user_id}` : 'for all users');

    let query = supabase
      .from('account_roles')
      .select(`
        id,
        user_id,
        role_name,
        granted_at,
        granted_by,
        notes,
        is_active,
        profiles!account_roles_user_id_fkey(first_name, last_name, email),
        granted_by_profile:profiles!account_roles_granted_by_fkey(first_name, last_name, email)
      `)
      .eq('is_active', true)
      .order('granted_at', { ascending: false });

    if (request.user_id) {
      query = query.eq('user_id', request.user_id);
    }

    const { data: roles, error: rolesError } = await query;

    if (rolesError) {
      console.error('Error listing roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to list roles', details: rolesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully listed ${roles?.length || 0} roles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        roles: roles || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handleListRoles:', error);
    throw error;
  }
}

async function handleGetUserRole(supabase: any, request: GetUserRoleRequest) {
  try {
    console.log(`Getting highest role for user ${request.user_id}`);

    // Get user's highest role using our database function
    const { data: highestRole } = await supabase
      .rpc('get_highest_account_role', { p_user_id: request.user_id });

    // Get all user's roles with details
    const { data: allRoles, error: rolesError } = await supabase
      .from('account_roles')
      .select(`
        id,
        role_name,
        granted_at,
        granted_by,
        notes,
        granted_by_profile:profiles!account_roles_granted_by_fkey(first_name, last_name, email)
      `)
      .eq('user_id', request.user_id)
      .eq('is_active', true)
      .order('granted_at', { ascending: false });

    if (rolesError) {
      console.error('Error getting user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to get user roles', details: rolesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`User ${request.user_id} highest role: ${highestRole}, total roles: ${allRoles?.length || 0}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        highest_role: highestRole,
        all_roles: allRoles || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handleGetUserRole:', error);
    throw error;
  }
}