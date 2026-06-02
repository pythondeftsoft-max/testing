
import React from 'react';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface AccountPermissionGuardProps {
  objectName: string;
  action: 'view' | 'edit' | 'delete' | 'create';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
}

export const AccountPermissionGuard: React.FC<AccountPermissionGuardProps> = ({
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
      scope="account"
      fallback={fallback}
      showDeniedMessage={showDeniedMessage}
    >
      {children}
    </PermissionGuard>
  );
};
