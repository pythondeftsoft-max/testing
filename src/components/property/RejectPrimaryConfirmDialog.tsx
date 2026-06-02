import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectPrimaryConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  applicantName: string;
  isPending: boolean;
}

export const RejectPrimaryConfirmDialog: React.FC<RejectPrimaryConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  applicantName,
  isPending,
}) => {
  const [reason, setReason] = useState('Not a fit');

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Primary Applicant</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Rejecting <strong>{applicantName}</strong> as Primary will:
            </p>
            
            <ul className="list-disc pl-6 space-y-1">
              <li>Close the chat permanently</li>
              <li>Notify them of the decision</li>
              <li>Reopen the listing for new applications</li>
            </ul>

            <div className="pt-2 space-y-2">
              <Label htmlFor="reject-reason">Reason (will be sent to applicant):</Label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Not a fit, Found another applicant, etc."
                className="min-h-[80px]"
              />
            </div>

            <p className="text-destructive font-medium pt-2">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? 'Rejecting...' : 'Reject Primary'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};