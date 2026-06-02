import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, UserPlus, UserX, Pencil, Eye, EyeOff, Copy, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSystemAdmins, SystemAdmin } from '@/hooks/useSystemAdmins';
import { SystemAdminRoleType } from '@/hooks/useSystemAdminPermissions';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export const SystemAdminManager: React.FC = () => {
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRole, setSelectedRole] = useState<SystemAdminRoleType>('matchmaker');
  
  // Password fields for direct super admin creation
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Success dialog for direct creation
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdAdminEmail, setCreatedAdminEmail] = useState('');
  const [createdAdminPassword, setCreatedAdminPassword] = useState('');
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdmin | null>(null);
  const [editRole, setEditRole] = useState<SystemAdminRoleType>('matchmaker');
  const [editNotes, setEditNotes] = useState('');

  const { 
    useAllSystemAdmins, 
    useSendAdminInvitation, 
    usePendingInvitations,
    useCancelInvitation,
    useResendInvitation,
    useRevokeSystemAdmin, 
    useUpdateSystemAdmin,
    useCreateSystemAdminDirect
  } = useSystemAdmins();
  
  const { data: admins = [], isLoading } = useAllSystemAdmins();
  const { data: pendingInvitations = [], isLoading: invitationsLoading } = usePendingInvitations();
  const sendInvitationMutation = useSendAdminInvitation();
  const cancelInvitationMutation = useCancelInvitation();
  const resendInvitationMutation = useResendInvitation();
  const revokeMutation = useRevokeSystemAdmin();
  const updateMutation = useUpdateSystemAdmin();
  const createDirectMutation = useCreateSystemAdminDirect();
  const queryClient = useQueryClient();
  
  // Delete mutation for completely removing user account
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'delete_user',
          userId: userId
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-directory'] });
      toast.success('System admin account deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete admin account');
    },
  });

  const { user: currentUser } = useAuth();

  // Fetch MFA status for all listed admins (admins can SELECT all rows per RLS)
  const adminUserIds = useMemo(() => admins.map((a) => a.user_id), [admins]);
  const { data: mfaRows = [] } = useQuery({
    queryKey: ['system-admins-mfa-status'],
    enabled: adminUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('user_id, enrolled_at')
        .in('user_id', adminUserIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mfaEnabledByUserId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of mfaRows as Array<{ user_id: string; enrolled_at: string | null }>) {
      map.set(row.user_id, !!row.enrolled_at);
    }
    return map;
  }, [mfaRows]);

  const resetMfaMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: { operation: 'reset_mfa', userId },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Reset failed');
      return userId;
    },
    onSuccess: (userId: string) => {
      // Optimistically flip the row off immediately
      queryClient.setQueryData(['system-admins-mfa-status'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((r: any) => r.user_id !== userId);
      });
      queryClient.invalidateQueries({ queryKey: ['system-admins-mfa-status'] });
      toast.success('MFA wiped — user will sign in with email + password until they re-enroll');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to wipe MFA');
    },
  });

  const handleToggleMfa = (userId: string, name: string, currentlyOn: boolean) => {
    if (!currentlyOn) {
      toast.info('MFA can only be enabled by the user on their own device at /account/security');
      return;
    }
    if (!confirm(`Wipe MFA for ${name}? They'll sign in with email + password until they re-enroll on /account/security.`)) return;
    resetMfaMutation.mutate(userId);
  };

  // Password fields are now used for all roles - no clearing needed

  const handleSendInvitation = async () => {
    if (!newAdminEmail) return;
    
    await sendInvitationMutation.mutateAsync({ 
      email: newAdminEmail, 
      notes, 
      role: selectedRole,
      first_name: firstName,
      last_name: lastName,
      phone: phone
    });
    setIsGrantDialogOpen(false);
    resetForm();
  };

  const handleCreateDirect = async () => {
    // Validation
    if (!newAdminEmail) {
      toast.error('Email is required');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    await createDirectMutation.mutateAsync({ 
      email: newAdminEmail,
      password,
      role: selectedRole,
      first_name: firstName,
      last_name: lastName,
      phone,
      notes
    });
    
    // Show success dialog with credentials
    setCreatedAdminEmail(newAdminEmail);
    setCreatedAdminPassword(password);
    setShowSuccessDialog(true);
    setIsGrantDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setNewAdminEmail('');
    setNotes('');
    setSelectedRole('matchmaker');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createdAdminPassword);
    toast.success('Password copied to clipboard');
  };

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { label: '', color: '' };
    if (pwd.length < 8) return { label: 'Too short', color: 'text-red-500' };
    if (pwd.length < 12) return { label: 'Medium', color: 'text-yellow-500' };
    return { label: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleEditAdmin = async () => {
    if (!editingAdmin) return;
    
    await updateMutation.mutateAsync({
      adminId: editingAdmin.id,
      role: editRole,
      notes: editNotes,
    });
    
    setIsEditDialogOpen(false);
    setEditingAdmin(null);
    setEditRole('matchmaker');
    setEditNotes('');
  };

  const handleDeleteAdmin = async (userId: string, email: string, name: string) => {
    if (!confirm(`Are you sure you want to DELETE the entire account for ${name} (${email})?\n\nThis will permanently remove:\n- Their admin access\n- Their user account\n- All their data\n\nUse "Revoke" instead if you just want to remove admin access.`)) {
      return;
    }
    deleteMutation.mutate(userId);
  };

  const openEditDialog = (admin: SystemAdmin) => {
    setEditingAdmin(admin);
    setEditRole(admin.role_name as SystemAdminRoleType);
    setEditNotes(admin.notes || '');
    setIsEditDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      super_admin: { label: 'Super Admin', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
      operations_admin: { label: 'Operations Admin', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
      matchmaker: { label: 'Matchmaker', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
    };
    
    const config = roleConfig[role as SystemAdminRoleType] || roleConfig.matchmaker;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Administrators
          </CardTitle>
          <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add System Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Admin Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Admin Role</Label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as SystemAdminRoleType)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">
                        <div>
                          <div className="font-medium">Super Admin</div>
                          <div className="text-xs text-muted-foreground">Full control - Can delete and configure everything</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="operations_admin">
                        <div>
                          <div className="font-medium">Operations Admin</div>
                          <div className="text-xs text-muted-foreground">Can view/edit/create - No delete or settings access</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="matchmaker">
                        <div>
                          <div className="font-medium">Matchmaker</div>
                          <div className="text-xs text-muted-foreground">Can view accounts and manage matches only</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Password fields for direct account creation */}
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                    Direct Account Creation
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">
                    You will set the password and provide credentials directly to the admin.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <p className={`text-xs mt-1 ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs mt-1 text-red-500">
                      Passwords do not match
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for granting admin access..."
                  />
                </div>
                
                <Button 
                  onClick={handleCreateDirect} 
                  disabled={createDirectMutation.isPending || !newAdminEmail || !password || password !== confirmPassword}
                  className="w-full"
                >
                  {createDirectMutation.isPending ? 'Creating...' : 'Create Admin Account'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage platform system administrators with full access to all features
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Pending Invitations</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : (
                    pendingInvitations.map((invitation: any) => {
                      const expiresDate = new Date(invitation.expires_at);
                      const now = new Date();
                      const hoursLeft = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60));
                      
                      return (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            {invitation.first_name && invitation.last_name 
                              ? `${invitation.first_name} ${invitation.last_name}`
                              : '-'}
                          </TableCell>
                          <TableCell>{invitation.email}</TableCell>
                          <TableCell>{getRoleBadge(invitation.role_name)}</TableCell>
                          <TableCell className="text-sm">{invitation.inviter_name}</TableCell>
                          <TableCell>
                            <span className={hoursLeft < 24 ? 'text-orange-500' : ''}>
                              {hoursLeft < 24 ? `${hoursLeft}h left` : expiresDate.toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                               <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitationMutation.mutate({
                                  invitationId: invitation.id,
                                  email: invitation.email,
                                  role: invitation.role_name,
                                  notes: invitation.notes,
                                  first_name: invitation.first_name,
                                  last_name: invitation.last_name,
                                  phone: invitation.phone
                                })}
                                disabled={resendInvitationMutation.isPending}
                              >
                                Resend
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                                disabled={cancelInvitationMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Active System Admins */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Active System Admins</h3>
          <div className="border rounded-lg">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No system administrators found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => {
                  const mfaOn = mfaEnabledByUserId.get(admin.user_id) ?? false;
                  const isSelf = currentUser?.id === admin.user_id;
                  return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      {admin.first_name} {admin.last_name}
                    </TableCell>
                    <TableCell>{admin.user_email}</TableCell>
                    <TableCell>
                      {getRoleBadge(admin.role_name)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={mfaOn}
                          disabled={resetMfaMutation.isPending}
                          onCheckedChange={() =>
                            handleToggleMfa(
                              admin.user_id,
                              `${admin.first_name} ${admin.last_name}`,
                              mfaOn,
                            )
                          }
                          aria-label={mfaOn ? 'Wipe MFA' : 'MFA disabled'}
                        />
                        {mfaOn ? (
                          <span className="inline-flex items-center text-xs text-green-700 dark:text-green-400">
                            <ShieldCheck className="w-3 h-3 mr-1" /> On
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-muted-foreground">
                            <ShieldOff className="w-3 h-3 mr-1" /> Off
                          </span>
                        )}
                        {!mfaOn && isSelf && (
                          <Link to="/account/security" className="text-xs text-primary hover:underline">
                            Enroll
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {admin.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDialog(admin)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => revokeMutation.mutate(admin.user_id)}
                          disabled={revokeMutation.isPending}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.user_id, admin.user_email, `${admin.first_name} ${admin.last_name}`)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit System Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin</Label>
              <p className="text-sm text-muted-foreground">
                {editingAdmin?.first_name} {editingAdmin?.last_name} ({editingAdmin?.user_email})
              </p>
            </div>
            <div>
              <Label htmlFor="edit-role">Admin Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as SystemAdminRoleType)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div>
                      <div className="font-medium">Super Admin</div>
                      <div className="text-xs text-muted-foreground">Full control - Can delete and configure everything</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="operations_admin">
                    <div>
                      <div className="font-medium">Operations Admin</div>
                      <div className="text-xs text-muted-foreground">Can view/edit/create - No delete or settings access</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="matchmaker">
                    <div>
                      <div className="font-medium">Matchmaker</div>
                      <div className="text-xs text-muted-foreground">Can view accounts and manage matches only</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Reason for role or notes..."
              />
            </div>
            <Button 
              onClick={handleEditAdmin} 
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Admin'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Show created credentials */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Super Admin Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                The admin account has been created. Please share these credentials securely with the admin.
              </p>
              
              <div className="space-y-3 bg-white dark:bg-gray-900 p-3 rounded border">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{createdAdminEmail}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
                      {showCreatedPassword ? createdAdminPassword : '••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                    >
                      {showCreatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPassword}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                ⚠️ <strong>Important:</strong> Store these credentials securely. The admin should change their password after first login.
              </p>
            </div>

            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                setCreatedAdminEmail('');
                setCreatedAdminPassword('');
                setShowCreatedPassword(false);
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
