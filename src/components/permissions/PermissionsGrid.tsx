
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings, Eye, Edit3, Trash2, Plus, Save, X } from 'lucide-react';
import { AccountRoleType } from '@/hooks/useAccountRoles';
import { usePermissions } from '@/hooks/useAccountRoles';

interface PermissionsGridProps {
  selectedRole?: AccountRoleType;
  isEditing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  onSave?: () => void;
}

interface Permission {
  object_name: string;
  display_name: string;
  category: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

const roleColors = {
  owner: 'bg-gradient-to-r from-blue-600 to-blue-700',
  admin_partner: 'bg-gradient-to-r from-amber-500 to-amber-600',
  support_assistant: 'bg-gradient-to-r from-slate-500 to-slate-600',
};

const roleLabels = {
  owner: 'Owner',
  admin_partner: 'Admin Partner',
  support_assistant: 'Support Assistant',
};

const actionIcons = {
  view: Eye,
  edit: Edit3,
  delete: Trash2,
  create: Plus,
};

const actionLabels = {
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
  create: 'Create',
};

export const PermissionsGrid: React.FC<PermissionsGridProps> = ({
  selectedRole,
  isEditing = false,
  onEditToggle,
  onSave,
}) => {
  const { permissionObjects, objectsLoading, getRolePermissions, updateRolePermissions } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Permission>>(new Map());

  // Load permissions for selected role
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadRolePermissions = async (roleName: AccountRoleType) => {
    setLoading(true);
    try {
      const rolePermissions = await getRolePermissions(roleName);
      setPermissions(rolePermissions);
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (objectName: string, action: keyof Permission, value: boolean) => {
    if (!isEditing || !selectedRole) return;

    const currentPermission = permissions.find(p => p.object_name === objectName);
    if (!currentPermission) return;

    const updatedPermission = {
      ...currentPermission,
      [action]: value,
    };

    // Update local state
    setPermissions(prev => 
      prev.map(p => p.object_name === objectName ? updatedPermission : p)
    );

    // Track pending changes
    setPendingChanges(prev => new Map(prev.set(objectName, updatedPermission)));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole || pendingChanges.size === 0) return;

    setLoading(true);
    try {
      const objectMap = new Map(permissionObjects.map((obj: any) => [obj.name, obj.id]));
      
      for (const [objectName, permission] of pendingChanges) {
        const objectId = objectMap.get(objectName);
        if (!objectId) continue;

        await updateRolePermissions(selectedRole, objectId, {
          can_view: permission.can_view,
          can_edit: permission.can_edit,
          can_delete: permission.can_delete,
          can_create: permission.can_create,
        });
      }

      setPendingChanges(new Map());
      toast.success('Permissions updated successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChanges = () => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
    setPendingChanges(new Map());
    onEditToggle?.(false);
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categories = Object.keys(groupedPermissions).sort();

  if (objectsLoading || loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Permissions Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading permissions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedRole) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Permissions Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a role to view permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {selectedRole && (
            <Badge className={`${roleColors[selectedRole]} text-white`}>
              {roleLabels[selectedRole]}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelChanges}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={loading || pendingChanges.size === 0}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditToggle?.(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit Permissions
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="space-y-4 pr-4 pb-4">
            {categories.map((category) => (
              <div key={category} className="space-y-3">
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 border-b">
                  <h3 className="font-semibold text-sm text-foreground">{category}</h3>
                </div>
                
                <div className="space-y-2">
                  {groupedPermissions[category].map((permission) => (
                    <div
                      key={permission.object_name}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 items-center p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-xs"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-medium text-foreground truncate text-sm">
                          {permission.display_name}
                        </span>
                         <span className="text-xs text-muted-foreground truncate">
                           {(permissionObjects as any[]).find((obj: any) => obj?.name === permission.object_name)?.description || 'Manage this resource'}
                         </span>
                      </div>
                      
                      {(['view', 'edit', 'delete', 'create'] as const).map((action) => {
                        const Icon = actionIcons[action];
                        const isChecked = permission[`can_${action}`];
                        const hasChanges = pendingChanges.has(permission.object_name);
                        
                        return (
                          <div key={action} className="flex flex-col items-center gap-1 min-w-0">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {actionLabels[action]}
                            </span>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(permission.object_name, `can_${action}`, checked as boolean)
                              }
                              disabled={!isEditing}
                              className={hasChanges ? 'border-amber-500' : ''}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                {category !== categories[categories.length - 1] && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {pendingChanges.size > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
          <div className="flex items-center gap-2 text-amber-800">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pendingChanges.size} unsaved change{pendingChanges.size > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
