import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Mail, Trash2, Edit, Crown, Shield, Users, Clock, Send, X, AlertCircle, Settings } from 'lucide-react';
import { useAccountRoles, AccountRoleType } from '@/hooks/useAccountRoles';
import { useAccountInvitations } from '@/hooks/useAccountInvitations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PermissionsGrid } from '@/components/permissions/PermissionsGrid';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { DeleteUserConfirmation } from './DeleteUserConfirmation';

const roleConfigs = {
  owner: {
    label: 'Owner',
    description: 'Complete system access and control',
    icon: Crown,
    color: 'from-blue-600 to-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  admin_partner: {
    label: 'Admin Partner',
    description: 'Administrative access with some restrictions',
    icon: Shield,
    color: 'from-amber-500 to-amber-600',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  support_assistant: {
    label: 'Support Assistant',
    description: 'Limited access for support tasks',
    icon: Users,
    color: 'from-slate-500 to-slate-600',
    badgeColor: 'bg-slate-100 text-slate-800',
  },
};

export const AccountRoleManager: React.FC = () => {
  const { user } = useAuth();
  const { allAccountRoles, loading, isAccountOwner, hasPermission, allRolesLoading, allRolesError, statusFilter, setStatusFilter } = useAccountRoles();
  const { invitations, loading: invitationsLoading, resendInvitation, cancelInvitation } = useAccountInvitations();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<{ role: AccountRoleType; userId: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '' as AccountRoleType | '',
    notes: '',
  });
  const [inviting, setInviting] = useState(false);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    roleId: string;
    userId: string;
    userName: string;
    userEmail: string;
    roleName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditPermissions = (role: AccountRoleType, userId: string) => {
    setSelectedUserRole({ role, userId });
    setIsPermissionsOpen(true);
    setIsEditingPermissions(false);
  };

  const handleSavePermissions = () => {
    setIsEditingPermissions(false);
    toast.success('Permissions updated successfully');
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email || !inviteForm.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setInviting(true);
    try {
      // Use the send-account-invitation edge function
      const { data, error } = await supabase.functions.invoke('send-account-invitation', {
        body: {
          email: inviteForm.email,
          role: inviteForm.role,
          notes: inviteForm.notes || undefined,
          firstName: inviteForm.firstName,
          lastName: inviteForm.lastName,
        }
      });

      if (error) throw error;

      // Check if there was a domain verification issue
      if (data?.domainError) {
        toast.warning(
          'Invitation created but email requires domain verification. To send emails to other recipients, please verify a domain at resend.com/domains and update the from address in the edge function.',
          {
            duration: 8000,
            action: {
              label: 'View Domains',
              onClick: () => window.open('https://resend.com/domains', '_blank'),
            },
          }
        );
      } else {
        toast.success('Invitation sent successfully');
      }

      setIsInviteOpen(false);
      setInviteForm({ firstName: '', lastName: '', email: '', role: '', notes: '' });
      // Invitations will be updated via real-time subscription
      } catch (error: any) {
        console.error('Error sending invitation:', error);
        
        // Handle specific error cases
        if (error.message?.includes('already has an active account role')) {
          toast.error(`This user already has access to the account with role: ${error.existingRole}`);
        } else if (error.message?.includes('pending invitation already exists')) {
          toast.error('A pending invitation already exists for this email address');
        } else {
          toast.error(error.message || 'Failed to send invitation');
        }
      } finally {
        setInviting(false);
      }
  };

  const handleRemoveRole = (roleId: string, userId: string, userName: string, userEmail: string, roleName: string) => {
    setUserToDelete({
      roleId,
      userId,
      userName,
      userEmail,
      roleName,
    });
    setIsDeleteDialogOpen(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // Use the centralized remove_account_user function for proper cleanup and logging
      const { data, error } = await supabase.rpc('remove_account_user', {
        p_target_user_id: userToDelete.userId,
        p_removed_by_user_id: user?.id
      });

      if (error) throw error;

      toast.success(`Successfully removed ${userToDelete.userName} from the account`);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error(error.message || 'Failed to remove user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: AccountRoleType, newRole: AccountRoleType, userName: string) => {
    if (!confirm(`Are you sure you want to change ${userName}'s role from ${roleConfigs[currentRole].label} to ${roleConfigs[newRole].label}?`)) {
      return;
    }

    try {
      // Deactivate current role
      const { error: deactivateError } = await supabase
        .from('account_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_name', currentRole)
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Add new role
      const { error: insertError } = await supabase
        .from('account_roles')
        .insert({
          user_id: userId,
          role_name: newRole,
          added_by: user?.id,
          is_active: true
        });

      if (insertError) throw insertError;

      toast.success(`User role updated to ${roleConfigs[newRole].label}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleReactivateUser = async (roleId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reactivate ${userName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('account_roles')
        .update({ is_active: true })
        .eq('id', roleId);

      if (error) throw error;

      toast.success(`${userName} has been reactivated`);
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('Failed to reactivate user');
    }
  };

  if (!isAccountOwner) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
        <p className="text-muted-foreground">
          Only account owners can manage user roles and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Account Role Assignments</h3>
          <p className="text-muted-foreground">
            Manage who has access to your account and what they can do
          </p>
        </div>
        {hasPermission('user_management', 'create') ? (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to a new user to join your account with specific role permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value as AccountRoleType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfigs).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-sm text-muted-foreground">{config.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this user's role..."
                  value={inviteForm.notes}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" variant="gradient" disabled={inviting}>
                  {inviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Inviting...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        ) : (
          <Button variant="outline" disabled title="You don't have permission to invite users">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Current Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Users
            </CardTitle>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Users</SelectItem>
                <SelectItem value="inactive">Inactive Users</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {allRolesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : allRolesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Permission Error</h3>
              <p className="text-muted-foreground mb-4">
                {allRolesError?.message?.includes('not authorized') 
                  ? 'You do not have permission to view user roles. Only account owners can access this section.'
                  : `Failed to load users: ${allRolesError?.message || 'Unknown error'}`}
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                <p>Troubleshooting:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Ensure you have an active owner or admin_partner role</li>
                  <li>Try refreshing the page</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>
          ) : allAccountRoles.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by inviting users to your account
              </p>
              <Button variant="gradient" onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allAccountRoles.map((role: any) => {
                  const config = roleConfigs[role.role_name];
                  const Icon = config.icon;
                  const userName = role.profiles 
                    ? `${role.profiles.first_name || ''} ${role.profiles.last_name || ''}`.trim() || 'Unknown User'
                    : 'Unknown User';
                  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {userInitials || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{userName}</div>
                            <div className="text-sm text-muted-foreground">
                              {role.user_email || `ID: ${role.user_id.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {role.user_email || 'Email not available'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.badgeColor}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(role.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {role.is_active ? (
                            <>
                              {/* Role Change Dropdown - only for active users */}
                              <PermissionGuard object="user_management" action="edit">
                                <Select
                                  value={role.role_name}
                                  onValueChange={(newRole) => handleUpdateRole(role.user_id, role.role_name, newRole as AccountRoleType, userName)}
                                >
                                  <SelectTrigger className="w-44 h-8">
                                    <SelectValue className="truncate" />
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[11rem]">
                                    {Object.entries(roleConfigs).map(([key, config]) => (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                          <config.icon className="w-3 h-3" />
                                          {config.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </PermissionGuard>
                              
                              <PermissionGuard object="permissions" action="edit">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditPermissions(role.role_name, role.user_id)}
                                  title="Edit permissions"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </PermissionGuard>
                              
                              <PermissionGuard object="user_management" action="delete">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRole(
                                    role.id, 
                                    role.user_id, 
                                    userName, 
                                    role.user_email || 'Unknown Email', 
                                    role.role_name
                                  )}
                                  title="Remove user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </PermissionGuard>
                            </>
                          ) : (
                            // Reactivate button for inactive users
                            <PermissionGuard object="user_management" action="edit">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivateUser(role.id, userName)}
                                title="Reactivate user"
                              >
                                Reactivate
                              </Button>
                            </PermissionGuard>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations - Always Visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : invitations.filter(inv => inv.status === 'pending').length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
              <p className="text-muted-foreground">
                All invited users have either accepted their invitations or invitations have expired.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations
                  .filter(invitation => invitation.status === 'pending')
                  .map((invitation) => {
                    const config = roleConfigs[invitation.role as keyof typeof roleConfigs];
                    const Icon = config?.icon || Users;
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="font-medium">{invitation.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={config?.badgeColor || 'bg-slate-100 text-slate-800'}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config?.label || invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {new Date(invitation.expires_at).toLocaleDateString()}
                            {isExpired && <AlertCircle className="w-3 h-3 inline ml-1" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                            {isExpired ? 'Expired' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation(invitation.id)}
                              disabled={invitationsLoading}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              disabled={invitationsLoading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete User Confirmation */}
      <DeleteUserConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmRemoveUser}
        isLoading={isDeleting}
        userName={userToDelete?.userName || ''}
        userEmail={userToDelete?.userEmail || ''}
        userRole={userToDelete?.roleName || ''}
      />

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Edit Permissions
              {selectedUserRole && (
                <Badge className={roleConfigs[selectedUserRole.role].badgeColor}>
                  {roleConfigs[selectedUserRole.role].label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Configure permissions for this user role. Changes will apply to all users with this role.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedUserRole && (
              <PermissionsGrid
                selectedRole={selectedUserRole.role}
                isEditing={isEditingPermissions}
                onEditToggle={setIsEditingPermissions}
                onSave={handleSavePermissions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
