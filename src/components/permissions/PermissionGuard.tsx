
import React, { useRef, useEffect } from 'react';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { AccountRoleType } from '@/hooks/useAccountRoles';
import { usePermissions } from '@/providers/PermissionProvider';
import { useLogRbacEvent } from '@/hooks/useLogRbacEvent';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { AccessDeniedAlert } from './AccessDeniedAlert';
import { RequestAccessDialog } from './RequestAccessDialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface PermissionGuardProps {
  object: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
  requiredRoles?: AccountRoleType[];
  // New props for unified guard
  scope?: 'account' | 'portfolio';
  portfolioId?: string | null;
}

const PermissionGuard = React.forwardRef<any, PermissionGuardProps>(({
  object,
  action,
  children,
  fallback,
  showDeniedMessage = false,
  requiredRoles,
  scope = 'account', // Default to account scope for backward compatibility
  portfolioId
}, ref) => {
  const { hasPermission, hasAccountRole, highestAccountRole, loading, isAccountOwner } = useAccountRoles();
  const { hasPermission: hasProviderPermission, loading: providerLoading } = usePermissions();
  const { data: isAdmin } = useAdminCheck();
  const logRbacEvent = useLogRbacEvent();
  const [showRequestDialog, setShowRequestDialog] = React.useState(false);
  
  // De-duplication cache for logging - prevent spam logging
  const loggedDenials = useRef(new Set<string>());
  
  // Debug logging can be toggled
  const debugLogging = localStorage.getItem('rbac:debug:enabled') === 'true';
  
  // Special case: System admins have full access when viewing aggregate data (portfolioId="everything")
  const isAdminViewingAggregateData = isAdmin && portfolioId === 'everything';
  
  // Check role-based access first if requiredRoles is specified
  const hasRoleAccess = !requiredRoles || hasAccountRole(requiredRoles);
  
  // Check granular permissions using provider first, then fallback
  const permissionResult = isAdminViewingAggregateData ? true : hasProviderPermission(object, action, scope);
  const hasAccess = isAdminViewingAggregateData || permissionResult === true || permissionResult === 'via_grant' || 
                   (scope === 'account' && (permissionResult === null || permissionResult === false) ? hasPermission(object, action) : false);
  const isViaGrant = permissionResult === 'via_grant';
  
  // Log access events for audit purposes - MOVED BEFORE ANY RETURNS
  useEffect(() => {
    const logKey = `${scope}:${object}:${action}:${portfolioId || 'null'}:${window.location.pathname}:${hasAccess}`;
    
    // Only log each unique event once per session
    if (!loggedDenials.current.has(logKey)) {
      loggedDenials.current.add(logKey);
      
      // Check if logging is enabled (can be toggled for debugging)
      const denialLoggingEnabled = localStorage.getItem('rbac:log:enabled') !== 'false';
      const allowedLoggingEnabled = localStorage.getItem('rbac:log:allowed:enabled') === 'true';
      
      const shouldLog = hasAccess ? allowedLoggingEnabled : denialLoggingEnabled;
      
      if (shouldLog) {
        // Apply client-side sampling
        const samplingRate = parseInt(localStorage.getItem('rbac:log:sampling') || '100', 10);
        const shouldSample = Math.random() * 100 < samplingRate;
        
        if (shouldSample) {
          if (debugLogging) {
            console.log('PermissionGuard: Logging access event', { object, action, scope, portfolioId, hasAccess, samplingRate });
          }
          logRbacEvent.mutate({
            scope,
            object,
            action,
            portfolioId,
            allowed: hasAccess,
            route: window.location.pathname,
            metadata: {
              requiredRoles: requiredRoles || [],
              hasAccountRole: hasAccountRole ? true : false,
              highestAccountRole: highestAccountRole || null
            }
          });
        } else if (debugLogging) {
          console.log('PermissionGuard: Event sampled out', { object, action, samplingRate });
        }
      }
    }
  }, [hasAccess, scope, object, action, portfolioId, logRbacEvent, requiredRoles, hasAccountRole, highestAccountRole, debugLogging]);

  if (debugLogging) {
    console.log('PermissionGuard:', { object, action, scope, portfolioId, providerLoading, loading });
  }

  // For DialogTrigger compatibility, clone the child and forward the ref
  if (loading || providerLoading) {
    if (debugLogging) {
      console.log('PermissionGuard: Loading state detected', { object, action, scope, isAccountOwner });
    }
    
    // Owner fallback: allow access to user management during loading
    if (isAccountOwner && object === 'user_management') {
      if (debugLogging) {
        console.log('PermissionGuard: Owner fallback for user_management during loading');
      }
      if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, { ref });
      }
      return null;
    }
    
    // During loading, render fallback if provided (ensures tour targets like data-tour exist)
    if (fallback) {
      if (debugLogging) {
        console.log('PermissionGuard: Rendering fallback during loading to preserve tour targets');
      }
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback as React.ReactElement, { ref });
      }
      return <>{fallback}</>;
    }
    
    // For all other cases during loading, render children with ref forwarding
    if (debugLogging) {
      console.log('PermissionGuard: Rendering children directly during loading');
    }
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, { ref });
    }
    return null;
  }

  // Check role-based access first if requiredRoles is specified
  if (!hasRoleAccess) {
    if (fallback) {
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback as React.ReactElement, { ref });
      }
      return <>{fallback}</>;
    }
    if (showDeniedMessage) {
      return (
        <Alert className="border-destructive/50 text-destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have the required account role to access this feature. Required: {requiredRoles?.join(', ')}
            {highestAccountRole && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Your current role: {highestAccountRole}
              </span>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  if (debugLogging) {
    console.log('PermissionGuard result:', { object, action, scope, hasAccess });
  }

  if (!hasAccess) {
    if (fallback) {
      if (React.isValidElement(fallback)) {
        return React.cloneElement(fallback as React.ReactElement, { ref });
      }
      return <>{fallback}</>;
    }
    if (showDeniedMessage) {
      return (
        <>
          <Alert className="border-destructive/50 text-destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3">
              <div>
                You don't have permission to {action} {object} at the {scope} level.
                {highestAccountRole && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Your current role: {highestAccountRole}
                  </span>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRequestDialog(true)}
                className="self-start"
              >
                <Clock className="h-4 w-4 mr-2" />
                Request Access
              </Button>
            </AlertDescription>
          </Alert>

          <RequestAccessDialog
            open={showRequestDialog}
            onOpenChange={setShowRequestDialog}
            scope={scope}
            portfolioId={portfolioId}
            objectName={object}
            action={action}
          />
        </>
      );
    }
    return null;
  }

  // Clone the child element and forward the ref for Radix UI asChild compatibility
  if (React.isValidElement(children)) {
    const clonedElement = React.cloneElement(children as React.ReactElement, { ref });
    
    // Add visual indicator for temporary grants
    if (isViaGrant) {
      return (
        <div className="relative inline-block">
          {clonedElement}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" 
               title="Access via temporary grant" />
        </div>
      );
    }
    
    return clonedElement;
  }
  return null;
});

PermissionGuard.displayName = 'PermissionGuard';

export default PermissionGuard;
