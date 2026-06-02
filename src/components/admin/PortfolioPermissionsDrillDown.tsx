import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Shield, Eye, Edit, Trash2, Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePortfolioPermissions } from '@/hooks/usePortfolioPermissions';
import { useToast } from '@/hooks/use-toast';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface PermissionObject {
  object_name: string;
  display_name: string;
  category: string;
  description: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
}

interface RolePermissions {
  role: string;
  permissions: PermissionObject[];
}

const PortfolioPermissionsDrillDown: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'admin_partner' | 'editor' | 'viewer' | 'maintenance'>('viewer');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<PermissionObject[]>([]);

  const { getPortfolioRolePermissions, updatePortfolioRolePermissions } = usePortfolioPermissions();
  const { toast } = useToast();

  // Fetch real permissions data
  const [permissions, setPermissions] = useState<PermissionObject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const rolePermissions = await getPortfolioRolePermissions(selectedRole);
        setPermissions(rolePermissions || []);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        // Fallback to mock data if API fails
        setPermissions(mockPermissions);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [selectedRole, getPortfolioRolePermissions]);

  // Fallback mock permissions data
  const mockPermissions: PermissionObject[] = [
    {
      object_name: 'properties',
      display_name: 'Properties',
      category: 'Property Management',
      description: 'View and manage portfolio properties',
      can_view: true,
      can_edit: selectedRole === 'admin_partner' || selectedRole === 'editor',
      can_create: selectedRole === 'admin_partner' || selectedRole === 'editor',
      can_delete: selectedRole === 'admin_partner'
    },
    {
      object_name: 'tenants',
      display_name: 'Tenant Management',
      category: 'Property Management',
      description: 'Manage tenant information and applications',
      can_view: true,
      can_edit: selectedRole === 'admin_partner' || selectedRole === 'editor',
      can_create: selectedRole === 'admin_partner' || selectedRole === 'editor', 
      can_delete: selectedRole === 'admin_partner'
    },
    {
      object_name: 'financial_reports',
      display_name: 'Financial Reports',
      category: 'Financial',
      description: 'Access financial reports and analytics',
      can_view: selectedRole !== 'maintenance',
      can_edit: selectedRole === 'admin_partner' || selectedRole === 'editor',
      can_create: selectedRole === 'admin_partner',
      can_delete: selectedRole === 'admin_partner'
    },
    {
      object_name: 'maintenance_requests',
      display_name: 'Maintenance Requests',
      category: 'Maintenance',
      description: 'Handle maintenance requests and work orders',
      can_view: true,
      can_edit: selectedRole === 'admin_partner' || selectedRole === 'editor' || selectedRole === 'maintenance',
      can_create: selectedRole === 'admin_partner' || selectedRole === 'editor' || selectedRole === 'maintenance',
      can_delete: selectedRole === 'admin_partner'
    },
    {
      object_name: 'portfolio_settings',
      display_name: 'Portfolio Settings',
      category: 'Administration',
      description: 'Modify portfolio configuration and settings',
      can_view: selectedRole === 'admin_partner' || selectedRole === 'editor',
      can_edit: selectedRole === 'admin_partner',
      can_create: selectedRole === 'admin_partner',
      can_delete: selectedRole === 'admin_partner'
    }
  ];

  const categories = Array.from(new Set(permissions.map(p => p.category)));

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePermissionChange = (
    permissionName: string, 
    action: 'view' | 'edit' | 'create' | 'delete', 
    value: boolean
  ) => {
    if (!isEditing) return;

    const updated = editedPermissions.map(permission => {
      if (permission.object_name === permissionName) {
        return {
          ...permission,
          [`can_${action}`]: value
        };
      }
      return permission;
    });
    setEditedPermissions(updated);
  };

  const startEditing = () => {
    setEditedPermissions([...filteredPermissions]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedPermissions([]);
    setIsEditing(false);
  };

  const saveChanges = async () => {
    try {
      await updatePortfolioRolePermissions.mutateAsync({
        role: selectedRole,
        permissions: editedPermissions
      });

      toast({
        title: "Permissions Updated",
        description: `Successfully updated permissions for ${selectedRole} role.`,
      });

      setIsEditing(false);
      setEditedPermissions([]);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Failed to update permissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin_partner': return 'destructive';
      case 'editor': return 'default';
      case 'viewer': return 'secondary';
      case 'maintenance': return 'outline';
      default: return 'secondary';
    }
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-gray-400" />
    );
  };

  return (
    <PermissionGuard 
      object="admin.permissions" 
      action="view" 
      scope="account"
      showDeniedMessage
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Portfolio Permissions Drill-Down
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed view and management of role-based permissions for portfolio objects
            </p>
          </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_partner">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">HIGH</Badge>
                      Admin Partner
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">MED</Badge>
                      Editor
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">LOW</Badge>
                      Viewer
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">SPEC</Badge>
                      Maintenance
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={startEditing} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Permissions
                </Button>
              ) : (
                <>
                  <Button onClick={cancelEditing} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={saveChanges} disabled={updatePortfolioRolePermissions.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Current Role Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Current Role:</span>
            <Badge variant={getRoleColor(selectedRole)} className="text-sm">
              {selectedRole.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Permissions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Permission Object</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4" />
                        View
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Edit className="w-4 h-4" />
                        Edit
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Plus className="w-4 h-4" />
                        Create
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.map((permission) => {
                    const editedPermission = editedPermissions.find(p => p.object_name === permission.object_name) || permission;
                    
                    return (
                      <TableRow key={permission.object_name}>
                        <TableCell className="font-medium">
                          {permission.display_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {permission.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {permission.description}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Switch
                              checked={editedPermission.can_view}
                              onCheckedChange={(value) => handlePermissionChange(permission.object_name, 'view', value)}
                            />
                          ) : (
                            getPermissionIcon(permission.can_view)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Switch
                              checked={editedPermission.can_edit}
                              onCheckedChange={(value) => handlePermissionChange(permission.object_name, 'edit', value)}
                            />
                          ) : (
                            getPermissionIcon(permission.can_edit)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Switch
                              checked={editedPermission.can_create}
                              onCheckedChange={(value) => handlePermissionChange(permission.object_name, 'create', value)}
                            />
                          ) : (
                            getPermissionIcon(permission.can_create)
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Switch
                              checked={editedPermission.can_delete}
                              onCheckedChange={(value) => handlePermissionChange(permission.object_name, 'delete', value)}
                            />
                          ) : (
                            getPermissionIcon(permission.can_delete)
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {filteredPermissions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No permissions found matching your search criteria.
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};

export default PortfolioPermissionsDrillDown;