import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Plus, Trash2, Star, RefreshCcw, MoreVertical, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useBankAccounts, BankAccount } from '@/hooks/useBankAccounts';
import { PlaidLinkAccounts } from './PlaidLinkAccounts';

export function PlaidSetupSection() {
  const { 
    accounts, 
    isLoading, 
    fetchAccounts,
    disconnectAccount, 
    setDefaultAccount 
  } = useBankAccounts();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePlaidSuccess = (data: any) => {
    setTimeout(() => {
      fetchAccounts();
    }, 500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAccounts();
    setIsRefreshing(false);
  };

  const handleDisconnectAccount = async (accountId: string) => {
    await disconnectAccount(accountId);
  };

  const handleSetDefault = async (accountId: string, type: 'payments' | 'payouts') => {
    await setDefaultAccount(accountId, type);
  };

  const getAccountDisplayName = (account: BankAccount) => {
    if (account.account_name) {
      return account.mask ? `${account.account_name} ••••${account.mask}` : account.account_name;
    }
    return account.mask ? `••••${account.mask}` : 'Unknown Account';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'linked':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20">Connected</Badge>;
      case 'linking...':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Linking...</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Sort accounts: defaults first, then by creation date
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aIsDefault = a.is_default_for_payments || a.is_default_for_payouts;
    const bIsDefault = b.is_default_for_payments || b.is_default_for_payouts;
    
    if (aIsDefault && !bIsDefault) return -1;
    if (!aIsDefault && bIsDefault) return 1;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const linkedAccounts = sortedAccounts.filter(acc => acc.status === 'linked');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Connections
            </CardTitle>
            <CardDescription className="mt-2">
              Securely connect your bank accounts through Plaid for receiving payouts and making payments.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {linkedAccounts.length > 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">
                  {linkedAccounts.length} {linkedAccounts.length === 1 ? 'Account' : 'Accounts'} Connected
                </span>
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">No Accounts Connected</span>
              </>
            )}
          </div>
          <PlaidLinkAccounts onSuccess={handlePlaidSuccess} />
        </div>

        {/* Connected Accounts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : linkedAccounts.length > 0 ? (
          <div className="space-y-3">
            <Separator />
            <h3 className="text-sm font-medium text-muted-foreground">Connected Accounts</h3>
            {linkedAccounts.map((account) => (
              <Card key={account.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getAccountDisplayName(account)}</span>
                        {getStatusBadge(account.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {account.is_default_for_payouts && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <Star className="h-3 w-3 mr-1" />
                            Default for Payouts
                          </Badge>
                        )}
                        {account.is_default_for_payments && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            <Star className="h-3 w-3 mr-1" />
                            Default for Payments
                          </Badge>
                        )}
                      </div>
                      
                      {account.institution_name && (
                        <p className="text-xs text-muted-foreground">
                          {account.institution_name}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!account.is_default_for_payouts && (
                          <DropdownMenuItem onClick={() => handleSetDefault(account.id, 'payouts')}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default for Payouts
                          </DropdownMenuItem>
                        )}
                        {!account.is_default_for_payments && (
                          <DropdownMenuItem onClick={() => handleSetDefault(account.id, 'payments')}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default for Payments
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              <span className="text-destructive">Disconnect</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Bank Account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will disconnect {getAccountDisplayName(account)} from your account. 
                                You can reconnect it later if needed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisconnectAccount(account.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No bank accounts connected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your bank account to receive payouts and make payments
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
