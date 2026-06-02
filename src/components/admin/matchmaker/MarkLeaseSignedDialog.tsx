import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAdminMarkLeaseSigned } from '@/hooks/useAdminMarkLeaseSigned';
import { AlertTriangle } from 'lucide-react';

interface MarkLeaseSignedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  propertyAddress: string;
  tenantName: string;
}

export const MarkLeaseSignedDialog: React.FC<MarkLeaseSignedDialogProps> = ({
  open,
  onOpenChange,
  unitId,
  propertyAddress,
  tenantName,
}) => {
  const { mutate: markLeaseSigned, isPending } = useAdminMarkLeaseSigned();

  const handleMarkSigned = (sendStripe: boolean) => {
    if (!unitId) return;
    
    markLeaseSigned(
      { unitId, sendStripe },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Lease as Signed</DialogTitle>
          <DialogDescription>
            This will move the property to "Lease Signed" stage and trigger payment collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="font-semibold">Property:</span> {propertyAddress}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Tenant:</span> {tenantName}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              This action will change the property status to "off_market" and move the tenant 
              to "lease_signed" stage. The unit will no longer appear in public listings.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleMarkSigned(false)}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : 'Mark Manually Signed'}
          </Button>
          <Button
            onClick={() => handleMarkSigned(true)}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : 'Send Stripe Payment Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
