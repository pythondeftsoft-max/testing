import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, RotateCcw, Eye, KeyRound, ShieldOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ChangeEmailDialog from './ChangeEmailDialog';
import ChangePasswordDialog from './ChangePasswordDialog';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  company_name?: string;
  phone: string;
  email: string;
  status: string;
  account_status: string;
  housing_status?: string;
}

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  onViewProfile?: () => void;
}

const EditUserModal = ({ user, isOpen, onClose, onUserUpdated, onViewProfile }: EditUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMfaLoading, setResetMfaLoading] = useState(false);
  const [isChangeEmailDialogOpen, setIsChangeEmailDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    user_type: '',
    company_name: '',
    phone: '',
  });
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [housingStatus, setHousingStatus] = useState<string>('seeking');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        user_type: user.user_type || '',
        company_name: user.company_name || '',
        phone: user.phone || '',
      });
      setAccountStatus(user.account_status || 'active');
      setHousingStatus(user.housing_status || 'seeking');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Update profiles table
      const profileUpdate: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        user_type: formData.user_type as any,
        company_name: formData.company_name?.trim() || null,
        phone: formData.phone?.trim() || null,
      };

      // Add housing status only for tenants
      if (formData.user_type === 'tenant') {
        profileUpdate.housing_status = housingStatus;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Update account status if changed
      if (accountStatus !== user.account_status) {
        const { data, error: authError } = await supabase.functions.invoke('admin-user-operations', {
          body: {
            operation: 'update_status',
            userId: user.id,
            status: accountStatus,
          }
        });

        if (authError) throw authError;
        if (data?.error) throw new Error(data.error);
      }

      toast({
        title: "User updated",
        description: "User information has been successfully updated.",
      });

      onUserUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    setDeleteLoading(true);
    try {
      // Delete the user via admin edge function
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: {
          operation: 'delete_user',
          userId: user.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "User deleted",
        description: "User has been permanently deleted.",
      });

      onUserUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    setResetLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: user.email,
          redirectTo: `${window.location.origin}/auth?mode=reset-password`,
        }
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: `Password reset email has been sent to ${user.email}`,
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetMfa = async () => {
    if (!user) return;
    setResetMfaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-operations', {
        body: { operation: 'reset_mfa', userId: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'MFA reset',
        description: `${user.first_name} ${user.last_name} can now re-enroll in MFA on next login.`,
      });
    } catch (error: any) {
      console.error('Error resetting MFA:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset MFA.',
        variant: 'destructive',
      });
    } finally {
      setResetMfaLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="user_type">User Type</Label>
            <Select 
              value={formData.user_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, user_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="landlord">Landlord</SelectItem>
                <SelectItem value="individual_owner">Individual Owner</SelectItem>
                <SelectItem value="property_manager">Property Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.user_type === 'landlord' || formData.user_type === 'property_manager') && (
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
            />
          </div>

          <div>
            <Label>Email Address</Label>
            <div className="flex gap-2">
              <Input value={user.email} disabled className="flex-1" />
              <Button 
                variant="outline" 
                onClick={() => setIsChangeEmailDialogOpen(true)}
                type="button"
              >
                Change Email
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="account_status">Account Status</Label>
            <Select value={accountStatus} onValueChange={setAccountStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited (Pending Email Confirmation)</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {accountStatus === 'suspended' && 'User cannot access the platform'}
              {accountStatus === 'invited' && 'User has not confirmed their email'}
              {accountStatus === 'active' && 'User has full access'}
            </p>
          </div>

          {formData.user_type === 'tenant' && (
            <div>
              <Label htmlFor="housing_status">Housing Status</Label>
              <Select value={housingStatus} onValueChange={setHousingStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeking">Seeking Housing</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="housed">Housed</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t">
          {/* Primary Action */}
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>

          {/* Secondary Actions */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsChangePasswordDialogOpen(true)}
                className="flex-1"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Set Password
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="flex-1"
              >
                {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Send Reset Email
              </Button>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Reset MFA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset MFA for this user?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all multi-factor authentication factors for{' '}
                    <strong>{user.first_name} {user.last_name}</strong>. They'll be able to sign
                    in with just their password and will be prompted to re-enroll on next login
                    if their role still requires MFA. Use this for locked-out users only.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={resetMfaLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetMfa} disabled={resetMfaLoading}>
                    {resetMfaLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset MFA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {onViewProfile && (
              <Button 
                variant="outline"
                onClick={() => {
                  onClose();
                  onViewProfile();
                }}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            )}
          </div>

          {/* Danger Zone */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the user account
                  for {user.first_name} {user.last_name} and remove all their data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Change Email Dialog */}
        <ChangeEmailDialog
          isOpen={isChangeEmailDialogOpen}
          onClose={() => setIsChangeEmailDialogOpen(false)}
          userId={user.id}
          currentEmail={user.email}
          onEmailChanged={() => {
            setIsChangeEmailDialogOpen(false);
            onUserUpdated();
          }}
        />

        {/* Change Password Dialog */}
        <ChangePasswordDialog
          isOpen={isChangePasswordDialogOpen}
          onClose={() => setIsChangePasswordDialogOpen(false)}
          userId={user.id}
          userEmail={user.email}
          userName={`${user.first_name} ${user.last_name}`}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;