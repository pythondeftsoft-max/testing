import { useSecurityAudit } from './useSecurityAudit';
import { useAuth } from '@/providers/AuthProvider';

export const useAdminAudit = () => {
  const { logResourceAccess, logSuspiciousActivity } = useSecurityAudit();
  const { user } = useAuth();

  const logAdminAccess = async (
    resourceType: string,
    resourceId: string,
    action: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    
    await logResourceAccess(
      resourceType,
      resourceId,
      action,
      user.id,
      {
        ...metadata,
        admin_access: true,
        access_level: 'administrative'
      }
    );
  };

  const logPropertyAccess = async (propertyId: string, action: string = 'view') => {
    await logAdminAccess('property', propertyId, action, {
      access_type: 'admin_dashboard'
    });
  };

  const logUserAccess = async (userId: string, action: string = 'view') => {
    await logAdminAccess('user_profile', userId, action, {
      access_type: 'admin_dashboard'
    });
  };

  const logSecurityAccess = async (action: string = 'view') => {
    await logAdminAccess('security_dashboard', 'admin_security', action, {
      access_type: 'security_monitoring'
    });
  };

  const logBulkAction = async (
    resourceType: string,
    action: string,
    count: number,
    metadata?: Record<string, any>
  ) => {
    await logAdminAccess('bulk_operation', `${resourceType}_bulk`, action, {
      ...metadata,
      resource_count: count,
      bulk_operation: true
    });
  };

  const logSuspiciousAdminActivity = async (
    activityType: string,
    metadata?: Record<string, any>
  ) => {
    await logSuspiciousActivity(`admin_${activityType}`, user?.id, {
      ...metadata,
      admin_context: true
    });
  };

  return {
    logAdminAccess,
    logPropertyAccess,
    logUserAccess,
    logSecurityAccess,
    logBulkAction,
    logSuspiciousAdminActivity
  };
};