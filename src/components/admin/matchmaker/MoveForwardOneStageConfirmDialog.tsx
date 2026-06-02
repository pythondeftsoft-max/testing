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

interface MoveForwardOneStageConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityType: 'tenant' | 'property';
  currentStage: string;
  nextStage: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export const MoveForwardOneStageConfirmDialog: React.FC<MoveForwardOneStageConfirmDialogProps> = ({
  open,
  onOpenChange,
  entityName,
  entityType,
  currentStage,
  nextStage,
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
          <AlertDialogTitle>Move forward one stage?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will move <span className="font-semibold text-foreground">{entityName}</span> forward to the next pipeline stage:
            </p>
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="px-4 py-2 rounded-md bg-muted font-medium text-sm">
                {stageLabels[currentStage] || currentStage}
              </div>
              <ArrowRight className="h-4 w-4 text-success" />
              <div className="px-4 py-2 rounded-md bg-success/10 font-medium text-sm text-success">
                {stageLabels[nextStage] || nextStage}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will advance the {entityType} to the next stage in the pipeline.
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
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {isPending ? 'Moving forward...' : 'Move Forward'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
