import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateTransactionDisplayName } from '@/hooks/useLandlordPlaidTransactions';

interface EditTransactionDisplayNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  currentDisplayName: string | null;
  originalDescription: string | null;
}

export const EditTransactionDisplayNameModal = ({
  open,
  onOpenChange,
  transactionId,
  currentDisplayName,
  originalDescription,
}: EditTransactionDisplayNameModalProps) => {
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const updateMutation = useUpdateTransactionDisplayName();

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      transactionId,
      displayName: displayName.trim() || null,
    });
    onOpenChange(false);
  };

  const handleReset = async () => {
    setDisplayName('');
    await updateMutation.mutateAsync({
      transactionId,
      displayName: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Payment Name</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Original Name (from bank)</Label>
            <p className="text-sm bg-muted p-2 rounded">{originalDescription || 'Unknown'}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Custom Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a custom name..."
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown instead of the original bank description.
              Auto-tag rules will still match using the original name.
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!currentDisplayName && !displayName}
          >
            Reset to Original
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
