import React from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Users, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteUserConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  userName: string;
  userEmail: string;
  userRole: string;
}

const roleConfigs = {
  owner: {
    label: 'Owner',
    icon: Crown,
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  admin_partner: {
    label: 'Admin Partner',
    icon: Shield,
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  support_assistant: {
    label: 'Support Assistant',
    icon: Users,
    badgeColor: 'bg-slate-100 text-slate-800',
  },
};

export const DeleteUserConfirmation: React.FC<DeleteUserConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  userName,
  userEmail,
  userRole,
}) => {
  const config = roleConfigs[userRole as keyof typeof roleConfigs];
  const Icon = config?.icon || Users;
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Remove User Access
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                This action will immediately remove the user's access to this account. They will no longer be able to sign in or perform any actions.
              </p>
              
              {/* User Information Card */}
              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {userInitials || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{userName}</div>
                    <div className="text-sm text-muted-foreground">{userEmail}</div>
                    {config && (
                      <div className="mt-1">
                        <Badge className={config.badgeColor}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong className="text-destructive">Warning:</strong> This action cannot be undone. The user will lose all access immediately.
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <AlertDialogCancel 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove User'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};