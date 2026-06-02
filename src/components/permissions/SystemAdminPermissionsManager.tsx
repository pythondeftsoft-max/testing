import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { SystemAdminPermissionsGrid } from './SystemAdminPermissionsGrid';
import { SystemAdminRoleType } from '@/hooks/useSystemAdminPermissions';

const ROLE_OPTIONS: { value: SystemAdminRoleType; label: string; description: string; color: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform control - Only role with delete permissions',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  },
  {
    value: 'operations_admin',
    label: 'Operations Admin',
    description: 'Can view/edit/create operational data - No delete or settings access',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  {
    value: 'matchmaker',
    label: 'Matchmaker',
    description: 'Can view accounts and manage matches - Limited to matching operations',
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  },
];

export const SystemAdminPermissionsManager: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<SystemAdminRoleType>('super_admin');
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);

  const handleRoleSelect = (role: SystemAdminRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(false);
  };

  const handlePermissionsSave = () => {
    setIsEditingPermissions(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Admin Role Permissions
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Configure permissions for each system administrator role. Super Admin is the only role with delete capabilities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <h3 className="text-sm font-medium mb-3">Select Role to Configure</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((role) => (
                <Button
                  key={role.value}
                  variant={selectedRole === role.value ? 'default' : 'outline'}
                  className={`h-auto p-4 justify-start text-left ${
                    selectedRole === role.value ? '' : role.color
                  }`}
                  onClick={() => handleRoleSelect(role.value)}
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{role.label}</div>
                    <div className="text-xs opacity-80 font-normal whitespace-normal break-words">
                      {role.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRole && (
        <SystemAdminPermissionsGrid
          selectedRole={selectedRole}
          isEditing={isEditingPermissions}
          onEditToggle={setIsEditingPermissions}
          onSave={handlePermissionsSave}
        />
      )}
    </div>
  );
};
