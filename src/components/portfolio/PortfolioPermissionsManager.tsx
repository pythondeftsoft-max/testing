import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioRoleSelector } from '@/components/permissions/PortfolioRoleSelector';
import { PortfolioPermissionsGrid } from '@/components/permissions/PortfolioPermissionsGrid';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';

interface PortfolioPermissionsManagerProps {
  portfolioId: string;
  currentUserId: string;
  isAdminPartner: boolean;
}

export const PortfolioPermissionsManager: React.FC<PortfolioPermissionsManagerProps> = ({
  portfolioId,
  currentUserId,
  isAdminPartner,
}) => {
  const [selectedRole, setSelectedRole] = useState<PortfolioRoleType | undefined>();
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  const handleRoleSelect = (role: PortfolioRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(false);
  };

  const handleEditPermissions = (role: PortfolioRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(true);
  };

  const handlePermissionsSave = () => {
    setIsEditingPermissions(false);
  };

  if (!isAdminPartner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need admin partner permissions to manage portfolio role permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Role to Configure</h3>
        <PortfolioRoleSelector
          selectedRole={selectedRole}
          onRoleSelect={handleRoleSelect}
          onEditPermissions={handleEditPermissions}
        />
      </div>

      {selectedRole && (
        <PortfolioPermissionsGrid
          selectedRole={selectedRole}
          isEditing={isEditingPermissions}
          onEditToggle={setIsEditingPermissions}
          onSave={handlePermissionsSave}
        />
      )}
    </div>
  );
};