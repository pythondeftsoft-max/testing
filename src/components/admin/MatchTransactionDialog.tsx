import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  DollarSign,
  Building,
  User,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PlaidTransaction, useMatchTransaction } from '@/hooks/useAdminTransactions';
import { usePlacementFeesAnalytics } from '@/hooks/usePlacementFeesAnalytics';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface MatchTransactionDialogProps {
  transaction: PlaidTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlacementFee {
  id: string;
  landlord_id: string;
  property_id: string;
  tenant_id: string;
  fee_amount: number;
  due_date: string;
  payment_status: string;
}

export const MatchTransactionDialog = ({
  transaction,
  open,
  onOpenChange,
}: MatchTransactionDialogProps) => {
  const [pendingFees, setPendingFees] = useState<PlacementFee[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { mutate: matchTransaction, isPending } = useMatchTransaction();

  useEffect(() => {
    if (open) {
      fetchPendingFees();
    }
  }, [open, transaction]);

  const fetchPendingFees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landlord_placement_fees')
        .select(`
          id,
          landlord_id,
          property_id,
          tenant_id,
          fee_amount,
          due_date,
          payment_status
        `)
        .eq('payment_status', 'pending')
        .order('due_date', { ascending: false });

      if (error) throw error;

      // Filter and score based on amount similarity
      const feesWithScores = (data || []).map((fee: PlacementFee) => {
        const amountDiff = Math.abs(fee.fee_amount - transaction.amount);
        const amountMatch = amountDiff <= 1; // Within $1
        const score = amountMatch ? 100 : Math.max(0, 100 - (amountDiff / transaction.amount) * 100);
        return { ...fee, score, amountMatch };
      });

      // Sort by score
      feesWithScores.sort((a: any, b: any) => b.score - a.score);

      setPendingFees(feesWithScores as any);

      // Auto-select if there's an exact or very close match
      if (feesWithScores.length > 0 && (feesWithScores[0] as any).amountMatch) {
        setSelectedFeeId(feesWithScores[0].id);
      }
    } catch (error) {
      console.error('Error fetching pending fees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatch = () => {
    if (!selectedFeeId) return;
    
    matchTransaction(
      { transactionId: transaction.id, feeId: selectedFeeId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedFeeId(null);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Transaction to Placement Fee</DialogTitle>
          <DialogDescription>
            Select a pending placement fee to match with this bank transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="rounded-lg border p-4 bg-accent/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Transaction Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium mt-1">
                  {transaction.description || transaction.merchant_name || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-semibold text-lg mt-1 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {transaction.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                </p>
              </div>
              {transaction.category && (
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium mt-1">{transaction.category}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Pending Fees List */}
          <div>
            <h3 className="font-semibold mb-3">Select Matching Placement Fee</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading pending fees...
              </div>
            ) : pendingFees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending placement fees found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingFees.map((fee: any) => (
                  <button
                    key={fee.id}
                    onClick={() => setSelectedFeeId(fee.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedFeeId === fee.id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Fee ID: {fee.id.slice(0, 8)}</span>
                          {fee.amountMatch && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Exact Match
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="text-xs">Landlord ID:</span>
                            <p className="font-medium text-foreground">{fee.landlord_id.slice(0, 8)}</p>
                          </div>
                          <div>
                            <span className="text-xs">Tenant ID:</span>
                            <p className="font-medium text-foreground">{fee.tenant_id.slice(0, 8)}</p>
                          </div>
                          <div>
                            <span className="text-xs">Due Date:</span>
                            <p className="font-medium text-foreground">
                              {format(new Date(fee.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          ${fee.fee_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {Math.abs(fee.fee_amount - transaction.amount) < 0.01
                            ? 'Perfect match'
                            : `Diff: $${Math.abs(fee.fee_amount - transaction.amount).toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMatch}
              disabled={!selectedFeeId || isPending}
            >
              {isPending ? (
                'Matching...'
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Match & Mark as Paid
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
