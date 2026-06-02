import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, DollarSign, Users, Send, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SendConfirmationDetails {
  totalAmount: number;
  itemCount: number;
  rail: string; // e.g. "Checkbook (ACH)"
  estimatedFees?: number;
  availableBalance?: number | null;
  /** Threshold above which type-to-confirm is required. Default $5,000. */
  highValueThreshold?: number;
}

interface SendConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: SendConfirmationDetails;
  onConfirm: () => void;
  isSending?: boolean;
}

/**
 * Last line of defense before money leaves the account.
 * - Always shows totals, item count, rail, fees, balance
 * - For high-value batches (default >$5,000) requires the user to type the
 *   exact dollar amount to enable the Send button — prevents fat-finger sends.
 */
export const SendConfirmationModal = ({
  open,
  onOpenChange,
  details,
  onConfirm,
  isSending = false,
}: SendConfirmationModalProps) => {
  const {
    totalAmount,
    itemCount,
    rail,
    estimatedFees = 0,
    availableBalance = null,
    highValueThreshold = 5000,
  } = details;

  const requiresTypeToConfirm = totalAmount >= highValueThreshold;
  const expectedConfirmation = totalAmount.toFixed(2);

  const [typedAmount, setTypedAmount] = useState('');

  useEffect(() => {
    if (open) setTypedAmount('');
  }, [open]);

  const typedMatches = typedAmount.trim() === expectedConfirmation;
  const canSend = !isSending && (!requiresTypeToConfirm || typedMatches);

  const totalWithFees = totalAmount + estimatedFees;
  const insufficientFunds =
    availableBalance !== null && availableBalance < totalWithFees;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirm Payout Batch
          </AlertDialogTitle>
          <AlertDialogDescription>
            Once sent, funds leave your connected account immediately. Review
            the details below before confirming.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total amount
            </span>
            <span className="text-lg font-bold tabular-nums">
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Recipients
            </span>
            <span className="font-medium tabular-nums">{itemCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Send className="h-4 w-4" />
              Source rail
            </span>
            <Badge variant="secondary">{rail}</Badge>
          </div>

          {estimatedFees > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated processor fees</span>
              <span className="tabular-nums">
                ~${estimatedFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {availableBalance !== null && (
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Available balance
              </span>
              <span
                className={`tabular-nums font-medium ${
                  insufficientFunds ? 'text-destructive' : 'text-foreground'
                }`}
              >
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {insufficientFunds && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Available balance is below the batch total + estimated fees. The
              processor may reject some payments. Top up the account before
              sending.
            </AlertDescription>
          </Alert>
        )}

        {requiresTypeToConfirm && (
          <div className="space-y-2">
            <Label htmlFor="confirm-amount" className="text-sm">
              This batch is over ${highValueThreshold.toLocaleString()}. Type the
              total amount{' '}
              <span className="font-mono font-semibold">${expectedConfirmation}</span>{' '}
              to confirm:
            </Label>
            <Input
              id="confirm-amount"
              value={typedAmount}
              onChange={(e) => setTypedAmount(e.target.value)}
              placeholder={expectedConfirmation}
              autoComplete="off"
              inputMode="decimal"
              className={typedMatches ? 'border-success' : ''}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (canSend) onConfirm();
            }}
            disabled={!canSend}
            className="bg-primary"
          >
            {isSending ? 'Sending…' : `Send $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
