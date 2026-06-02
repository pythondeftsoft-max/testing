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
import { Undo2 } from 'lucide-react';

interface UnsendPushConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  propertyAddress?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export const UnsendPushConfirmDialog: React.FC<UnsendPushConfirmDialogProps> = ({
  open,
  onOpenChange,
  tenantName,
  propertyAddress,
  onConfirm,
  isPending = false,
}) => {
  // Aggressive reset for Radix UI bug #3645 - orphaned pointer-events: none
  React.useEffect(() => {
    if (!open) {
      const interval = setInterval(() => {
        document.body.style.pointerEvents = 'auto';
      }, 50);
      const timeout = setTimeout(() => clearInterval(interval), 500);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.body.style.pointerEvents = 'auto';
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-warning" />
            Unsend Property Push
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to unsend this property push to <strong>{tenantName}</strong>?
            </p>
            {propertyAddress && (
              <p className="text-muted-foreground text-sm">
                Property: {propertyAddress}
              </p>
            )}
            <p className="text-muted-foreground">
              This will cancel the match and allow the property to be pushed to another tenant.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isPending ? 'Unsending...' : 'Unsend Push'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsendPushConfirmDialog;
