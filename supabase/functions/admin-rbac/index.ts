import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminRbacRequest {
  action: 'grant_portfolio_role' | 'revoke_portfolio_role' | 'update_portfolio_role' | 'bulk_role_operation' | 'simulate_permissions';
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Authorization: verify caller is an admin ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerUserId = claimsData.user.id;

    // Use service role client for admin check and all operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check account_roles for admin/super_admin
    const { data: accountRole } = await supabaseClient
      .from('account_roles')
      .select('role_name')
      .eq('user_id', callerUserId)
      .eq('is_active', true)
      .in('role_name', ['admin', 'super_admin']);

    // Also check system_admins
    const { data: systemAdmin } = await supabaseClient
      .from('system_admins')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('is_active', true)
      .limit(1);

    const isAdmin = (accountRole && accountRole.length > 0) || (systemAdmin && systemAdmin.length > 0);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ---- End authorization ----

    const { action, data } = await req.json() as AdminRbacRequest;

    console.log('Admin RBAC request:', { action, data, callerUserId });

    switch (action) {
      case 'grant_portfolio_role':
        return await handleGrantPortfolioRole(supabaseClient, data);
      case 'revoke_portfolio_role':
        return await handleRevokePortfolioRole(supabaseClient, data);
      case 'update_portfolio_role':
        return await handleUpdatePortfolioRole(supabaseClient, data);
      case 'bulk_role_operation':
        return await handleBulkRoleOperation(supabaseClient, data);
      case 'simulate_permissions':
        return await handleSimulatePermissions(supabaseClient, data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('Admin RBAC error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleGrantPortfolioRole(supabase: any, data: any) {
  const { portfolio_id, user_id, role_name, added_by } = data;

  // Check if role already exists
  const { data: existingRole } = await supabase
    .from('portfolio_roles')
    .select('*')
    .eq('portfolio_id', portfolio_id)
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single();

  if (existingRole) {
    // Update existing role
    const { error } = await supabase
      .from('portfolio_roles')
      .update({ 
        role_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRole.id);

    if (error) throw error;
  } else {
    // Create new role
    const { error } = await supabase
      .from('portfolio_roles')
      .insert({
        portfolio_id,
        user_id,
        role_name,
        added_by,
        is_active: true
      });

    if (error) throw error;
  }

  // Log the change
  await logRbacChange(supabase, {
    actor_user_id: added_by,
    target_user_id: user_id,
    portfolio_id,
    change_type: 'grant_role',
    scope: 'portfolio',
    new_value: { role_name }
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRevokePortfolioRole(supabase: any, data: any) {
  const { portfolio_id, user_id, revoked_by } = data;

  // Get current role for logging
  const { data: currentRole } = await supabase
    .from('portfolio_roles')
    .select('*')
    .eq('portfolio_id', portfolio_id)
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single();

  if (!currentRole) {
    throw new Error('Role not found');
  }

  // Deactivate the role
  const { error } = await supabase
    .from('portfolio_roles')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentRole.id);

  if (error) throw error;

  // Log the change
  await logRbacChange(supabase, {
    actor_user_id: revoked_by,
    target_user_id: user_id,
    portfolio_id,
    change_type: 'revoke_role',
    scope: 'portfolio',
    old_value: { role_name: currentRole.role_name }
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdatePortfolioRole(supabase: any, data: any) {
  const { portfolio_id, user_id, new_role_name, updated_by } = data;

  // Get current role for logging
  const { data: currentRole } = await supabase
    .from('portfolio_roles')
    .select('*')
    .eq('portfolio_id', portfolio_id)
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single();

  if (!currentRole) {
    throw new Error('Role not found');
  }

  // Update the role
  const { error } = await supabase
    .from('portfolio_roles')
    .update({ 
      role_name: new_role_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentRole.id);

  if (error) throw error;

  // Log the change
  await logRbacChange(supabase, {
    actor_user_id: updated_by,
    target_user_id: user_id,
    portfolio_id,
    change_type: 'update_role',
    scope: 'portfolio',
    old_value: { role_name: currentRole.role_name },
    new_value: { role_name: new_role_name }
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleBulkRoleOperation(supabase: any, data: any) {
  const { operations, performed_by } = data;
  const results = [];

  for (const operation of operations) {
    try {
      switch (operation.type) {
        case 'grant':
          await handleGrantPortfolioRole(supabase, {
            ...operation.data,
            added_by: performed_by
          });
          break;
        case 'revoke':
          await handleRevokePortfolioRole(supabase, {
            ...operation.data,
            revoked_by: performed_by
          });
          break;
        case 'update':
          await handleUpdatePortfolioRole(supabase, {
            ...operation.data,
            updated_by: performed_by
          });
          break;
      }
      results.push({ success: true, operation });
    } catch (error: any) {
      results.push({ success: false, operation, error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSimulatePermissions(supabase: any, data: any) {
  const { user_id, portfolio_id, permissions_to_check } = data;
  
  const results: Record<string, any> = {};
  
  for (const permission of permissions_to_check) {
    const { data: hasPermission } = await supabase.rpc('has_portfolio_permission', {
      p_user_id: user_id,
      p_portfolio_id: portfolio_id,
      p_object: permission.object,
      p_action: permission.action
    });
    
    results[`${permission.object}_${permission.action}`] = hasPermission;
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function logRbacChange(supabase: any, changeData: any) {
  try {
    await supabase
      .from('rbac_change_logs')
      .insert({
        ...changeData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log RBAC change:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}
