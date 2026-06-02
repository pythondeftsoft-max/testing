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
import { ArrowRight } from 'lucide-react';

interface MoveBackOneStageConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityType: 'tenant' | 'property';
  currentStage: string;
  previousStage: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export const MoveBackOneStageConfirmDialog: React.FC<MoveBackOneStageConfirmDialogProps> = ({
  open,
  onOpenChange,
  entityName,
  entityType,
  currentStage,
  previousStage,
  onConfirm,
  isPending,
}) => {
  const stageLabels: Record<string, string> = {
    unassigned: 'Unassigned Queue',
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
          <AlertDialogTitle>Move back one stage?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will move <span className="font-semibold text-foreground">{entityName}</span> back to the previous pipeline stage:
            </p>
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="px-4 py-2 rounded-md bg-muted font-medium text-sm">
                {stageLabels[currentStage] || currentStage}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="px-4 py-2 rounded-md bg-primary/10 font-medium text-sm text-primary">
                {stageLabels[previousStage] || previousStage}
              </div>
            </div>
            <p className="text-warning font-medium text-sm">
              Some progress related to the current stage may be lost.
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
          >
            {isPending ? 'Moving back...' : 'Move Back'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
