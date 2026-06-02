
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, RotateCcw } from 'lucide-react';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';

interface PortfolioPermission {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

interface PortfolioPermissionsGridProps {
  selectedRole: PortfolioRoleType;
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onSave: () => void;
}

export const PortfolioPermissionsGrid: React.FC<PortfolioPermissionsGridProps> = ({
  selectedRole,
  isEditing,
  onEditToggle,
  onSave,
}) => {
  const [editedPermissions, setEditedPermissions] = useState<Record<string, PortfolioPermission>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery<PortfolioPermission[], Error>({
    queryKey: ['portfolio-role-permissions', selectedRole],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_portfolio_role_permissions', {
        p_role: selectedRole
      });

      if (error) throw error;
      return data as PortfolioPermission[];
    },
    enabled: !!selectedRole,
  });

  const updatePermissionsMutation = useMutation<void, Error, PortfolioPermission[]>({
    mutationFn: async (updatedPermissions: PortfolioPermission[]) => {
      // Update permissions one by one using the portfolio_role_permissions table
      for (const permission of updatedPermissions) {
        // Get permission object ID
        const { data: permissionObject } = await (supabase as any)
          .from('permission_objects')
          .select('id')
          .eq('name', permission.object_name)
          .eq('scope', 'portfolio')
          .single();

        if (permissionObject) {
          // Upsert permission in portfolio_role_permissions table
          await (supabase as any)
            .from('portfolio_role_permissions')
            .upsert({
              role_name: selectedRole,
              permission_object_id: permissionObject.id,
              can_view: permission.can_view,
              can_edit: permission.can_edit,
              can_delete: permission.can_delete,
              can_create: permission.can_create,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-role-permissions'] });
      toast({
        title: 'Permissions Updated',
        description: `Successfully updated portfolio permissions for ${selectedRole} role`,
      });
      onSave();
    },
    onError: (error) => {
      console.error('Error updating portfolio permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portfolio permissions',
        variant: 'destructive',
      });
    },
  });

  const handlePermissionChange = (objectName: string, action: keyof PortfolioPermission, value: boolean) => {
    if (!permissions) return;

    const currentPermission = permissions.find(p => p.object_name === objectName);
    if (!currentPermission) return;

    const updatedPermission = {
      ...currentPermission,
      ...editedPermissions[objectName],
      [action]: value,
    };

    setEditedPermissions(prev => ({
      ...prev,
      [objectName]: updatedPermission,
    }));
  };

  const handleSave = () => {
    if (!permissions) return;

    const updatedPermissions = permissions.map(permission => ({
      ...permission,
      ...editedPermissions[permission.object_name],
    }));

    updatePermissionsMutation.mutate(updatedPermissions);
  };

  const handleReset = () => {
    setEditedPermissions({});
    onEditToggle(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading portfolio permissions...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!permissions || permissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolio permissions found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PortfolioPermission[]>);

  const getPermissionValue = (permission: PortfolioPermission, action: keyof PortfolioPermission) => {
    const editedPermission = editedPermissions[permission.object_name];
    return editedPermission ? editedPermission[action] : permission[action];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portfolio Permissions for {selectedRole}</h3>
          <p className="text-sm text-muted-foreground">
            Configure what this role can do within portfolios
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                disabled={updatePermissionsMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={updatePermissionsMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onEditToggle(true)}
              variant="outline"
              size="sm"
            >
              Edit Permissions
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryPermissions.map((permission) => (
                  <div key={permission.object_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{permission.display_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {permission.description || `Manage ${permission.object_name} resource`}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {(['can_view', 'can_edit', 'can_create', 'can_delete'] as const).map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Switch
                            checked={getPermissionValue(permission, action) as boolean}
                            onCheckedChange={(value) => handlePermissionChange(permission.object_name, action, value)}
                            disabled={!isEditing}
                          />
                          <label className="text-sm font-medium capitalize">
                            {action.replace('can_', '')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
