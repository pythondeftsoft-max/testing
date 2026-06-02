import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const requestData = await req.json()
    console.log('Security monitoring request:', requestData)

    // Extract client IP from headers (more secure than client-side)
    const clientIP = req.headers.get('x-forwarded-for') 
      || req.headers.get('x-real-ip') 
      || 'unknown'

    // Enhanced event data with server-side IP
    const eventData = {
      ...requestData,
      ip_address: clientIP,
      server_timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID()
    }

    // Log the security event
    const { data: logData, error: logError } = await supabaseClient.rpc('log_security_audit', {
      p_event_type: eventData.event_type,
      p_user_id: eventData.user_id || null,
      p_resource_type: eventData.resource_type || null,
      p_resource_id: eventData.resource_id || null,
      p_action: eventData.action || 'monitor',
      p_ip_address: clientIP,
      p_user_agent: eventData.user_agent || null,
      p_metadata: {
        ...eventData.metadata,
        server_timestamp: eventData.server_timestamp,
        request_id: eventData.request_id
      },
      p_severity: eventData.severity || 'info'
    })

    if (logError) {
      console.error('Failed to log security event:', logError)
      throw new Error('Logging failed')
    }

    // Detect security incidents
    await detectSecurityIncidents(supabaseClient, eventData)

    console.log('Security event logged successfully:', logData)

    // Rate limiting check
    if (eventData.user_id) {
      const rateLimitCheck = await checkRateLimit(supabaseClient, eventData.user_id, eventData.event_type)
      if (!rateLimitCheck.allowed) {
        console.log('Rate limit exceeded for user:', eventData.user_id)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded',
            retry_after: rateLimitCheck.retry_after 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        audit_id: logData,
        message: 'Security event logged successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Security monitoring error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal security monitoring error' // Sanitized error message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function checkRateLimit(supabaseClient: any, userId: string, eventType: string) {
  try {
    const { data, error } = await supabaseClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: eventType,
      p_max_attempts: getMaxRequestsForEventType(eventType),
      p_window_minutes: 15
    })

    if (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true } // Fail open for availability
    }

    return { 
      allowed: data,
      retry_after: data ? 0 : 900 // 15 minutes
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true } // Fail open
  }
}

async function detectSecurityIncidents(supabaseClient: any, eventData: any) {
  try {
    const incidents = []

    // Check for multiple failed login attempts
    if (eventData.event_type === 'failed_login_attempt') {
      const { data: recentFailures } = await supabaseClient
        .from('security_audit_logs')
        .select('id')
        .eq('user_id', eventData.user_id)
        .eq('event_type', 'failed_login_attempt')
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .limit(5)

      if (recentFailures && recentFailures.length >= 3) {
        incidents.push({
          incident_type: 'multiple_failed_logins',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          description: `${recentFailures.length} failed login attempts in 5 minutes`,
          affected_user_id: eventData.user_id,
          detection_method: 'automated_pattern_detection'
        })
      }
    }

    // Check for suspicious IP activity
    if (eventData.ip_address && eventData.ip_address !== 'unknown') {
      const { data: ipActivity } = await supabaseClient
        .from('security_audit_logs')
        .select('user_id')
        .eq('ip_address', eventData.ip_address)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .limit(10)

      if (ipActivity && ipActivity.length > 0) {
        const uniqueUsers = [...new Set(ipActivity.map(a => a.user_id))].filter(Boolean)
        if (uniqueUsers.length >= 3) {
          incidents.push({
            incident_type: 'suspicious_ip_activity',
            severity: 'medium',
            title: 'Suspicious IP Activity',
            description: `IP ${eventData.ip_address} accessed ${uniqueUsers.length} different user accounts`,
            detection_method: 'automated_pattern_detection'
          })
        }
      }
    }

    // Check for high-severity events
    if (eventData.severity === 'critical' || eventData.severity === 'high') {
      incidents.push({
        incident_type: 'high_severity_event',
        severity: eventData.severity,
        title: `${eventData.severity.toUpperCase()} Security Event`,
        description: `${eventData.event_type} event detected`,
        affected_user_id: eventData.user_id,
        detection_method: 'severity_threshold'
      })
    }

    // Create security incidents
    for (const incident of incidents) {
      await supabaseClient
        .from('security_incidents')
        .insert({
          incident_type: incident.incident_type,
          severity: incident.severity,
          title: incident.title,
          description: incident.description,
          affected_user_id: incident.affected_user_id || null,
          detection_method: incident.detection_method,
          metadata: {
            source_event: eventData,
            detected_at: new Date().toISOString()
          }
        })
    }

  } catch (error) {
    console.error('Incident detection error:', error)
    // Don't throw - security monitoring should not break main flow
  }
}

function getMaxRequestsForEventType(eventType: string): number {
  const limits: Record<string, number> = {
    'failed_login_attempt': 3,
    'user_login': 10,
    'payment_attempt': 5,
    'suspicious_activity': 1,
    'password_reset': 3,
    'property_search': 50,
    'application_submit': 5,
    'message_send': 20,
    'document_upload': 10,
    'default': 20
  }
  
  return limits[eventType] || limits.default
}