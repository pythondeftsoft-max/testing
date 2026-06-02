
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, Shield, Users, Mail, AlertTriangle } from 'lucide-react';
import { useGlobalRoles } from '@/hooks/useGlobalRoles';
import { useToast } from '@/hooks/use-toast';

const GlobalUserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'admin_partner' | 'support_assistant'>('support_assistant');
  const [roleNotes, setRoleNotes] = useState('');
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  const { toast } = useToast();
  const {
    useAllUsersWithRoles,
    useAdminGrantAccountRole,
    useAdminRevokeAccountRole,
  } = useGlobalRoles();

  const { data: users = [], isLoading, error } = useAllUsersWithRoles();
  const grantRoleMutation = useAdminGrantAccountRole();
  const revokeRoleMutation = useAdminRevokeAccountRole();

  const handleGrantRole = async () => {
    if (!newUserEmail || !newUserRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, you'd need to resolve email to user ID
      // For now, we'll show this is where that logic would go
      toast({
        title: "Email Resolution Needed",
        description: "Email to User ID resolution needs to be implemented in the RPC function.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error granting account role:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterRole === 'all') return matchesSearch;
    
    const hasRole = user.account_roles?.includes(filterRole);
    return matchesSearch && hasRole;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Global User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Global User Management - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive">Error loading users: {error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Global User Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and global role assignments
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin_partner">Admin Partner</SelectItem>
              <SelectItem value="support_assistant">Support Assistant</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Grant Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Account Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">User Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin_partner">Admin Partner</SelectItem>
                      <SelectItem value="support_assistant">Support Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={roleNotes}
                    onChange={(e) => setRoleNotes(e.target.value)}
                    placeholder="Add notes about this role assignment..."
                  />
                </div>
                <Button onClick={handleGrantRole} disabled={grantRoleMutation.isPending}>
                  {grantRoleMutation.isPending ? 'Granting...' : 'Grant Role'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Results Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total Users: {users.length}</span>
          <span>Filtered Results: {filteredUsers.length}</span>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account Roles</TableHead>
                <TableHead>Portfolios</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterRole !== 'all' 
                      ? 'No users match your filters' 
                      : 'No users found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.user_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.user_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.user_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.account_roles && user.account_roles.length > 0 ? (
                          user.account_roles.map((role, index) => (
                            <Badge key={index} variant="secondary">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.portfolio_count} portfolios
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never signed in'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Shield className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalUserManagement;
