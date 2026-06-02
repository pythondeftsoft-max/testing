import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useUserBankAccounts } from '@/hooks/useUserBankAccounts';
import { useAvailableDeposits, useTagPropertyPayment } from '@/hooks/usePaymentTaggingData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TrackPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordId: string;
  portfolioId?: string;
}

export const TrackPaymentModal = ({ open, onOpenChange, landlordId, portfolioId }: TrackPaymentModalProps) => {
  const queryClient = useQueryClient();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bankAccounts, isLoading: loadingAccounts } = useUserBankAccounts();
  const { data: depositsData, isLoading: loadingDeposits } = useAvailableDeposits();
  const tagPayment = useTagPropertyPayment();

  // Filter deposits by selected bank account and exclude already-tracked deposits
  const filteredDeposits = (depositsData?.deposits || []).filter((d) => {
    // Exclude already tracked deposits (they have is_tagged=true and tag_type='tracked')
    if (d.is_tagged && d.tag_type === 'tracked') {
      return false;
    }
    // Filter by bank account if selected
    return !selectedBankAccountId || selectedBankAccountId === 'all' || d.bank_account?.id === selectedBankAccountId;
  });

  // Reset selections when bank account changes
  useEffect(() => {
    setSelectedDepositIds([]);
  }, [selectedBankAccountId]);

  // Toggle individual deposit selection
  const toggleDeposit = (depositId: string) => {
    setSelectedDepositIds(prev =>
      prev.includes(depositId)
        ? prev.filter(id => id !== depositId)
        : [...prev, depositId]
    );
  };

  // Toggle all deposits
  const toggleAll = () => {
    if (selectedDepositIds.length === filteredDeposits.length) {
      setSelectedDepositIds([]);
    } else {
      setSelectedDepositIds(filteredDeposits.map(d => d.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedDepositIds.length === 0) {
      toast.error('Please select at least one deposit');
      return;
    }

    setIsSubmitting(true);
    try {
      // Mark selected deposits as tracked
      for (const depositId of selectedDepositIds) {
        await tagPayment.mutateAsync({
          transactionId: depositId,
          markAsTracked: true,
        });
      }

      toast.success(`${selectedDepositIds.length} payment(s) tracked successfully`);
      
      // Reset selections
      setSelectedDepositIds([]);
      
      // Close modal
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const selectedTotal = filteredDeposits
    .filter(d => selectedDepositIds.includes(d.id))
    .reduce((sum, d) => sum + d.available_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Track New Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Step 1: Bank Account */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Select Bank Account</Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bank account..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.institution_name} - {account.account_name}
                    {account.mask && ` (****${account.mask})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Deposits (Multi-Select) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">2. Select Deposits to Track</Label>
              {filteredDeposits.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckSquare className="h-3 w-3" />
                  {selectedDepositIds.length === filteredDeposits.length ? 'Deselect All' : `Select All (${filteredDeposits.length})`}
                </button>
              )}
            </div>
            
            {loadingDeposits ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                No untagged deposits available. Sync your bank to fetch new transactions.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredDeposits.map((deposit) => {
                  const isSelected = selectedDepositIds.includes(deposit.id);
                  return (
                    <div
                      key={deposit.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleDeposit(deposit.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDeposit(deposit.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {deposit.display_name || deposit.description || 'Unknown deposit'}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(deposit.available_amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(deposit.transaction_date), 'MMM d, yyyy')}
                          </span>
                          {deposit.bank_account && (
                            <Badge variant="outline" className="text-xs">
                              {deposit.bank_account.institution_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection summary */}
          {selectedDepositIds.length > 0 && (
            <div className="text-sm text-muted-foreground text-right">
              {selectedDepositIds.length} deposit(s) selected • Total: <span className="font-semibold text-foreground">{formatCurrency(selectedTotal)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedDepositIds.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Track {selectedDepositIds.length > 0 ? `${selectedDepositIds.length} Payment${selectedDepositIds.length > 1 ? 's' : ''}` : 'Payments'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
