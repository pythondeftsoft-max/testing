import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the calling user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !callingUser) {
      throw new Error('Unauthorized')
    }

    // Verify the calling user is a super admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('system_admins')
      .select('role_name, is_active')
      .eq('user_id', callingUser.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminCheck) {
      throw new Error('Access denied: Admin privileges required')
    }

    if (adminCheck.role_name !== 'super_admin') {
      throw new Error('Access denied: Super admin privileges required')
    }

    // Parse request body
    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      throw new Error('Missing required fields: userId and newPassword')
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Get target user details
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError || !targetUser) {
      throw new Error('User not found')
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      // Detect Supabase's HaveIBeenPwned / weak password rejection
      const msg = updateError.message || ''
      if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('easy to guess')) {
        return jsonResponse({
          success: false,
          error: 'This password has appeared in known data breaches and was rejected by Supabase. Please choose a stronger, more unique password.'
        })
      }
      throw new Error(`Failed to update password: ${msg}`)
    }

    // Log to security audit
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    await supabaseAdmin.rpc('log_security_audit_event', {
      p_event_type: 'admin_password_reset',
      p_user_id: callingUser.id,
      p_resource_type: 'user_account',
      p_resource_id: userId,
      p_action: 'direct_password_reset',
      p_ip_address: clientIp,
      p_user_agent: userAgent,
      p_metadata: {
        target_user_email: targetUser.user.email,
        admin_email: callingUser.email,
        admin_role: adminCheck.role_name,
        timestamp: new Date().toISOString()
      },
      p_severity: 'medium'
    })

    console.log(`Password reset by admin: ${callingUser.email} reset password for user: ${targetUser.user.email}`)

    return jsonResponse({ 
      success: true,
      message: 'Password updated successfully',
      userEmail: targetUser.user.email
    })

  } catch (error: any) {
    console.error('Error in admin-set-password:', error)

    const message = (error instanceof Error ? error.message : String(error)) || 'An unexpected error occurred'
    const status = [
      'No authorization header',
      'Unauthorized',
      'Access denied: Admin privileges required',
      'Access denied: Super admin privileges required',
      'Missing required fields: userId and newPassword',
      'Password must be at least 8 characters long',
      'User not found',
    ].includes(message)
      ? 400
      : 500

    return jsonResponse({ 
      error: message,
      success: false
    }, status)
  }
})
