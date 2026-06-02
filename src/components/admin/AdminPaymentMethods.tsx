import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Info, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { PlaidLinkAccounts } from '@/components/PlaidLinkAccounts';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';
import { useSyncTransactions } from '@/hooks/useAdminTransactions';
import { StripeConfigCard } from './StripeConfigCard';

export const AdminPaymentMethods = () => {
  const { data: isSuperAdmin, isLoading: isCheckingAdmin } = useSuperAdminCheck();
  const { accounts, isLoading, disconnectAccount, setDefaultAccount } = useBankAccounts();
  const { mutate: syncTransactions } = useSyncTransactions();
  const [accountToDisconnect, setAccountToDisconnect] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Verifying permissions...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Access Denied</CardTitle>
          <CardDescription>
            Only Super Admins can manage platform payment methods.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleDisconnectConfirm = async () => {
    if (!accountToDisconnect) return;
    await disconnectAccount(accountToDisconnect);
    setAccountToDisconnect(null);
  };

  const handleSyncTransactions = async (accountId: string) => {
    setSyncingAccountId(accountId);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    syncTransactions(
      {
        bankAccountId: accountId,
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      },
      {
        onSettled: () => {
          setSyncingAccountId(null);
        },
      }
    );
  };

  return (
    <>
      <Tabs defaultValue="plaid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="plaid">Plaid Accounts</TabsTrigger>
          <TabsTrigger value="stripe">Stripe Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="plaid">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Platform Bank Accounts
              </CardTitle>
              <CardDescription>
                Manage bank accounts for receiving placement fees and sending worker payouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Connect your business bank account to receive placement fees from landlords and send payouts to workers.
                  Only Super Admins can view and manage these accounts.
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading accounts...</div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Bank Accounts Connected</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your first bank account to start receiving payments and sending payouts
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <Card key={account.id} className="border-muted">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-blue-gold flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{account.institution_name || 'Bank Account'}</p>
                                {account.status === 'active' && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-muted-foreground">
                                  {account.account_type} {account.mask ? `••••${account.mask}` : ''}
                                </p>
                                {account.is_default_for_payments && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default for Payments
                                  </Badge>
                                )}
                                {account.is_default_for_payouts && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default for Payouts
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setDefaultAccount(account.id, 'payments')}
                                disabled={account.is_default_for_payments}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Set as Default for Payments
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDefaultAccount(account.id, 'payouts')}
                                disabled={account.is_default_for_payouts}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Set as Default for Payouts
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSyncTransactions(account.id)}
                                disabled={syncingAccountId === account.id}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncingAccountId === account.id ? 'animate-spin' : ''}`} />
                                {syncingAccountId === account.id ? 'Syncing...' : 'Sync Transactions from Plaid'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAccountToDisconnect(account.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <PlaidLinkAccounts />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe">
          <StripeConfigCard />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!accountToDisconnect} onOpenChange={(open) => !open && setAccountToDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bank account from the platform. This action cannot be undone.
              You can reconnect the account later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
