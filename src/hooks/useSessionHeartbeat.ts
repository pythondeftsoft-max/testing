import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SessionHeartbeatOptions {
  interval?: number; // in milliseconds, default 5 minutes
  enabled?: boolean;
}

export const useSessionHeartbeat = (options: SessionHeartbeatOptions = {}) => {
  const { interval = 5 * 60 * 1000, enabled = true } = options; // 5 minutes default
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();
  const visibilityTimeoutRef = useRef<NodeJS.Timeout>();

  const updateSessionActivity = async () => {
    if (!user?.id) return;

    try {
      // Update the session's last activity timestamp
      await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      
    } catch (error) {
      // Non-blocking - session tracking should never affect the app
      console.warn('Session heartbeat error (non-blocking):', error);
    }
  };

  const createOrUpdateSession = async () => {
    if (!user?.id) return;

    try {
      const userAgent = navigator.userAgent;
      const sessionToken = await supabase.auth.getSession()
        .then(({ data }) => data.session?.access_token || 'unknown');

      // Skip if we couldn't get a valid token
      if (sessionToken === 'unknown') return;

      const riskScore = calculateRiskScore(userAgent);

      // Use the composite unique constraint (user_id, session_token)
      const { error: upsertError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_token: sessionToken,
          ip_address: null, // Would need server-side detection
          user_agent: userAgent,
          device_fingerprint: generateDeviceFingerprint(),
          is_active: true,
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          mfa_verified: false, // Would be updated by MFA flow
          risk_score: riskScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,session_token'
        });

      if (upsertError) {
        // Log but don't throw - session tracking is non-critical
        console.warn('Session tracking error (non-blocking):', upsertError.message);
      } else {
        
      }
    } catch (error) {
      // Silently fail - session tracking should never block the app
      console.warn('Session management error (non-blocking):', error);
    }
  };

  const calculateRiskScore = (userAgent: string): number => {
    let risk = 0;

    // Browser-based risk factors
    if (userAgent.includes('Chrome')) risk += 10;
    if (userAgent.includes('Firefox')) risk += 15;
    if (userAgent.includes('Safari')) risk += 5;
    if (userAgent.includes('Edge')) risk += 20;

    // Mobile vs Desktop
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) risk += 25;

    // Time-based risk (higher during off-hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) risk += 30;

    // Keep risk score between 0-100
    return Math.min(risk, 100);
  };

  const generateDeviceFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  };

  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Delay initial session creation by 5s to prioritize dashboard render
    const initialDelay = setTimeout(() => {
      createOrUpdateSession().catch(() => {});
    }, 5000);

    // Set up heartbeat interval
    intervalRef.current = setInterval(() => {
      updateSessionActivity().catch(() => {});
    }, interval);

    // Debounced visibility change handler to prevent rapid-fire calls
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any pending timeout
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        // 1 second debounce to prevent rapid-fire calls
        visibilityTimeoutRef.current = setTimeout(() => {
          updateSessionActivity().catch(() => {});
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, enabled, interval]);

  // Cleanup session on unmount/logout (fire-and-forget)
  useEffect(() => {
    return () => {
      if (user?.id) {
        try {
          supabase
            .from('user_sessions')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('is_active', true)
            .then(() => {});
        } catch {
          // Silently fail - cleanup should never throw
        }
      }
    };
  }, [user?.id]);

  return {
    updateSessionActivity,
    createOrUpdateSession
  };
};
