import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Link as LinkIcon, 
  Calendar, 
  DollarSign, 
  Building2,
  Loader2
} from 'lucide-react';
import { useUnmatchedTransactions, useSyncTransactions, PlaidTransaction } from '@/hooks/useAdminTransactions';
import { useLandlordBankAccounts } from '@/hooks/useLandlordBankAccounts';
import { MatchTransactionDialog } from './MatchTransactionDialog';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnmatchedTransactionsPanelProps {
  landlordId: string;
}

export const UnmatchedTransactionsPanel = ({ landlordId }: UnmatchedTransactionsPanelProps) => {
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<PlaidTransaction | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  const { accounts } = useLandlordBankAccounts(landlordId);
  const { data: transactions, isLoading } = useUnmatchedTransactions(
    selectedBankAccount === 'all' ? undefined : selectedBankAccount
  );
  const { mutate: syncTransactions, isPending: isSyncing } = useSyncTransactions();

  const handleSync = () => {
    const accountId = selectedBankAccount !== 'all' 
      ? selectedBankAccount 
      : accounts?.[0]?.id;

    if (!accountId) {
      toast({
        title: "Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }

    syncTransactions(
      { bankAccountId: accountId },
      {
        onSuccess: (data) => {
          toast({
            title: "Success",
            description: `Synced ${data.unmatched_transactions?.length || 0} unmatched transactions`,
          });
        },
        onError: (error: any) => {
          // Check for the reconnection required error
          const errorData = error?.context?.body;
          if (errorData?.requires_reconnection) {
            toast({
              title: "Reconnection Required",
              description: errorData.error || "This bank account needs to be reconnected through Plaid.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error?.message || "Failed to sync transactions",
              variant: "destructive",
            });
          }
        }
      }
    );
  };

  const handleMatchClick = (transaction: PlaidTransaction) => {
    setSelectedTransaction(transaction);
    setMatchDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Unmatched Bank Transactions
              </CardTitle>
              <CardDescription>
                Match incoming transactions to placement fees
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name || account.institution_name || 'Bank Account'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing || !selectedBankAccount || accounts?.length === 0}
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync from Plaid
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No unmatched transactions found</p>
              <p className="text-sm mt-2">
                {accounts?.length === 0 
                  ? 'Connect a bank account to see transactions' 
                  : 'Click "Sync from Plaid" to fetch new transactions'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {transaction.description || transaction.merchant_name || 'Unknown'}
                      </p>
                      {transaction.pending && (
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                      </span>
                      {transaction.category && (
                        <span className="text-xs">
                          {transaction.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-semibold text-lg">
                        <DollarSign className="h-4 w-4" />
                        {transaction.amount.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleMatchClick(transaction)}
                      variant="outline"
                      size="sm"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Match to Fee
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTransaction && (
        <MatchTransactionDialog
          transaction={selectedTransaction}
          open={matchDialogOpen}
          onOpenChange={setMatchDialogOpen}
        />
      )}
    </>
  );
};
