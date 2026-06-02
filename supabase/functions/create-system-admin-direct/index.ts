import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAdminRequest {
  email: string;
  password: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get JWT from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a super admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('system_admins')
      .select('role_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck || adminCheck.role_name !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create admin accounts directly' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, role, first_name, last_name, phone, notes }: CreateAdminRequest = await req.json();

    // Validate required fields
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists in auth
    const { data: existingAuthUsers, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error listing users:', listUsersError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingAuthUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      // User already exists - check if they already have admin access
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('system_admins')
        .select('role_name, is_active')
        .eq('user_id', existingUser.id)
        .single();

      if (adminCheckError && adminCheckError.code !== 'PGRST116') {
        console.error('Error checking admin status:', adminCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check admin status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (adminCheck?.is_active) {
        return new Response(
          JSON.stringify({ 
            error: `This user already has active ${adminCheck.role_name} access` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Grant admin access to existing user
      const { error: adminError2 } = await supabase
        .from('system_admins')
        .insert({
          user_id: existingUser.id,
          role_name: role,
          granted_by: user.id,
          notes: notes || null,
          is_active: true,
        });

      if (adminError2) {
        console.error('Error granting admin access:', adminError2);
        return new Response(
          JSON.stringify({ error: 'Failed to grant system admin access' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`System admin access granted to existing user: ${email}`);

      // Update the password for the existing user
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );

      if (passwordError) {
        console.error('Error updating password for existing user:', passwordError);
        // Continue anyway - admin access was granted
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'System admin access granted, but password update failed. Please reset password manually.',
            userId: existingUser.id 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Password updated for existing user: ${email}`);

      // Log to security audit
      const { error: auditError } = await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'grant_system_admin_existing_user',
          resource_type: 'system_admin',
          resource_id: existingUser.id,
          metadata: {
            admin_email: email,
            role: role,
            was_existing_user: true,
            password_updated: true,
          },
        });

      if (auditError) {
        console.error('Error logging to audit:', auditError);
      }

      console.log(`System admin access granted to existing user: ${email} (${role})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: existingUser.id,
            email: email,
          },
          message: 'System admin access granted and password updated'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // User doesn't exist - create new user in Supabase Auth
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone,
        user_type: 'admin',
      },
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating user:', createUserError);
      return new Response(
        JSON.stringify({ error: createUserError?.message || 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        user_type: 'admin',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail - profile might already exist from trigger
    }

    // Add to system_admins table
    const { error: adminError2 } = await supabase
      .from('system_admins')
      .insert({
        user_id: newUser.user.id,
        role_name: role,
        granted_by: user.id,
        notes: notes || null,
        is_active: true,
      });

    if (adminError2) {
      console.error('Error adding system admin:', adminError2);
      return new Response(
        JSON.stringify({ error: 'Failed to grant system admin access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to security audit
    const { error: auditError } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: 'create_system_admin_direct',
        resource_type: 'system_admin',
        resource_id: newUser.user.id,
        metadata: {
          admin_email: email,
          role: role,
          created_directly: true,
          has_name: !!(first_name && last_name),
        },
      });

    if (auditError) {
      console.error('Error logging to audit:', auditError);
      // Don't fail - audit is not critical
    }

    console.log(`System admin created directly: ${email} (${role})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: email,
        },
        message: 'System admin created successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in create-system-admin-direct:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
