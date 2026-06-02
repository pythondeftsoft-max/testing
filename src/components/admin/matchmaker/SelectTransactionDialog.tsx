import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PlaidTransaction {
  id: string;
  amount: number;
  description: string;
  merchant_name: string | null;
  transaction_date: string;
  category: string | null;
  pending: boolean;
}

interface SelectTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (transactionId: string) => void;
  transactions: PlaidTransaction[];
  selectedTransactionId: string;
  isLoading: boolean;
  feeAmount: number;
}

export const SelectTransactionDialog = ({
  isOpen,
  onClose,
  onSelect,
  transactions,
  selectedTransactionId,
  isLoading,
  feeAmount,
}: SelectTransactionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedId, setTempSelectedId] = useState(selectedTransactionId);

  const filteredTransactions = transactions.filter((transaction) => {
    const searchLower = searchQuery.toLowerCase();
    const merchantMatch = transaction.merchant_name?.toLowerCase().includes(searchLower);
    const descriptionMatch = transaction.description?.toLowerCase().includes(searchLower);
    return merchantMatch || descriptionMatch;
  });

  const handleConfirm = () => {
    if (tempSelectedId) {
      onSelect(tempSelectedId);
    }
    onClose();
  };

  const handleClose = () => {
    setTempSelectedId(selectedTransactionId); // Reset to original selection
    setSearchQuery('');
    onClose();
  };

  const isAmountMatch = (amount: number) => {
    return Math.abs(Math.abs(amount) - feeAmount) < 0.01;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Plaid Transaction</DialogTitle>
          <DialogDescription>
            Choose the transaction that corresponds to this ${feeAmount.toLocaleString()} placement fee payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Transaction List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No transactions match your search' : 'No unmatched transactions found'}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pr-4">
                {filteredTransactions.map((transaction) => {
                  const isSelected = tempSelectedId === transaction.id;
                  const amountMatches = isAmountMatch(transaction.amount);

                  return (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() => setTempSelectedId(transaction.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        "hover:border-primary/50 hover:bg-muted/50",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-base">
                              {transaction.merchant_name || transaction.description || 'Unknown Transaction'}
                            </p>
                            {transaction.pending && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">
                                Pending
                              </span>
                            )}
                            {amountMatches && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                                Amount Match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                            {transaction.category && (
                              <>
                                <span>•</span>
                                <span>{transaction.category}</span>
                              </>
                            )}
                          </div>
                          {transaction.description && transaction.merchant_name !== transaction.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={cn(
                            "text-lg font-bold whitespace-nowrap",
                            amountMatches && "text-green-600 dark:text-green-400"
                          )}>
                            ${Math.abs(transaction.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!tempSelectedId}
          >
            Select Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
