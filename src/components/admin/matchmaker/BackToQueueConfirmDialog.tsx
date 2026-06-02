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

interface BackToQueueConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityType: 'tenant' | 'property';
  currentStage: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export const BackToQueueConfirmDialog: React.FC<BackToQueueConfirmDialogProps> = ({
  open,
  onOpenChange,
  entityName,
  entityType,
  currentStage,
  onConfirm,
  isPending,
}) => {
  const stageLabels: Record<string, string> = {
    assigned: 'Assigned',
    lease_signed: 'Lease Signed / Approved',
    moved_in_awaiting_payment: 'Moved In - Awaiting Payment',
    paid_housed: 'Paid / Housed',
    available: 'Available',
    filled_awaiting_payment: 'Filled & Awaiting Payment',
    paid: 'Paid',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send back to queue?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will completely reset <span className="font-semibold text-foreground">{entityName}</span> from{' '}
              <span className="font-semibold text-foreground">{stageLabels[currentStage] || currentStage}</span> back to the{' '}
              <span className="font-semibold text-foreground">Unassigned Queue</span>.
            </p>
            <p className="text-destructive font-medium">
              All progress will be lost and the {entityType} will need to be reassigned.
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
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Sending back...' : 'Send to Queue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
