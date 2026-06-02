import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Edit3, Save, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AccountRoleType } from '@/hooks/useAccountRoles';

interface AccountPermissionsGridProps {
  selectedRole: AccountRoleType;
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onSave: () => void;
}

interface AccountPermission {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export const AccountPermissionsGrid: React.FC<AccountPermissionsGridProps> = ({
  selectedRole,
  isEditing,
  onEditToggle,
  onSave,
}) => {
  const [permissions, setPermissions] = useState<AccountPermission[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<AccountPermission>>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rolePermissions, isLoading } = useQuery<AccountPermission[], Error>({
    queryKey: ['account-role-permissions', selectedRole],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_account_role_permissions', {
        p_role: selectedRole
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedRole,
  });

  const updatePermissionsMutation = useMutation<void, Error, AccountPermission[]>({
    mutationFn: async (updatedPermissions: AccountPermission[]) => {
      // Update permissions one by one using the account_role_permissions table
      for (const permission of updatedPermissions) {
        // Get permission object ID
        const { data: permissionObject } = await (supabase as any)
          .from('permission_objects')
          .select('id')
          .eq('name', permission.object_name)
          .eq('scope', 'account')
          .single();

        if (permissionObject) {
          // Upsert permission in account_role_permissions table
          await (supabase as any)
            .from('account_role_permissions')
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
      queryClient.invalidateQueries({ queryKey: ['account-role-permissions'] });
      toast({
        title: "Permissions Updated",
        description: `Account permissions for ${selectedRole} role have been updated successfully.`,
      });
      setPendingChanges({});
      onSave();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update permissions. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating permissions:', error);
    },
  });

  useEffect(() => {
    if (rolePermissions) {
      setPermissions(rolePermissions);
      setPendingChanges({});
    }
  }, [rolePermissions]);

  const handlePermissionChange = (
    objectName: string,
    field: keyof Pick<AccountPermission, 'can_view' | 'can_edit' | 'can_delete' | 'can_create'>,
    value: boolean
  ) => {
    const updatedPermissions = permissions.map(permission =>
      permission.object_name === objectName
        ? { ...permission, [field]: value }
        : permission
    );
    setPermissions(updatedPermissions);

    // Track pending changes
    setPendingChanges(prev => ({
      ...prev,
      [objectName]: {
        ...prev[objectName],
        [field]: value,
      },
    }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      await updatePermissionsMutation.mutateAsync(permissions);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChanges = async () => {
    if (rolePermissions) {
      setPermissions(rolePermissions);
      setPendingChanges({});
      onEditToggle(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Loading permissions...</div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedRole) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Select an account role to view permissions</div>
        </CardContent>
      </Card>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, AccountPermission[]>);

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Permissions for
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {selectedRole.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditToggle(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Permissions
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelChanges}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={loading || !hasChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm text-foreground uppercase tracking-wide">
                  {category}
                </h4>
                
                <div className="space-y-2">
                  {categoryPermissions.map((permission) => {
                    const hasObjectChanges = pendingChanges[permission.object_name];
                    
                    return (
                      <div
                        key={permission.object_name}
                        className={`border rounded-lg p-4 transition-colors ${
                          hasObjectChanges ? 'border-amber-200 bg-amber-50/50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{permission.display_name}</h5>
                            <p className="text-xs text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-6 ml-4">
                            {[
                              { key: 'can_view', label: 'View' },
                              { key: 'can_edit', label: 'Edit' },
                              { key: 'can_create', label: 'Create' },
                              { key: 'can_delete', label: 'Delete' },
                            ].map(({ key, label }) => (
                              <div key={key} className="flex flex-col items-center gap-1">
                                <span className="text-xs text-muted-foreground">{label}</span>
                                <Checkbox
                                  checked={permission[key as keyof AccountPermission] as boolean}
                                  disabled={!isEditing}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(
                                      permission.object_name,
                                      key as keyof Pick<AccountPermission, 'can_view' | 'can_edit' | 'can_delete' | 'can_create'>,
                                      checked as boolean
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <Separator className="my-4" />
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {hasChanges && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-800">
              <strong>Unsaved Changes:</strong> You have {Object.keys(pendingChanges).length} permission object(s) with pending changes.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};