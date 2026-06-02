import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountRoleSelector } from '@/components/permissions/AccountRoleSelector';
import { AccountPermissionsGrid } from '@/components/permissions/AccountPermissionsGrid';
import { AccountRoleType } from '@/hooks/useAccountRoles';
import { Shield } from 'lucide-react';

interface AccountPermissionsManagerProps {
  currentUserId: string;
  isAccountOwner: boolean;
}

export const AccountPermissionsManager: React.FC<AccountPermissionsManagerProps> = ({
  currentUserId,
  isAccountOwner,
}) => {
  const [selectedRole, setSelectedRole] = useState<AccountRoleType | undefined>();
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  const handleRoleSelect = (role: AccountRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(false);
  };

  const handleEditPermissions = (role: AccountRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(true);
  };

  const handlePermissionsSave = () => {
    setIsEditingPermissions(false);
  };

  if (!isAccountOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need account owner permissions to manage account role permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Account Role to Configure</h3>
        <AccountRoleSelector
          selectedRole={selectedRole}
          onRoleSelect={handleRoleSelect}
          onEditPermissions={handleEditPermissions}
        />
      </div>

      {selectedRole && (
        <AccountPermissionsGrid
          selectedRole={selectedRole}
          isEditing={isEditingPermissions}
          onEditToggle={setIsEditingPermissions}
          onSave={handlePermissionsSave}
        />
      )}
    </div>
  );
};