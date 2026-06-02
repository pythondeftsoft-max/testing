import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ChangeEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentEmail: string;
  onEmailChanged: () => void;
}

const ChangeEmailDialog: React.FC<ChangeEmailDialogProps> = ({
  isOpen,
  onClose,
  userId,
  currentEmail,
  onEmailChanged,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const { toast } = useToast();

  const isValid =
    newEmail.length > 0 &&
    newEmail === confirmEmail &&
    newEmail !== currentEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) &&
    acknowledged;

  const handleChangeEmail = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      // Update email via admin edge function
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'change_email',
          userId: userId,
          newEmail: newEmail,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Email updated",
        description: `Email has been changed to ${newEmail}. User will receive a confirmation email.`,
      });

      onEmailChanged();
      onClose();
      setNewEmail('');
      setConfirmEmail('');
      setAcknowledged(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change email address.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewEmail('');
    setConfirmEmail('');
    setAcknowledged(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
          <DialogDescription>
            Update the user's email address. A confirmation email will be sent to the new address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Current Email</Label>
            <Input value={currentEmail} disabled />
          </div>

          <div>
            <Label htmlFor="new_email">New Email</Label>
            <Input
              id="new_email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
              placeholder="newemail@example.com"
            />
          </div>

          <div>
            <Label htmlFor="confirm_email">Confirm New Email</Label>
            <Input
              id="confirm_email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value.toLowerCase().trim())}
              placeholder="newemail@example.com"
            />
            {confirmEmail && newEmail !== confirmEmail && (
              <p className="text-sm text-destructive mt-1">Emails do not match</p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>User will receive a confirmation email at the new address</li>
                  <li>They must verify the new email to access their account</li>
                  <li>This action cannot be undone automatically</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            />
            <Label htmlFor="acknowledge" className="text-sm font-normal cursor-pointer">
              I understand the user will need to verify their new email address
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleChangeEmail} disabled={!isValid || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeEmailDialog;
