
import React from 'react';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { AccountRoleType } from '@/hooks/useAccountRoles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';

interface AccountRoleGuardProps {
  requiredRoles: AccountRoleType[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
}

const AccountRoleGuard = ({
  requiredRoles,
  children,
  fallback,
  showDeniedMessage = true,
}: AccountRoleGuardProps) => {
  const { hasAccountRole, highestAccountRole, loading, userAccountRoles } = useAccountRoles();

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AccountRoleGuard Debug:', {
      requiredRoles,
      userAccountRoles,
      highestAccountRole,
      loading,
      hasAccountRole: hasAccountRole(requiredRoles)
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Checking permissions...</span>
      </div>
    );
  }

  const isAuthorized = hasAccountRole(requiredRoles);

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDeniedMessage) {
      return (
        <Alert className="border-destructive/50 text-destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Required roles: {requiredRoles.join(', ')}
            {highestAccountRole && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Your current role: {highestAccountRole}
              </span>
            )}
            {!highestAccountRole && userAccountRoles.length === 0 && (
              <span className="block mt-1 text-sm text-muted-foreground">
                No account roles found. Contact an administrator.
              </span>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

export default AccountRoleGuard;
