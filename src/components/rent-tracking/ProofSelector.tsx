import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserBankAccounts } from '@/hooks/useUserBankAccounts';
import { PlaidLinkAccounts } from '@/components/PlaidLinkAccounts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, CheckCircle2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlaidTransaction {
  transaction_id: string;
  date: string;
  name: string;
  merchant_name?: string;
  amount: number;
  account_name?: string;
}

interface ProofSelectorProps {
  monthlyRent: number;
  selectedTransaction: PlaidTransaction | null;
  onSelect: (tx: PlaidTransaction | null) => void;
  onPlaidOpen?: () => void;
  onPlaidClose?: () => void;
  hideInfoCard?: boolean;
}

const ProofSelector = ({ monthlyRent, selectedTransaction, onSelect, onPlaidOpen, onPlaidClose, hideInfoCard = false }: ProofSelectorProps) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useUserBankAccounts();

  const hasLinkedAccount = accounts.length > 0;

  // Read from local tenant_plaid_transactions table — fast, no live Plaid call
  const { data: transactions = [], isLoading: txLoading, error: txError, refetch: refetchTx } = useQuery({
    queryKey: ['tenant-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('tenant_plaid_transactions')
        .select('plaid_transaction_id, transaction_date, description, merchant_name, amount, bank_account_id')
        .eq('user_id', user.id)
        .eq('pending', false)
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Get account names
      const bankAccountIds = [...new Set((data || []).map((t: any) => t.bank_account_id))];
      let accountMap: Record<string, string> = {};

      if (bankAccountIds.length > 0) {
        const { data: accs } = await supabase
          .from('user_bank_accounts')
          .select('id, account_name, institution_name')
          .in('id', bankAccountIds);
        if (accs) {
          for (const acc of accs) {
            accountMap[acc.id] = acc.account_name || acc.institution_name || 'Bank';
          }
        }
      }

      return (data || []).map((t: any) => ({
        transaction_id: t.plaid_transaction_id,
        date: t.transaction_date,
        name: t.description,
        merchant_name: t.merchant_name || undefined,
        amount: Number(t.amount),
        account_name: accountMap[t.bank_account_id] || 'Bank',
      })) as PlaidTransaction[];
    },
    enabled: hasLinkedAccount,
    staleTime: 60000,
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('plaid-payment-methods', {
        body: { action: 'sync_tenant_transactions' },
      });
      await refetchTx();
      queryClient.invalidateQueries({ queryKey: ['tenant-transactions'] });
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = transactions.filter(tx =>
    (tx.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (tx.merchant_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Checking linked accounts…
      </div>
    );
  }

  if (!hasLinkedAccount) {
    return (
      <div className="space-y-3">
        {!hideInfoCard && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium mb-1">Linking your bank account lets you:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Automatically track future rent payments</li>
                  <li>Tag past payments — up to 24 months back</li>
                  <li>For payments older than 2 years, use <strong>Upload File</strong> instead</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="text-center py-2">
          <PlaidLinkAccounts onSuccess={() => { refetchAccounts(); refetchTx(); }} onPlaidOpen={onPlaidOpen} onPlaidClose={onPlaidClose} />
        </div>
      </div>
    );
  }

  if (txLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading transactions…
      </div>
    );
  }

  if (txError) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Could not load transactions. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-8 px-2 shrink-0"
          title="Sync latest transactions"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No transactions found. Try syncing or search a different term.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
          {filtered.map(tx => {
            const isSelected = selectedTransaction?.transaction_id === tx.transaction_id;
            const isMatch = Math.abs(tx.amount - monthlyRent) <= 1;
            return (
              <button
                key={tx.transaction_id}
                type="button"
                onClick={() => onSelect(isSelected ? null : tx)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors border text-left',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tx.merchant_name || tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}{tx.account_name ? ` · ${tx.account_name}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-sm font-semibold', isMatch ? 'text-[hsl(var(--chart-2))]' : 'text-foreground')}>
                    ${tx.amount.toFixed(2)}
                  </span>
                  {isMatch && (
                    <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                      Match
                    </span>
                  )}
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-1.5 pt-1 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Future payments are tracked automatically once your bank is connected.
          History goes back up to 24 months — for older payments, use the <strong>Upload File</strong> tab.
        </span>
      </div>
    </div>
  );
};

export default ProofSelector;
