import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioRoleType } from '@/hooks/usePortfolioRoles';
import { Users, Mail, Send } from 'lucide-react';

interface PortfolioInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
}

const ROLE_LABELS: Record<PortfolioRoleType, string> = {
  admin_partner: 'Admin Partner',
  editor: 'Editor',
  viewer: 'Viewer',
  maintenance: 'Maintenance'
};

const ROLE_DESCRIPTIONS: Record<PortfolioRoleType, string> = {
  admin_partner: 'Full access to manage all aspects of the portfolio',
  editor: 'Can view and edit properties, assets, and financial data',
  viewer: 'Read-only access to portfolio information',
  maintenance: 'Limited access focused on maintenance tasks'
};

export const PortfolioInviteDialog: React.FC<PortfolioInviteDialogProps> = ({
  isOpen,
  onClose,
  portfolioId
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PortfolioRoleType>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to send the invitation.",
        variant: "destructive"
      });
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('portfolio_invitations')
        .insert({
          portfolio_id: portfolioId,
          invited_email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          inviter_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Error sending portfolio invitation:', error);
        toast({
          title: "Invitation failed",
          description: error.message || "Failed to send invitation. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Invitation sent!",
        description: `Portfolio invitation sent to ${inviteEmail}`,
      });

      // Reset form and close dialog
      setInviteEmail('');
      setInviteRole('viewer');
      onClose();

    } catch (error) {
      console.error('Exception sending portfolio invitation:', error);
      toast({
        title: "Invitation failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setInviteEmail('');
      setInviteRole('viewer');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite to Portfolio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send Portfolio Invitation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value: PortfolioRoleType) => setInviteRole(value)}>
                  <SelectTrigger disabled={isSubmitting}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS[value as PortfolioRoleType]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isSubmitting || !inviteEmail.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};