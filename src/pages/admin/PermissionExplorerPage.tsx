import React from 'react';
import PermissionExplorer from '@/components/admin/PermissionExplorer';
import PermissionGuard from '@/components/permissions/PermissionGuard';

export default function PermissionExplorerPage() {
  return (
    <PermissionGuard
      object="admin.permission_explorer"
      action="view"
      scope="account"
      showDeniedMessage={true}
    >
      <PermissionExplorer />
    </PermissionGuard>
  );
}