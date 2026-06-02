import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput, validateEmailSecure, validateUrlSecure } from '@/utils/inputValidation';

export interface SecurityAuditEvent {
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'info' | 'medium' | 'high' | 'critical';
}

export const useSecurityAudit = () => {
  const logSecurityEvent = useCallback(async (event: SecurityAuditEvent) => {
    try {
      // Sanitize all string inputs to prevent injection
      const sanitizedEvent = {
        event_type: sanitizeInput(event.event_type),
        user_id: event.user_id,
        resource_type: event.resource_type ? sanitizeInput(event.resource_type) : null,
        resource_id: event.resource_id ? sanitizeInput(event.resource_id) : null,
        action: event.action ? sanitizeInput(event.action) : 'audit',
        severity: event.severity || 'info'
      };

      // Get client info for enhanced logging (sanitized)
      const userAgent = sanitizeInput(navigator.userAgent).slice(0, 500);
      const timestamp = new Date().toISOString();
      
      // Use server-side IP detection for security
      let clientIP = 'client_request'; // Server will detect actual IP

      // Sanitize metadata
      const sanitizedMetadata = event.metadata ? Object.fromEntries(
        Object.entries(event.metadata).map(([key, value]) => [
          sanitizeInput(key),
          typeof value === 'string' ? sanitizeInput(value) : value
        ])
      ) : {};

      // Add 5-second timeout to prevent blocking the UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Security logging timeout')), 5000)
      );

      const rpcPromise = supabase.rpc('log_security_audit_event', {
        p_event_type: sanitizedEvent.event_type,
        p_user_id: sanitizedEvent.user_id,
        p_resource_type: sanitizedEvent.resource_type,
        p_resource_id: sanitizedEvent.resource_id,
        p_action: sanitizedEvent.action,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_metadata: {
          ...sanitizedMetadata,
          client_timestamp: timestamp,
          page_url: sanitizeInput(window.location.href),
          referrer: sanitizeInput(document.referrer)
        },
        p_severity: sanitizedEvent.severity
      });

      // Race between the actual call and timeout
      const { error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (error) {
        // Suppress known non-critical errors (function overload, missing function)
        if (error.code === 'PGRST203' || error.code === '42883') {
          console.debug('Security audit skipped - function conflict');
          return;
        }
        console.warn('Security event logging failed:', error);
      }
    } catch (error) {
      // Don't re-throw - security logging should never break the app
      console.debug('Security audit logging error (non-blocking):', error);
    }
  }, []);

  const logAuthEvent = useCallback(async (
    eventType: 'user_login' | 'user_logout' | 'failed_login_attempt' | 'session_expired',
    userId?: string,
    metadata?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: eventType,
      user_id: userId,
      resource_type: 'auth_session',
      action: 'authenticate',
      metadata: {
        ...metadata,
        auth_provider: 'supabase'
      },
      severity: eventType === 'failed_login_attempt' ? 'medium' : 'info'
    });
  }, [logSecurityEvent]);

  const logResourceAccess = useCallback(async (
    resourceType: string,
    resourceId: string,
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: `${resourceType}_${action}`,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      metadata,
      severity: 'low'
    });
  }, [logSecurityEvent]);

  const logSuspiciousActivity = useCallback(async (
    activityType: string,
    userId?: string,
    metadata?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: `suspicious_${activityType}`,
      user_id: userId,
      resource_type: 'security_anomaly',
      action: 'detect_anomaly',
      metadata,
      severity: 'high'
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logAuthEvent,
    logResourceAccess,
    logSuspiciousActivity
  };
};