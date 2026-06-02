import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminInProcessActions } from '@/hooks/useAdminInProcessActions';
import { MoveRight, Undo2 } from 'lucide-react';

interface AdminInProcessActionsProps {
  unitId: string;
  currentStage: string;
  onSuccess?: () => void;
}

export const AdminInProcessActions: React.FC<AdminInProcessActionsProps> = ({
  unitId,
  currentStage,
  onSuccess,
}) => {
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [pushReason, setPushReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { pushToInProcess, rejectFromInProcess } = useAdminInProcessActions();

  const handlePushConfirm = () => {
    pushToInProcess.mutate(
      { unitId, reason: pushReason },
      {
        onSuccess: () => {
          setShowPushDialog(false);
          setPushReason('');
          onSuccess?.();
        },
      }
    );
  };

  const handleRejectConfirm = () => {
    rejectFromInProcess.mutate(
      { unitId, reason: rejectReason },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectReason('');
          onSuccess?.();
        },
      }
    );
  };

  const canPush = currentStage !== 'in_process';
  const canReject = currentStage === 'in_process';

  return (
    <>
      <div className="flex gap-2">
        {canPush && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPushDialog(true)}
            className="flex items-center gap-1"
          >
            <MoveRight className="h-4 w-4" />
            Push to In Process
          </Button>
        )}
        
        {canReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            className="flex items-center gap-1"
          >
            <Undo2 className="h-4 w-4" />
            Return from In Process
          </Button>
        )}
      </div>

      {/* Push to In Process Dialog */}
      <AlertDialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push Unit to In Process</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the unit to "In Process" stage and pause the listing. 
              Provide a reason for this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for pushing to In Process..."
            value={pushReason}
            onChange={(e) => setPushReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePushConfirm}
              disabled={pushToInProcess.isPending || !pushReason.trim()}
            >
              {pushToInProcess.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject from In Process Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Unit from In Process</AlertDialogTitle>
            <AlertDialogDescription>
              This will return the unit to its previous stage and resume the listing. 
              Any Primary Applicant designation will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for returning from In Process..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectConfirm}
              disabled={rejectFromInProcess.isPending || !rejectReason.trim()}
            >
              {rejectFromInProcess.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
