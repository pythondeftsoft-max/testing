import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLinkBankTransaction } from '@/hooks/useLinkBankTransaction';
import { Loader2 } from 'lucide-react';

interface LandlordPlacementFee {
  id: string;
  fee_amount: number;
  landlord_name: string;
  property_address: string;
  unit_number?: string;
}

interface LinkBankTransactionDialogProps {
  fee: LandlordPlacementFee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkBankTransactionDialog = ({ fee, open, onOpenChange }: LinkBankTransactionDialogProps) => {
  const [transactionReference, setTransactionReference] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const { mutate: linkTransaction, isPending } = useLinkBankTransaction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fee) return;

    linkTransaction({
      feeId: fee.id,
      transactionReference,
      transactionDate,
      transactionAmount: parseFloat(transactionAmount),
      bankName,
      notes,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setTransactionReference('');
    setTransactionDate('');
    setTransactionAmount('');
    setBankName('');
    setNotes('');
  };

  if (!fee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Bank Transaction</DialogTitle>
          <DialogDescription>
            Link a bank transaction to this ${fee.fee_amount.toLocaleString()} placement fee for {fee.landlord_name}
            {fee.property_address && ` - ${fee.property_address}`}
            {fee.unit_number && ` Unit ${fee.unit_number}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transactionReference">Transaction Reference *</Label>
            <Input
              id="transactionReference"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g., TXN123456, Wire Confirmation #"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionDate">Transaction Date *</Label>
            <Input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionAmount">Transaction Amount *</Label>
            <Input
              id="transactionAmount"
              type="number"
              step="0.01"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              placeholder={fee.fee_amount.toString()}
              required
            />
            {transactionAmount && parseFloat(transactionAmount) !== fee.fee_amount && (
              <p className="text-sm text-amber-600">
                Note: Amount differs from fee amount (${fee.fee_amount})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., Chase, Wells Fargo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this transaction..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link & Mark as Paid
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
