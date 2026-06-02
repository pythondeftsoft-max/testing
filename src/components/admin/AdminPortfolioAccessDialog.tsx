import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Trash2, Edit3, Shield, Users, Mail, Clock, Copy, RotateCcw, X } from 'lucide-react';
import { useGlobalRoles, GlobalPortfolio } from '@/hooks/useGlobalRoles';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioPermissionsManager } from '@/components/portfolio/PortfolioPermissionsManager';
import { usePortfolioInvitations } from '@/hooks/usePortfolioInvitations';

interface AdminPortfolioAccessDialogProps {
  portfolio: GlobalPortfolio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminPortfolioAccessDialog: React.FC<AdminPortfolioAccessDialogProps> = ({
  portfolio,
  open,
  onOpenChange,
}) => {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin_partner' | 'editor' | 'viewer' | 'maintenance'>('viewer');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin_partner' | 'editor' | 'viewer' | 'maintenance'>('viewer');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const { toast } = useToast();
  const {
    useAdminGrantPortfolioRole,
    useAdminRevokePortfolioRole,
  } = useGlobalRoles();
  
  const {
    invitations,
    loading: invitationsLoading,
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    updateInvitationRole,
    copyInvitationLink,
    isExpiringSoon,
    isExpired
  } = usePortfolioInvitations(portfolio?.portfolio_id);

  const grantRoleMutation = useAdminGrantPortfolioRole();
  const revokeRoleMutation = useAdminRevokePortfolioRole();

  // Helper function to resolve email to user ID
  const getUserIdByEmail = async (email: string): Promise<string | null> => {
    try {
      // Using type assertion since get_user_id_by_email was just created
      const { data, error } = await (supabase as any).rpc('get_user_id_by_email', {
        p_email: email
      });
      
      if (error) {
        console.error('Error resolving email to user ID:', error);
        return null;
      }
      
      return data as string | null;
    } catch (error) {
      console.error('Error in getUserIdByEmail:', error);
      return null;
    }
  };

  const handleAddMember = async () => {
    if (!portfolio || !newMemberEmail || !newMemberRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingMember(true);
    
    try {
      // Resolve email to user ID
      const userId = await getUserIdByEmail(newMemberEmail);
      
      if (!userId) {
        toast({
          title: "User Not Found",
          description: "No user found with that email address.",
          variant: "destructive",
        });
        return;
      }

      // Grant the portfolio role
      await grantRoleMutation.mutateAsync({
        portfolioId: portfolio.portfolio_id,
        targetUserId: userId,
        role: newMemberRole,
      });

      // Reset form
      setNewMemberEmail('');
      setNewMemberRole('viewer');
      
      toast({
        title: "Member Added",
        description: `Successfully granted ${newMemberRole} access to ${newMemberEmail}.`,
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Failed to Add Member",
        description: "An error occurred while adding the team member.",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRevokeMember = async (portfolioRoleId: string, userEmail: string) => {
    try {
      await revokeRoleMutation.mutateAsync({ portfolioRoleId });
      
      toast({
        title: "Access Revoked",
        description: `Successfully revoked access for ${userEmail}.`,
      });
    } catch (error) {
      console.error('Error revoking member:', error);
      toast({
        title: "Failed to Revoke Access",
        description: "An error occurred while revoking access.",
        variant: "destructive",
      });
    }
  };

  const handleSendInvitation = async () => {
    if (!portfolio || !inviteEmail || !inviteRole) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingInvite(true);
    
    try {
      await sendInvitation({
        portfolioId: portfolio.portfolio_id,
        inviteeEmail: inviteEmail,
        inviteeName: inviteEmail.split('@')[0],
        roleType: inviteRole,
        inviteeType: 'new_user',
        additionalData: {
          portfolioName: portfolio.portfolio_name
        }
      });

      // Reset form
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSendingInvite(false);
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'Expired';
    if (diffHours < 24) return `${Math.ceil(diffHours)}h remaining`;
    return `${Math.ceil(diffHours / 24)}d remaining`;
  };

  const getStatusBadgeVariant = (invitation: any) => {
    if (invitation.status === 'pending') {
      if (isExpired(invitation)) return 'destructive';
      if (isExpiringSoon(invitation)) return 'warning';
      return 'default';
    }
    if (invitation.status === 'accepted') return 'success';
    if (invitation.status === 'declined') return 'secondary';
    return 'destructive';
  };

  if (!portfolio) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Manage Portfolio Access - {portfolio.portfolio_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            {/* Add New Member Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add Team Member
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="member-email">User Email</Label>
                    <Input
                      id="member-email"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-role">Role</Label>
                    <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_partner">Admin Partner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAddMember} 
                      disabled={isAddingMember || grantRoleMutation.isPending}
                      className="w-full"
                    >
                      {isAddingMember || grantRoleMutation.isPending ? 'Adding...' : 'Add Member'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current Team Members ({portfolio.roles?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio.roles && portfolio.roles.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portfolio.roles.map((role) => (
                          <TableRow key={role.portfolio_role_id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{role.user_name}</div>
                                <div className="text-sm text-muted-foreground">{role.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={role.role_name === 'admin_partner' ? 'default' : 'secondary'}>
                                {role.role_name.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={role.is_active ? 'success' : 'destructive'}>
                                {role.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {new Date(role.updated_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRevokeMember(role.portfolio_role_id, role.user_email)}
                                  disabled={revokeRoleMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members found. Add your first team member above.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            {/* Send New Invitation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Invite to Portfolio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_partner">Admin Partner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleSendInvitation} 
                      disabled={isSendingInvite}
                      className="w-full"
                    >
                      {isSendingInvite ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Invitations ({invitations.filter(inv => inv.status === 'pending').length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading invitations...
                  </div>
                ) : invitations.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>
                              <div className="font-medium">{invitation.invited_email}</div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={invitation.role} 
                                onValueChange={(value) => updateInvitationRole(invitation.id, value)}
                                disabled={invitation.status !== 'pending'}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin_partner">Admin Partner</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusBadgeVariant(invitation)}>
                                  {invitation.status}
                                </Badge>
                                {isExpiringSoon(invitation) && invitation.status === 'pending' && (
                                  <Badge variant="warning" className="text-xs">
                                    Expiring Soon
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {formatExpiryDate(invitation.expires_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {invitation.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => resendInvitation(invitation.id)}
                                      title="Resend invitation"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyInvitationLink(invitation)}
                                      title="Copy invitation link"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => cancelInvitation(invitation.id)}
                                      title="Cancel invitation"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No invitations found. Send your first invitation above.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PortfolioPermissionsManager
              portfolioId={portfolio.portfolio_id}
              currentUserId={portfolio.owner_id}
              isAdminPartner={true}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};