import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLogRbacEvent } from '@/hooks/useLogRbacEvent';

export default function RouteAccessLogger() {
  const location = useLocation();
  const { mutate: logEvent } = useLogRbacEvent();
  
  useEffect(() => {
    // Check localStorage toggles
    const loggingEnabled = localStorage.getItem('rbac:log:enabled') !== 'false';
    const allowedLoggingEnabled = localStorage.getItem('rbac:log:allowed:enabled') === 'true';
    const samplingRate = parseInt(localStorage.getItem('rbac:log:sampling') || '100', 10);
    
    // Only log if allowed logging is enabled and we pass sampling
    if (!loggingEnabled || !allowedLoggingEnabled) return;
    if (Math.random() * 100 > samplingRate) return;
    
    // Very low sampling for route access (5% of the already sampled traffic)
    if (Math.random() > 0.05) return;
    
    // Check if we've already logged this route in this session
    const sessionKey = `route_logged_${location.pathname}`;
    if (sessionStorage.getItem(sessionKey)) return;
    
    // Log the route access
    logEvent({
      scope: 'account',
      object: 'route',
      action: 'view',
      allowed: true,
      source: 'route_logger',
      route: location.pathname,
      metadata: {
        search: location.search,
        hash: location.hash,
        route_visit: true
      }
    });
    
    // Mark as logged for this session
    sessionStorage.setItem(sessionKey, 'true');
  }, [location.pathname, logEvent]);
  
  return null;
}