import React, { useState } from 'react';
import { useAccountInvitations } from '@/hooks/useAccountInvitations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, RefreshCw, X, Copy, Clock, AlertCircle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const InvitationManagementTab = () => {
  const { invitations, loading, resendInvitation, cancelInvitation, refetch } = useAccountInvitations();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !role) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-account-invitation', {
        body: {
          email,
          role,
          firstName,
          lastName,
          notes: notes || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation sent successfully to ${email}`,
      });

      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('');
      setNotes('');
      
      refetch();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send invitation.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/accept-invitation?token=${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link Copied",
        description: "Invitation link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (invitation: any) => {
    if (invitation.status === 'cancelled') {
      return { label: 'Cancelled', variant: 'secondary' as const, icon: null };
    }
    
    if (invitation.accepted_at) {
      return { label: 'Accepted', variant: 'default' as const, icon: null };
    }

    const expiresAt = new Date(invitation.expires_at);
    const isExpired = isPast(expiresAt);
    const daysUntilExpiry = differenceInDays(expiresAt, new Date());

    if (isExpired) {
      return { label: 'Expired', variant: 'destructive' as const, icon: <AlertCircle className="w-3 h-3" /> };
    }

    if (daysUntilExpiry <= 2) {
      return { 
        label: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`, 
        variant: 'destructive' as const,
        icon: <Clock className="w-3 h-3" />
      };
    }

    return { label: 'Pending', variant: 'default' as const, icon: null };
  };

  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && !inv.accepted_at
  );

  return (
    <div className="space-y-6">
      {/* Send New Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send New Invitation
          </CardTitle>
          <CardDescription>
            Invite a new user to join your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin_partner">Admin Partner</SelectItem>
                  <SelectItem value="support_assistant">Support Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes for this invitation..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={sending} className="w-full">
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations ({pendingInvitations.length})
          </CardTitle>
          <CardDescription>
            Manage pending user invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((invitation) => {
                    const statusInfo = getStatusInfo(invitation);
                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.email.split('@')[0]}
                        </TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell className="capitalize">
                          {invitation.role.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyLink(invitation.invitation_token)}
                              title="Copy invitation link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resendInvitation(invitation.id)}
                              title="Resend invitation"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCancellingId(invitation.id)}
                              title="Cancel invitation"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (cancellingId) {
                  await cancelInvitation(cancellingId);
                  setCancellingId(null);
                }
              }}
            >
              Yes, Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvitationManagementTab;
