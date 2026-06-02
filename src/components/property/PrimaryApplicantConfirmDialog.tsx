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

interface PrimaryApplicantConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentPrimaryName?: string;
  newApplicantName: string;
  isPending: boolean;
}

export const PrimaryApplicantConfirmDialog: React.FC<PrimaryApplicantConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  currentPrimaryName,
  newApplicantName,
  isPending,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={!isPending ? onOpenChange : undefined}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {currentPrimaryName ? 'Replace Primary Applicant?' : 'Set as Primary Applicant?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Setting <strong>{newApplicantName}</strong> as Primary {currentPrimaryName ? 'will' : 'Applicant will'}:
              </p>
              
              <ul className="list-disc pl-6 space-y-1">
                {currentPrimaryName && (
                  <li>Reject <strong>{currentPrimaryName}</strong> and notify them</li>
                )}
                {!currentPrimaryName && (
                  <li>Pause the listing (no new applications)</li>
                )}
                <li>Enable unlimited messaging with {newApplicantName}</li>
                <li>Unlock full contact info and documents</li>
              </ul>

              {currentPrimaryName && (
                <p className="text-destructive font-medium pt-2">
                  This action cannot be undone. The previous Primary will lose access to messaging.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isPending}
            className="min-w-[140px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Setting Primary...
              </span>
            ) : (
              'Set as Primary'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};