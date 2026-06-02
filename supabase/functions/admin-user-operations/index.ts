import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminOperationRequest {
  operation: 'change_email' | 'update_status' | 'delete_user' | 'create_user' | 'reset_mfa' | 'update_mfa_enforcement' | 'invite_agency_staff' | 'create_agency_staff_with_password';
  userId?: string;
  newEmail?: string;
  status?: 'active' | 'suspended';
  // create_user fields
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  company_name?: string;
  phone?: string;
  // update_mfa_enforcement fields
  role_name?: string;
  required?: boolean;
  // invite_agency_staff fields
  agency_id?: string;
  staff_role?: string;
  redirect_to?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get auth header and verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body: AdminOperationRequest = await req.json();
    const { operation, userId, newEmail, status } = body;

    console.log('Admin operation request:', { operation, userId });

    // 3. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client for permission checks using the user's token
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Admin client for performing privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Get requesting user
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      console.error('Failed to get requesting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verify requesting user has admin permissions
    const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc('is_admin', {
      user_id: requestingUser.id,
    });

    if (adminCheckError) {
      console.error('Admin check error:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      console.warn('Non-admin user attempted admin operation:', requestingUser.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Perform the requested operation
    let result;
    switch (operation) {
      case 'change_email':
        if (!newEmail) {
          return new Response(
            JSON.stringify({ error: 'newEmail is required for change_email operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await changeEmail(supabaseAdmin, userId!, newEmail);
        break;

      case 'update_status':
        if (!status) {
          return new Response(
            JSON.stringify({ error: 'status is required for update_status operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await updateStatus(supabaseAdmin, userId!, status);
        break;

      case 'delete_user':
        result = await deleteUser(supabaseAdmin, userId!);
        break;

      case 'create_user':
        if (!body.email || !body.password || !body.first_name || !body.last_name || !body.user_type) {
          return new Response(
            JSON.stringify({ error: 'email, password, first_name, last_name, and user_type are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createUser(supabaseAdmin, body);
        break;

      case 'reset_mfa':
        result = await resetMfa(supabaseAdmin, userId!, requestingUser.id);
        break;

      case 'update_mfa_enforcement':
        if (!body.role_name || typeof body.required !== 'boolean') {
          return new Response(
            JSON.stringify({ error: 'role_name (string) and required (boolean) are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await updateMfaEnforcement(supabaseAdmin, body.role_name, body.required, requestingUser.id);
        break;

      case 'invite_agency_staff':
        if (!body.email || !body.agency_id || !body.staff_role) {
          return new Response(
            JSON.stringify({ success: false, error: 'email, agency_id, and staff_role are required' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await inviteAgencyStaff(supabaseAdmin, body, requestingUser.id);
        break;

      case 'create_agency_staff_with_password':
        if (!body.email || !body.password || !body.agency_id || !body.staff_role) {
          return new Response(
            JSON.stringify({ success: false, error: 'email, password, agency_id, and staff_role are required' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createAgencyStaffWithPassword(supabaseAdmin, body, requestingUser.id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('Operation completed successfully:', { operation, userId });
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Admin operation error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createUser(supabaseAdmin: any, body: AdminOperationRequest) {
  console.log('Creating user:', body.email);

  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      first_name: body.first_name,
      last_name: body.last_name,
      user_type: body.user_type,
      company_name: body.company_name || '',
      phone: body.phone || '',
    }
  });

  if (authError) {
    console.error('Failed to create user:', authError);
    throw authError;
  }

  console.log('User created successfully:', newUser.user.id);
  return { success: true, userId: newUser.user.id, message: 'User created successfully' };
}

async function changeEmail(supabaseAdmin: any, userId: string, newEmail: string) {
  console.log('Changing email for user:', userId, 'to:', newEmail);
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw new Error('Invalid email format');
  }

  // Get user's current email for reference
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData) {
    console.error('Failed to get user data:', userError);
    throw new Error('Failed to get user information');
  }

  // Update email in auth.users and mark as unverified
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: false,
  });

  if (error) {
    console.error('Failed to update email:', error);
    throw error;
  }

  // Generate confirmation link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: newEmail,
  });

  if (linkError) {
    console.error('Failed to generate confirmation link:', linkError);
  }

  // Log the email change to email_queue for tracking
  const confirmationLink = linkData?.properties?.action_link || 'Confirmation link will be sent';
  
  const { error: queueError } = await supabaseAdmin
    .from('email_queue')
    .insert({
      user_id: userId,
      subject: 'Confirm Your New Email Address',
      body: `
        <h2>Email Address Change Confirmation</h2>
        <p>Your email address has been updated by an administrator.</p>
        <p><strong>Previous email:</strong> ${userData.user.email}</p>
        <p><strong>New email:</strong> ${newEmail}</p>
        <p>Please confirm your new email address by clicking the link below:</p>
        <p><a href="${confirmationLink}">Confirm Email Address</a></p>
        <p>If you did not request this change, please contact support immediately.</p>
      `,
      status: 'pending',
      email_type: 'auth_confirmation',
      auth_metadata: {
        previous_email: userData.user.email,
        new_email: newEmail,
        action_type: 'email_change',
        changed_by: 'admin'
      }
    });

  if (queueError) {
    console.error('Failed to log email change to queue:', queueError);
    // Don't fail the entire operation if logging fails
  } else {
    console.log('Email change logged to queue for tracking');
    
    // Trigger email processing
    try {
      await supabaseAdmin.functions.invoke('process-email-queue');
      console.log('Email queue processing triggered');
    } catch (processError) {
      console.error('Failed to trigger email processing:', processError);
    }
  }

  console.log('Email updated successfully and confirmation email queued');
  return { success: true, message: 'Email updated successfully. Confirmation email has been queued and tracked.' };
}

async function updateStatus(supabaseAdmin: any, userId: string, status: 'active' | 'suspended') {
  console.log('Updating status for user:', userId, 'to:', status);

  if (status === 'suspended') {
    // Suspend user by setting banned_until to far future
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '876000h', // ~100 years
    });

    if (error) {
      console.error('Failed to suspend user:', error);
      throw error;
    }
  } else if (status === 'active') {
    // Unsuspend user by clearing ban
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (error) {
      console.error('Failed to activate user:', error);
      throw error;
    }
  }

  console.log('Status updated successfully');
  return { success: true, message: 'Status updated successfully' };
}

async function deleteUser(supabaseAdmin: any, userId: string) {
  console.log('Deleting user:', userId);

  try {
    // COMPREHENSIVE CLEANUP: Clear ALL foreign key references before deletion
    // This ensures admin delete ALWAYS works regardless of what data exists
    console.log('Starting comprehensive cleanup of all user references...');

    // ===== PRE-STEP: Get tenant's name for historical preservation on payments =====
    const { data: tenantProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();
    
    const tenantName = tenantProfile 
      ? `${tenantProfile.first_name || ''} ${tenantProfile.last_name || ''}`.trim() || 'Deleted User'
      : 'Deleted User';
    console.log('Preserving tenant name for payment records:', tenantName);

    // ===== AUTOPAY SCHEDULES - DEACTIVATE (prevents future charges) =====
    await supabaseAdmin
      .from('autopay_schedules')
      .update({ status: 'cancelled', tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Deactivated autopay_schedules');

    // ===== PAYMENT METHODS - DELETE (saved payment methods) =====
    await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('user_id', userId);
    console.log('Deleted payment_methods');

    // ===== STRIPE CUSTOMER - DELETE (prevents orphaned charges) =====
    if (tenantProfile?.stripe_customer_id) {
      try {
        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeKey) {
          const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default;
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
          await stripe.customers.del(tenantProfile.stripe_customer_id);
          console.log('Deleted Stripe customer:', tenantProfile.stripe_customer_id);
        }
      } catch (stripeError) {
        console.error('Error deleting Stripe customer:', stripeError);
        // Continue anyway - non-critical
      }
    }

    // ===== PRESERVE TENANT NAME ON PAYMENT RECORDS BEFORE NULLING TENANT_ID =====
    // Update rent_payments with tenant_name so historical records show who paid
    await supabaseAdmin
      .from('rent_payments')
      .update({ tenant_name: tenantName })
      .eq('tenant_id', userId)
      .is('tenant_name', null);
    console.log('Preserved tenant_name on rent_payments');

    // Update hap_payments with tenant_name
    await supabaseAdmin
      .from('hap_payments')
      .update({ tenant_name: tenantName })
      .eq('tenant_id', userId)
      .is('tenant_name', null);
    console.log('Preserved tenant_name on hap_payments');
    
    // ===== FIRST: Get tenant_profile.id (different from user id!) =====
    // property_units.primary_applicant_id references tenant_profiles.id, NOT profiles.id
    const { data: tenantProfileRecord } = await supabaseAdmin
      .from('tenant_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    const tenantProfileId = tenantProfileRecord?.id;
    console.log('Found tenant_profile.id:', tenantProfileId, 'for user_id:', userId);
    
    // ===== PROPERTY UNITS (use tenant_profile.id, not user id!) =====
    if (tenantProfileId) {
      await supabaseAdmin
        .from('property_units')
        .update({ primary_applicant_id: null })
        .eq('primary_applicant_id', tenantProfileId);
      console.log('Cleared property_units.primary_applicant_id using tenant_profile.id');
    }
    
    // ===== MARKETPLACE APPLICATIONS =====
    await supabaseAdmin
      .from('marketplace_applications')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared marketplace_applications.tenant_id');
    
    // ===== TENANT MESSAGES =====
    await supabaseAdmin
      .from('tenant_messages')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('tenant_messages')
      .update({ landlord_id: null })
      .eq('landlord_id', userId);
    console.log('Cleared tenant_messages references');
    
    // ===== MAINTENANCE REQUESTS =====
    await supabaseAdmin
      .from('maintenance_requests')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('maintenance_requests')
      .update({ cost_approved_by: null })
      .eq('cost_approved_by', userId);
    console.log('Cleared maintenance_requests references');
    
    // ===== LEASE RENEWALS =====
    await supabaseAdmin
      .from('lease_renewals')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('lease_renewals')
      .update({ initiated_by: null })
      .eq('initiated_by', userId);
    console.log('Cleared lease_renewals references');
    
    // ===== RENT PAYMENTS =====
    await supabaseAdmin
      .from('rent_payments')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('rent_payments')
      .update({ recorded_by: null })
      .eq('recorded_by', userId);
    console.log('Cleared rent_payments references');
    
    // ===== HAP PAYMENTS =====
    await supabaseAdmin
      .from('hap_payments')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('hap_payments')
      .update({ recorded_by: null })
      .eq('recorded_by', userId);
    await supabaseAdmin
      .from('hap_payments')
      .update({ verified_by: null })
      .eq('verified_by', userId);
    console.log('Cleared hap_payments references');
    
    // ===== VOUCHER TRACKING =====
    await supabaseAdmin
      .from('voucher_tracking')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared voucher_tracking.tenant_id');
    
    // ===== RECURRING CHARGES =====
    await supabaseAdmin
      .from('recurring_charges')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared recurring_charges.tenant_id');
    
    // ===== PORTFOLIO ROLES =====
    await supabaseAdmin
      .from('portfolio_roles')
      .update({ added_by: null })
      .eq('added_by', userId);
    await supabaseAdmin
      .from('portfolio_roles')
      .delete()
      .eq('user_id', userId);
    console.log('Cleared portfolio_roles references and deleted user roles');
    
    // ===== ACCOUNT ROLES =====
    await supabaseAdmin
      .from('account_roles')
      .delete()
      .eq('user_id', userId);
    console.log('Deleted account_roles for user');
    
    // ===== ACCOUNT INVITATIONS =====
    await supabaseAdmin
      .from('account_invitations')
      .update({ invited_by: null })
      .eq('invited_by', userId);
    console.log('Cleared account_invitations.invited_by');
    
    // ===== APPOINTMENTS =====
    await supabaseAdmin
      .from('appointments')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared appointments.tenant_id');
    
    // ===== BACKGROUND CHECKS =====
    await supabaseAdmin
      .from('background_checks')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    await supabaseAdmin
      .from('background_checks')
      .update({ initiated_by: null })
      .eq('initiated_by', userId);
    console.log('Cleared background_checks references');
    
    // ===== TENANT PROFILES (delete using user_id column, not id!) =====
    await supabaseAdmin
      .from('tenant_profiles')
      .delete()
      .eq('user_id', userId);
    console.log('Deleted tenant_profiles record');
    
    // ===== RENT SPLITS =====
    await supabaseAdmin
      .from('rent_splits')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared rent_splits.tenant_id');
    
    // ===== LANDLORD PAYOUT PROFILES =====
    await supabaseAdmin
      .from('landlord_payout_profiles')
      .delete()
      .eq('landlord_id', userId);
    console.log('Deleted landlord_payout_profiles');
    
    // ===== LANDLORD PLACEMENT FEES =====
    await supabaseAdmin
      .from('landlord_placement_fees')
      .update({ landlord_id: null })
      .eq('landlord_id', userId);
    await supabaseAdmin
      .from('landlord_placement_fees')
      .update({ tenant_id: null })
      .eq('tenant_id', userId);
    console.log('Cleared landlord_placement_fees references');
    
    // ===== DELETED PROPERTIES (audit trail) =====
    await supabaseAdmin
      .from('deleted_properties')
      .update({ deleted_by: null })
      .eq('deleted_by', userId);
    await supabaseAdmin
      .from('deleted_properties')
      .update({ restored_by: null })
      .eq('restored_by', userId);
    console.log('Cleared deleted_properties references');
    
    // ===== SYSTEM CONFIG (audit trail) =====
    await supabaseAdmin
      .from('system_config')
      .update({ created_by: null })
      .eq('created_by', userId);
    await supabaseAdmin
      .from('system_config')
      .update({ updated_by: null })
      .eq('updated_by', userId);
    console.log('Cleared system_config references');
    
    // ===== POINTS ADMIN AUDIT (has NOT NULL constraint on admin_user_id) =====
    await supabaseAdmin
      .from('points_admin_audit')
      .delete()
      .eq('admin_user_id', userId);
    console.log('Deleted points_admin_audit records');
    
    // ===== SYSTEM ADMIN INVITATIONS (has NOT NULL constraint on invited_by) =====
    await supabaseAdmin
      .from('system_admin_invitations')
      .delete()
      .eq('invited_by', userId);
    console.log('Deleted system_admin_invitations records');
    
    // ===== TERRITORY WORKERS (has NO ACTION constraint on assigned_by) =====
    await supabaseAdmin
      .from('territory_workers')
      .update({ assigned_by: null })
      .eq('assigned_by', userId);
    console.log('Cleared territory_workers.assigned_by');
    
    console.log('All user references cleaned up successfully');

    // Step 1.5: Delete property_import_results for user's properties
    console.log('Cleaning up property import results...');
    const { data: userProperties } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('owner_id', userId);

    if (userProperties && userProperties.length > 0) {
      const propertyIds = userProperties.map((p: any) => p.id);
      
      const { error: importResultsError } = await supabaseAdmin
        .from('property_import_results')
        .delete()
        .in('property_id', propertyIds);
        
      if (importResultsError) {
        console.error('Error deleting property import results:', importResultsError);
        // Continue anyway - might not have import results
      } else {
        console.log('Property import results cleaned up for', propertyIds.length, 'properties');
      }
    }

    // Step 1.6: Delete system_admins record if user is an admin
    console.log('Checking and removing system_admins record...');
    const { error: adminDeleteError } = await supabaseAdmin
      .from('system_admins')
      .delete()
      .eq('user_id', userId);

    if (adminDeleteError) {
      console.error('Error deleting system_admins record:', adminDeleteError);
      // Continue anyway - user might not be an admin
    } else {
      console.log('System_admins record removed (if existed)');
    }

    // Step 2: Delete the profile (should succeed now)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to delete profile:', profileError);
      throw new Error(`Database error deleting user: ${profileError.message}`);
    }
    
    console.log('Profile deleted successfully');

    // Step 3: Delete all auth-related data using RPC
    const { error: authCleanupError } = await supabaseAdmin
      .rpc('delete_auth_user_data', { target_user_id: userId });

    if (authCleanupError) {
      console.error('Failed to cleanup auth data:', authCleanupError);
      // Continue anyway
    } else {
      console.log('Auth data cleaned up successfully');
    }

    // Step 4: Delete from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Failed to delete user from auth:', error);
      throw new Error(`Auth error deleting user: ${(error instanceof Error ? error.message : String(error))}`);
    }

    console.log('User deleted successfully from all systems');
    return { success: true, message: 'User deleted successfully' };
    
  } catch (error: any) {
    console.error('Error in deleteUser:', error);
    throw new Error((error instanceof Error ? error.message : String(error)) || 'Failed to delete user');
  }
}

/**
 * Reset MFA for a user — admin escape hatch when a user loses their device
 * AND backup codes. Deletes all enrolled factors and clears user_mfa_settings.
 */
async function resetMfa(supabaseAdmin: any, userId: string, requestingAdminId: string) {
  console.log('[reset_mfa] admin', requestingAdminId, 'resetting MFA for user', userId);
  try {
    const { data: factorList, error: listErr } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
    if (listErr) throw listErr;

    const factors = factorList?.factors ?? [];
    let deleted = 0;
    for (const f of factors) {
      const { error: delErr } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
      if (delErr) {
        console.warn('[reset_mfa] failed to delete factor', f.id, delErr);
      } else {
        deleted++;
      }
    }

    // Clear our tracking row
    await supabaseAdmin.from('user_mfa_settings').delete().eq('user_id', userId);

    // Audit log (best-effort — table may not exist yet)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: requestingAdminId,
        action: 'mfa_reset',
        target_user_id: userId,
        metadata: { factors_deleted: deleted },
      });
    } catch (e) {
      console.log('[reset_mfa] audit log skipped:', e);
    }

    return { success: true, factors_deleted: deleted };
  } catch (error: any) {
    console.error('[reset_mfa] error:', error);
    throw new Error((error instanceof Error ? error.message : String(error)) || 'Failed to reset MFA');
  }
}

async function updateMfaEnforcement(
  supabaseAdmin: any,
  roleName: string,
  required: boolean,
  requestingAdminId: string,
) {
  console.log('[update_mfa_enforcement]', { roleName, required, requestingAdminId });

  const { data, error } = await supabaseAdmin
    .from('mfa_enforcement_config')
    .update({
      required,
      updated_at: new Date().toISOString(),
      updated_by: requestingAdminId,
    })
    .eq('role_name', roleName)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[update_mfa_enforcement] error:', error);
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(`Unknown role: ${roleName}`);
  }

  // Audit log (best-effort)
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      user_id: requestingAdminId,
      action: 'mfa_enforcement_update',
      allowed: true,
      metadata: { role_name: roleName, required },
    });
  } catch (e) {
    console.log('[update_mfa_enforcement] audit log skipped:', e);
  }

  return { success: true, role_name: roleName, required };
}

/**
 * Invite a user to become agency staff. Creates the auth user (or finds an
 * existing one), inserts an `agency_staff` row, and emails an invite link.
 */
async function inviteAgencyStaff(
  supabaseAdmin: any,
  body: AdminOperationRequest,
  requestingAdminId: string
) {
  const email = (body.email || '').trim().toLowerCase();
  const agencyId = body.agency_id!;
  const role = body.staff_role!;
  const firstName = body.first_name || '';
  const lastName = body.last_name || '';
  const redirectTo = body.redirect_to || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/agency/onboarding`;

  // 1. Look up or invite the user
  let userId: string | null = null;
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id')
    .eq('email', email)
    .maybeSingle();

  if (existing?.user_id) {
    userId = existing.user_id;
  } else {
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        first_name: firstName,
        last_name: lastName,
        user_type: 'agency_staff',
      },
    });
    if (inviteErr || !invited?.user) {
      return { success: false, error: inviteErr?.message || 'Failed to invite user' };
    }
    userId = invited.user.id;
  }

  // 2. Upsert agency_staff row
  const { error: staffErr } = await supabaseAdmin
    .from('agency_staff')
    .upsert(
      {
        agency_id: agencyId,
        user_id: userId,
        role,
        is_active: true,
        invited_by: requestingAdminId,

      },
      { onConflict: 'agency_id,user_id' }
    );

  if (staffErr) {
    console.warn('[invite_agency_staff] staff upsert error:', staffErr);
    return { success: false, error: staffErr.message };
  }

  // 3. Activity log (best-effort)
  try {
    await supabaseAdmin.from('agency_activity_log').insert({
      agency_id: agencyId,
      actor_id: requestingAdminId,
      action: 'staff_invited',
      entity_type: 'agency_staff',
      entity_id: userId,
      metadata: { email, role },
    });
  } catch (e) {
    console.log('[invite_agency_staff] activity log skipped:', e);
  }

  return { success: true, user_id: userId, agency_id: agencyId, role };
}

/**
 * Admin-assisted: create an agency staff user with a temporary password.
 * The user is forced to reset password on next login via must_change_password flag.
 */
async function createAgencyStaffWithPassword(
  supabaseAdmin: any,
  body: AdminOperationRequest,
  requestingAdminId: string
) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password!;
  const agencyId = body.agency_id!;
  const role = body.staff_role!;
  const firstName = body.first_name || '';
  const lastName = body.last_name || '';

  // Check if user already exists
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id')
    .eq('email', email)
    .maybeSingle();

  let userId: string | null = existing?.user_id || null;

  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: 'agency_staff',
        must_change_password: true,
      },
    });
    if (createErr || !created?.user) {
      return { success: false, error: createErr?.message || 'Failed to create user' };
    }
    userId = created.user.id;
  } else {
    // Existing user: just update password & flag
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { must_change_password: true },
    });
  }

  // Upsert agency_staff
  const { error: staffErr } = await supabaseAdmin
    .from('agency_staff')
    .upsert(
      {
        agency_id: agencyId,
        user_id: userId,
        role,
        is_active: true,
        invited_by: requestingAdminId,
      },
      { onConflict: 'agency_id,user_id' }
    );

  if (staffErr) {
    return { success: false, error: staffErr.message };
  }

  try {
    await supabaseAdmin.from('agency_activity_log').insert({
      agency_id: agencyId,
      actor_id: requestingAdminId,
      action: 'staff_created_with_password',
      entity_type: 'agency_staff',
      entity_id: userId,
      metadata: { email, role },
    });
  } catch (e) {
    console.log('[create_agency_staff_with_password] activity log skipped:', e);
  }

  return { success: true, user_id: userId, agency_id: agencyId, role };
}
