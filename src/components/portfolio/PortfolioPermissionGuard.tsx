
import React from 'react';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface PortfolioPermissionGuardProps {
  portfolioId: string;
  objectName: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
}

export const PortfolioPermissionGuard: React.FC<PortfolioPermissionGuardProps> = ({
  portfolioId,
  objectName,
  action,
  children,
  fallback,
  showDeniedMessage = true,
}) => {
  return (
    <PermissionGuard
      object={objectName}
      action={action}
      scope="portfolio"
      portfolioId={portfolioId}
      fallback={fallback}
      showDeniedMessage={showDeniedMessage}
    >
      {children}
    </PermissionGuard>
  );
};
