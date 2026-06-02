
import React from 'react';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface AnalyticsPermissionWrapperProps {
  portfolioId: string;
  analyticsType: 'dashboard' | 'portfolio_trends' | 'asset_allocation' | 'income_expense' | 'cashflow' | 'advanced_charts';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  adminOverride?: boolean; // Allow admins to bypass portfolio-specific permissions
}

export const AnalyticsPermissionWrapper: React.FC<AnalyticsPermissionWrapperProps> = ({
  portfolioId,
  analyticsType,
  children,
  fallback,
  adminOverride = false,
}) => {
  const { data: isAdmin = false } = useAdminCheck();
  
  // If admin override is enabled and user is admin, show content directly
  if (adminOverride && isAdmin) {
    return <>{children}</>;
  }

  return (
    <PermissionGuard
      object={`analytics.${analyticsType}`}
      action="view"
      scope="portfolio"
      portfolioId={portfolioId}
      showDeniedMessage={true}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
};
