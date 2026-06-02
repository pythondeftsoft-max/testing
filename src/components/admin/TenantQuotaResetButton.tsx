import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAdminResetQuota } from '@/hooks/useAdminResetQuota';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TenantQuotaResetButtonProps {
  tenantId: string;
  tenantName?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export const TenantQuotaResetButton = ({ 
  tenantId, 
  tenantName = 'this tenant',
  size = 'sm',
  variant = 'outline'
}: TenantQuotaResetButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { resetQuota, isLoading } = useAdminResetQuota();

  const handleReset = () => {
    resetQuota.mutate(
      { tenantId, reason: `Manual reset for ${tenantName}` },
      { onSuccess: () => setIsOpen(false) }
    );
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <RefreshCw className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
          Reset Credits
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Application Credits?</AlertDialogTitle>
          <AlertDialogDescription>
            This will refresh the application credits for <strong>{tenantName}</strong>, 
            giving them 5 new applications for the next 7 days. They will receive an 
            in-app notification about this reset.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Resetting...' : 'Reset Credits'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};