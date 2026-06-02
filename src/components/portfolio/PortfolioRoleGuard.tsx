
import React from 'react';
import { usePortfolioAccess } from '@/hooks/usePortfolioAccess';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';

interface PortfolioRoleGuardProps {
  portfolioId: string;
  userId: string;
  requiredRoles: PortfolioRoleType[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
}

const PortfolioRoleGuard = ({
  portfolioId,
  userId,
  requiredRoles,
  children,
  fallback,
  showDeniedMessage = true,
}: PortfolioRoleGuardProps) => {
  const { isAuthorized, isDenied, loading, userRole } = usePortfolioAccess({
    portfolioId,
    userId,
    requiredRoles,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Checking permissions...</span>
      </div>
    );
  }

  if (isDenied) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDeniedMessage) {
      return (
        <Alert className="border-destructive/50 text-destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Required roles: {requiredRoles.join(', ')}
            {userRole && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Your current role: {userRole.role_name}
              </span>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return null;
};

export default PortfolioRoleGuard;
