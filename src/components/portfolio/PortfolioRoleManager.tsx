
import React, { useState, useEffect } from 'react';
import { usePortfolioRoles, PortfolioRoleType } from '@/hooks/usePortfolioRoles';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Trash2, Shield, Edit, Mail, Clock, RotateCcw, X, Eye } from 'lucide-react';

interface PortfolioRoleManagerProps {
  portfolioId: string;
  currentUserId: string;
}

const ROLE_LABELS: Record<PortfolioRoleType, string> = {
  admin_partner: 'Admin Partner',
  editor: 'Editor',
  viewer: 'Viewer',
  maintenance: 'Maintenance',
};

const ROLE_DESCRIPTIONS: Record<PortfolioRoleType, string> = {
  admin_partner: 'Full access to the portfolio (cannot delete portfolio or account)',
  editor: 'Can manage tenants, update rent logs, upload documents, etc.',
  viewer: 'Read-only access to all data in the portfolio',
  maintenance: 'Limited access, only view unit maintenance status and submit tickets',
};

const ROLE_TAG_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'pm', label: 'Property Manager' },
  { value: 'assistant', label: 'Assistant / Support Staff' },
  { value: 'investor', label: 'Investor / Silent Partner' },
];

const PortfolioRoleManager = ({ portfolioId, currentUserId }: PortfolioRoleManagerProps) => {
  const { portfolioRoles, userRole, isAdminPartner, loading } = usePortfolioRoles(portfolioId, currentUserId);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PortfolioRoleType>('viewer');
  const [roleTag, setRoleTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<PortfolioRoleType>('viewer');
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const { toast } = useToast();

  // Real-time subscription for role changes
  useEffect(() => {
    // Skip subscription for aggregate "everything" view
    if (portfolioId === 'everything') {
      return;
    }

    const channel = supabase
      .channel('portfolio-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_roles',
          filter: `portfolio_id=eq.${portfolioId}`,
        },
        (payload) => {
          console.log('Portfolio role change detected:', payload);
          // The usePortfolioRoles hook will automatically refetch data due to React Query invalidation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [portfolioId]);

  // Fetch pending invitations
  useEffect(() => {
    if (showPendingInvites && isAdminPartner) {
      fetchPendingInvites();
    }
  }, [showPendingInvites, isAdminPartner]);

  // Fetch pending invitations count on component mount
  useEffect(() => {
    if (isAdminPartner && portfolioId) {
      fetchPendingInvites();
    }
  }, [portfolioId, isAdminPartner]);

  const fetchPendingInvites = async () => {
    // Skip fetching for aggregate "everything" view
    if (portfolioId === 'everything') {
      setPendingInvites([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const { data, error } = await supabase
        .from('portfolio_invitations')
        .select('*', { count: 'exact' })
        .eq('portfolio_id', portfolioId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending invitations:', error);
        toast({
          title: 'Error Loading Invitations',
          description: `Failed to load pending invitations: ${error.message}`,
          variant: 'destructive',
        });
        throw error;
      }

      setPendingInvites(data || []);
    } catch (error) {
      console.error('Error in fetchPendingInvites:', error);
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('resend-invitation', {
        body: { invitation_id: inviteId }
      });

      if (error) throw error;

      toast({
        title: 'Invitation Resent',
        description: `Successfully resent invitation to ${email}`,
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Invitation Cancelled',
        description: `Cancelled invitation for ${email}`,
      });

      fetchPendingInvites(); // Refresh the list
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive',
      });
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user info and portfolio info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('client_name')
        .eq('id', portfolioId)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', currentUserId)
        .single();

      if (!user || !portfolio || !profile) {
        throw new Error('Failed to get user or portfolio information');
      }

      const inviterName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Team Member';

      // Send invitation email via edge function
      const { data, error } = await supabase.functions.invoke('send-portfolio-invitation', {
        body: {
          portfolio_id: portfolioId,
          portfolio_name: portfolio.client_name,
          inviter_name: inviterName,
          invited_email: inviteEmail,
          role: inviteRole,
          role_tag: roleTag
        }
      });

      if (error) throw error;

      toast({
        title: 'Invitation Queued',
        description: `Portfolio invitation queued for ${inviteEmail}. Check pending invitations to track status.`,
      });

      // Refresh the pending invites list to update the count
      fetchPendingInvites();

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      setRoleTag('');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to send portfolio invitation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLevel = (role: PortfolioRoleType): number => {
    const levels = { admin_partner: 4, editor: 3, viewer: 2, maintenance: 1 };
    return levels[role];
  };

  const handleUpdateRole = async (roleId: string, newRoleType: PortfolioRoleType) => {
    if (!userRole) return;

    try {
      // Validate role hierarchy - users can't promote others above their own level
      const currentUserLevel = getRoleLevel(userRole.role_name);
      const newRoleLevel = getRoleLevel(newRoleType);
      
      if (newRoleLevel > currentUserLevel) {
        toast({
          title: 'Permission Denied',
          description: 'You cannot assign a role higher than your own.',
          variant: 'destructive',
        });
        setEditingRole(null);
        return;
      }

      // Get the role being updated to check if it's downgrading from admin_partner
      const targetRole = portfolioRoles?.find(r => r.id === roleId);
      if (targetRole?.role_name === 'admin_partner' && newRoleType !== 'admin_partner') {
        // Check if this would leave no admin partners
        const adminCount = portfolioRoles?.filter(r => r.role_name === 'admin_partner').length || 0;
        if (adminCount <= 1) {
          toast({
            title: 'Cannot Remove Last Admin',
            description: 'At least one admin partner must remain in the portfolio.',
            variant: 'destructive',
          });
          setEditingRole(null);
          return;
        }
      }

      const { error } = await supabase
        .from('portfolio_roles')
        .update({ 
          role_name: newRoleType,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `Successfully updated user role to ${ROLE_LABELS[newRoleType]}`,
      });
      
      setEditingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
      setEditingRole(null);
    }
  };

  const handleRemoveRole = async (roleId: string, userName: string) => {
    if (!userRole) return;

    try {
      // Check if this is an admin_partner and if removing would leave no admins
      const targetRole = portfolioRoles?.find(r => r.id === roleId);
      if (targetRole?.role_name === 'admin_partner') {
        const adminCount = portfolioRoles?.filter(r => r.role_name === 'admin_partner').length || 0;
        if (adminCount <= 1) {
          toast({
            title: 'Cannot Remove Last Admin',
            description: 'At least one admin partner must remain in the portfolio.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Prevent users from removing roles of users with equal or higher privileges
      const currentUserLevel = getRoleLevel(userRole.role_name);
      const targetUserLevel = getRoleLevel(targetRole?.role_name || 'viewer');
      
      if (targetUserLevel >= currentUserLevel && targetRole?.user_id !== currentUserId) {
        toast({
          title: 'Permission Denied',
          description: 'You cannot remove users with equal or higher privileges.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('portfolio_roles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Access Removed',
        description: `Successfully removed ${userName} from the portfolio`,
      });
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user access',
        variant: 'destructive',
      });
    }
  };

  if (!isAdminPartner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portfolio Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Only admin partners can manage user roles and permissions.
          </p>
          {userRole && (
            <Badge variant="secondary" className="mt-2">
              Your role: {ROLE_LABELS[userRole.role_name]}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading roles...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Portfolio Team ({portfolioRoles?.length || 0})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline" 
              onClick={() => setShowPendingInvites(!showPendingInvites)}
            >
              <Clock className="h-4 w-4 mr-2" />
              {showPendingInvites ? 'Hide' : 'Show'} Pending ({pendingInvites.length})
            </Button>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User to Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="permissions">Permissions</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as PortfolioRoleType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <SelectItem key={role} value={role}>
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground">
                              {ROLE_DESCRIPTIONS[role as PortfolioRoleType]}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role-tag">Role Tag</Label>
                  <Select value={roleTag} onValueChange={setRoleTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_TAG_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteUser} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showPendingInvites && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invitations ({pendingInvites.length})
            </h3>
            {pendingInvites.length > 0 ? (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-background border rounded">
                    <div>
                      <div className="font-medium">{invite.invited_email}</div>
                      <div className="text-sm text-muted-foreground">
                        Role: {ROLE_LABELS[invite.role as PortfolioRoleType]} • 
                        Invited: {new Date(invite.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvite(invite.id, invite.invited_email)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelInvite(invite.id, invite.invited_email)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No pending invitations</p>
            )}
          </div>
        )}
        {portfolioRoles && portfolioRoles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {role.profiles?.first_name} {role.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {role.user_id === currentUserId && '(You)'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingRole === role.id ? (
                      <Select 
                        value={newRole} 
                        onValueChange={(value) => setNewRole(value as PortfolioRoleType)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([roleType, label]) => (
                            <SelectItem key={roleType} value={roleType}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={role.role_name === 'admin_partner' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[role.role_name]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.role_tag && (
                      <Badge variant="outline">
                        {ROLE_TAG_OPTIONS.find(t => t.value === role.role_tag)?.label || role.role_tag}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(role.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingRole === role.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateRole(role.id, newRole)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRole(null);
                              setNewRole('viewer');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRole(role.id);
                              setNewRole(role.role_name);
                            }}
                            disabled={role.user_id === currentUserId}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={role.user_id === currentUserId}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove User Access</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {role.profiles?.first_name} {role.profiles?.last_name} from this portfolio? 
                                  They will no longer have access to any portfolio data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveRole(role.id, `${role.profiles?.first_name} ${role.profiles?.last_name}`)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No team members yet</p>
            <p className="text-sm">Start by inviting users to collaborate on this portfolio.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioRoleManager;
