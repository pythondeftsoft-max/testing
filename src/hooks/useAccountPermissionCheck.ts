
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/providers/PermissionProvider';
import { useLogRbacEvent } from '@/hooks/useLogRbacEvent';

export const useAccountPermissionCheck = (
  objectName: string,
  action: 'view' | 'edit' | 'delete' | 'create'
) => {
  const { user } = useAuth();
  const { hasPermission: hasProviderPermission, loading: providerLoading } = usePermissions();
  const { mutate: logEvent } = useLogRbacEvent();
  
  // Try provider cache first
  const cachedPermission = hasProviderPermission(objectName, action, 'account');
  

  // Log cached permission checks
  useEffect(() => {
    if (cachedPermission !== undefined && !providerLoading) {
      const result = cachedPermission === 'via_grant' ? true : cachedPermission;
      
      // Check localStorage toggles for logging
      const loggingEnabled = localStorage.getItem('rbac:log:enabled') !== 'false';
      const allowedLoggingEnabled = localStorage.getItem('rbac:log:allowed:enabled') === 'true';
      const samplingRate = parseInt(localStorage.getItem('rbac:log:sampling') || '100', 10);
      
      // Determine if we should log this event
      const shouldLogDenied = !result && loggingEnabled;
      const shouldLogAllowed = result && allowedLoggingEnabled;
      const shouldLog = (shouldLogDenied || shouldLogAllowed) && (Math.random() * 100 <= samplingRate);
      
      if (shouldLog) {
        logEvent({
          scope: 'account',
          object: objectName,
          action,
          allowed: result,
          source: 'permission_provider',
          metadata: {
            hook_type: 'useAccountPermissionCheck',
            cached: true,
            cache_type: cachedPermission === 'via_grant' ? 'via_grant' : 'direct'
          }
        });
      }
    }
  }, [cachedPermission, providerLoading, objectName, action, logEvent]);

  return useQuery<boolean, Error>({
    queryKey: ['account-permission', objectName, action, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await (supabase as any).rpc('has_account_permission', {
        p_user_id: user.id,
        p_object: objectName,
        p_action: action
      });

      if (error) {
        console.error('Error checking account permission:', error);
        return false;
      }

      // Log the permission check result
      const result = data as boolean;
      
      // Check localStorage toggles for logging
      const loggingEnabled = localStorage.getItem('rbac:log:enabled') !== 'false';
      const allowedLoggingEnabled = localStorage.getItem('rbac:log:allowed:enabled') === 'true';
      const samplingRate = parseInt(localStorage.getItem('rbac:log:sampling') || '100', 10);
      
      // Determine if we should log this event
      const shouldLogDenied = !result && loggingEnabled;
      const shouldLogAllowed = result && allowedLoggingEnabled;
      const shouldLog = (shouldLogDenied || shouldLogAllowed) && (Math.random() * 100 <= samplingRate);
      
      if (shouldLog) {
        logEvent({
          scope: 'account',
          object: objectName,
          action,
          allowed: result,
          source: 'permission_hook',
          metadata: {
            hook_type: 'useAccountPermissionCheck',
            cached: false
          }
        });
      }

      return result;
    },
    enabled: !!user?.id && cachedPermission === undefined && !providerLoading,
    staleTime: 300000, // 5 minutes
    initialData: cachedPermission === 'via_grant' ? true : cachedPermission,
  });
};
