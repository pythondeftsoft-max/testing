import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePipelineActions } from '@/hooks/usePipelineActions';
import { DollarSign } from 'lucide-react';

interface MarkAsPaidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityName: string;
  entityType: 'tenant' | 'property';
}

export const MarkAsPaidDialog: React.FC<MarkAsPaidDialogProps> = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  entityType,
}) => {
  const [notes, setNotes] = useState('');
  const { markAsPaid } = usePipelineActions();

  const handleConfirm = async () => {
    await markAsPaid.mutateAsync({ 
      entityType,
      entityId, 
      paymentNotes: notes.trim() || undefined 
    });
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Confirm Placement Fee Payment
          </DialogTitle>
          <DialogDescription>
            Mark the placement fee as paid for {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              This action will:
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              {entityType === 'tenant' ? (
                <>
                  <li>Mark the tenant as "Housed & Paid"</li>
                  <li>Record that the placement fee has been received</li>
                  <li>Move the tenant to the final pipeline stage</li>
                </>
              ) : (
                <>
                  <li>Mark the property as "Paid"</li>
                  <li>Record that the placement fee has been received</li>
                  <li>Move the property to the final pipeline stage</li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              placeholder="Add any notes about the payment (e.g., payment method, transaction ID, date received...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={markAsPaid.isPending}
          >
            {markAsPaid.isPending ? 'Processing...' : 'Confirm Payment Received'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
