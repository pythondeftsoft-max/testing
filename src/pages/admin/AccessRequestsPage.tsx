import React from 'react';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { AccessRequestsAdmin } from '@/components/admin/AccessRequestsAdmin';

const AccessRequestsPage: React.FC = () => {
  return (
    <PermissionGuard 
      object="permissions" 
      action="view" 
      scope="account"
      showDeniedMessage={true}
    >
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Access Requests</h1>
          <p className="text-muted-foreground">
            Review and manage temporary access requests from users.
          </p>
        </div>
        
        <AccessRequestsAdmin />
      </div>
    </PermissionGuard>
  );
};

export default AccessRequestsPage;