
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, UserMinus, Search, Filter, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useGlobalRoles, GlobalUser } from '@/hooks/useGlobalRoles';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

const GlobalAccountOverview: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newRole, setNewRole] = useState<'owner' | 'admin_partner' | 'support_assistant' | ''>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const queryClient = useQueryClient();
  const { useAllUsersWithRoles, useAdminGrantAccountRole, useAdminRevokeAccountRole } = useGlobalRoles();
  
  const { data: users, isLoading, error } = useAllUsersWithRoles();
  const grantRoleMutation = useAdminGrantAccountRole();
  const revokeRoleMutation = useAdminRevokeAccountRole();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['global-users-with-roles'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleGrantRole = async () => {
    if (!selectedUser || !newRole) return;
    
    await grantRoleMutation.mutateAsync({
      targetUserId: selectedUser,
      role: newRole,
      notes: 'Granted by platform admin'
    });
    
    setSelectedUser('');
    setNewRole('');
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    // Note: This would need an account_role_id - we'll need to enhance the data structure
    console.log('Revoke role:', { userId, role });
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.account_roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.account_roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load users: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Global Account Roles Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin_partner">Admin Partner</SelectItem>
                <SelectItem value="support_assistant">Support Assistant</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Grant New Role Section */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.user_name} ({user.user_email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={newRole} onValueChange={(value: 'owner' | 'admin_partner' | 'support_assistant') => setNewRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin_partner">Admin Partner</SelectItem>
                      <SelectItem value="support_assistant">Support Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGrantRole}
                  disabled={!selectedUser || !newRole || grantRoleMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {grantRoleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Grant Role
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* All Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Account Roles</TableHead>
                  <TableHead>Portfolio Count</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.user_name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>{user.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.user_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.account_roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        ) : (
                          user.account_roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.portfolio_count}</TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPp') : 'Never'}
                    </TableCell>
                    <TableCell>{format(new Date(user.created_at), 'PP')}</TableCell>
                    <TableCell>
                      {user.account_roles.length > 0 && (
                        <Select onValueChange={(role) => handleRevokeRole(user.user_id, role)}>
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Revoke" />
                          </SelectTrigger>
                          <SelectContent>
                            {user.account_roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                Revoke {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalAccountOverview;
