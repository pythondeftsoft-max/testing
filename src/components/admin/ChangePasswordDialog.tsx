import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setAcknowledged(false);
    onClose();
  };

  const handleSetPassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!acknowledged) {
      toast({
        title: "Acknowledgment Required",
        description: "Please acknowledge that you understand this action.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: {
          userId,
          newPassword,
        }
      });

      if (error) {
        let errorMessage = "Password update failed. Please choose a stronger password or try again.";

        try {
          if (error.context && error.context instanceof Response) {
            const body = await error.context.json();
            if (body?.error) {
              errorMessage = body.error;
            }
          }
        } catch {
          // If parsing fails, keep the friendly fallback message
        }

        throw new Error(errorMessage);
      }

      if (data?.success === false) {
        throw new Error(data.error || "Password update failed. Please choose a stronger password or try again.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Password Updated",
        description: `Password for ${userName} (${userEmail}) has been successfully updated.`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please choose a stronger password or try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Set Password Directly
          </DialogTitle>
          <DialogDescription>
            Directly set a new password for {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-yellow-600/20 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Warning:</strong> This action will immediately change the user's password without 
            sending them an email notification. Use this feature carefully and only when necessary.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            />
            <label
              htmlFor="acknowledge"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand that this will immediately change the user's password without notification
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSetPassword} 
            disabled={loading || !acknowledged}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
