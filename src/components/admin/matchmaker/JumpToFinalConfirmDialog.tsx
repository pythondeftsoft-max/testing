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
import { ChevronsRight } from 'lucide-react';

interface JumpToFinalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityType: 'tenant' | 'property';
  currentStage: string;
  finalStage: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export const JumpToFinalConfirmDialog: React.FC<JumpToFinalConfirmDialogProps> = ({
  open,
  onOpenChange,
  entityName,
  entityType,
  currentStage,
  finalStage,
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
          <AlertDialogTitle>Jump to final stage?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will jump <span className="font-semibold text-foreground">{entityName}</span> directly to the final pipeline stage:
            </p>
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="px-4 py-2 rounded-md bg-muted font-medium text-sm">
                {stageLabels[currentStage] || currentStage}
              </div>
              <ChevronsRight className="h-5 w-5 text-success" />
              <div className="px-4 py-2 rounded-md bg-success/10 font-medium text-sm text-success">
                {stageLabels[finalStage] || finalStage}
              </div>
            </div>
            <p className="text-warning font-medium text-sm">
              ⚠️ This will skip all intermediate stages. {entityType === 'tenant' ? 'The tenant will be marked as housed and paid.' : 'The property will be marked as paid.'}
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
            {isPending ? 'Jumping to final...' : 'Jump to Final'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
