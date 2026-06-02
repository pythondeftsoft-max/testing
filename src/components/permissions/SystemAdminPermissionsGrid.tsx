import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, X, Edit, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemAdminPermissions, SystemAdminRoleType, SystemAdminPermission } from '@/hooks/useSystemAdminPermissions';

interface SystemAdminPermissionsGridProps {
  selectedRole: SystemAdminRoleType;
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onSave: () => void;
}

export const SystemAdminPermissionsGrid: React.FC<SystemAdminPermissionsGridProps> = ({
  selectedRole,
  isEditing,
  onEditToggle,
  onSave,
}) => {
  const { useGetSystemAdminRolePermissions, updateSystemAdminRolePermissions } = useSystemAdminPermissions();
  const { data: permissions = [], isLoading } = useGetSystemAdminRolePermissions(selectedRole);
  const [localPermissions, setLocalPermissions] = useState<SystemAdminPermission[]>([]);

  useEffect(() => {
    if (JSON.stringify(permissions) !== JSON.stringify(localPermissions)) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handlePermissionChange = (
    objectName: string,
    action: 'can_view' | 'can_edit' | 'can_create' | 'can_delete',
    value: boolean
  ) => {
    setLocalPermissions(prev =>
      prev.map(perm =>
        perm.object_name === objectName ? { ...perm, [action]: value } : perm
      )
    );
  };

  const handleSave = async () => {
    await updateSystemAdminRolePermissions.mutateAsync({
      role: selectedRole,
      permissions: localPermissions,
    });
    onSave();
  };

  const handleCancel = () => {
    setLocalPermissions(permissions);
    onEditToggle(false);
  };

  // Group permissions by category
  const groupedPermissions = localPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, SystemAdminPermission[]>);

  const getRoleRestrictions = () => {
    if (selectedRole === 'super_admin') {
      return null;
    }
    
    const restrictions = [];
    if (selectedRole === 'operations_admin') {
      restrictions.push('Cannot delete anything');
      restrictions.push('Cannot configure settings or permissions');
    } else if (selectedRole === 'matchmaker') {
      restrictions.push('Cannot delete anything');
      restrictions.push('Can only view accounts and edit matches');
      restrictions.push('No access to system settings');
    }

    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Role Restrictions:</strong>
          <ul className="list-disc list-inside mt-2">
            {restrictions.map((restriction, idx) => (
              <li key={idx}>{restriction}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading permissions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {selectedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Permissions
          </CardTitle>
          {!isEditing ? (
            <Button onClick={() => onEditToggle(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Permissions
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={updateSystemAdminRolePermissions.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline"
                disabled={updateSystemAdminRolePermissions.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {getRoleRestrictions()}

        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold mb-3 pb-2 border-b">{category}</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Permission</TableHead>
                    <TableHead className="text-center w-24">View</TableHead>
                    <TableHead className="text-center w-24">Edit</TableHead>
                    <TableHead className="text-center w-24">Create</TableHead>
                    <TableHead className="text-center w-24">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((perm) => (
                    <TableRow key={perm.object_name}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{perm.display_name}</div>
                          <div className="text-sm text-muted-foreground">{perm.description}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_view}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.object_name, 'can_view', checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_edit}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.object_name, 'can_edit', checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_create}
                          disabled={!isEditing}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(perm.object_name, 'can_create', checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={perm.can_delete}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.object_name, 'can_delete', checked as boolean)
                            }
                          />
                          {selectedRole !== 'super_admin' && perm.can_delete && (
                            <span className="ml-2 text-xs text-amber-500">(Super Admin Only)</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
