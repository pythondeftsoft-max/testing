import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Trash2, Star, RefreshCcw, MoreVertical, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBankAccounts, BankAccount } from '@/hooks/useBankAccounts';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { PlaidLinkAccounts } from './PlaidLinkAccounts';
import { PropertyPaymentSettingsPanel } from './PropertyPaymentSettingsPanel';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';

interface PaymentMethodsTabProps {
  userId: string;
  userType: 'landlord' | 'tenant';
  selectedPortfolio: string;
  properties?: Array<{
    id: string;
    address: string;
    monthly_rent: number;
  }>;
}

export function PaymentMethodsTab({ userId, userType, selectedPortfolio, properties = [] }: PaymentMethodsTabProps) {
  const { 
    accounts, 
    isLoading, 
    fetchAccounts,
    disconnectAccount, 
    setDefaultAccount 
  } = useBankAccounts();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePlaidSuccess = (data: any) => {
    // The PlaidLinkAccounts component handles the token exchange internally
    // We just need to refresh our accounts list after successful connection
    setTimeout(() => {
      // Refresh accounts after a short delay to allow the edge function to complete
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
    // Default accounts first
    const aIsDefault = a.is_default_for_payments || a.is_default_for_payouts;
    const bIsDefault = b.is_default_for_payments || b.is_default_for_payouts;
    
    if (aIsDefault && !bIsDefault) return -1;
    if (!aIsDefault && bIsDefault) return 1;
    
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (userType === 'tenant') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Manage your payment methods for rent payments and autopay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodsManager />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout for Stripe + Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe Payment Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Payment Processing
            </CardTitle>
            <CardDescription>
              Accept rent payments from tenants. Stripe handles processing and deposits funds to your bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeConnectOnboarding />
          </CardContent>
        </Card>

        {/* Bank Account Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Connections
            </CardTitle>
            <CardDescription>
              Connect accounts via Plaid for payouts and vendor payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Account */}
            <div className="flex items-center justify-between p-3 border-2 border-dashed rounded-lg">
              <div>
                <h4 className="font-medium text-sm">Connect Bank Account</h4>
                <p className="text-xs text-muted-foreground">Securely link via Plaid</p>
              </div>
              <PlaidLinkAccounts
                onSuccess={handlePlaidSuccess}
                onExit={(error) => {
                  if (error) console.error('Plaid error:', error);
                }}
              />
            </div>

            {/* Connected Accounts List */}
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No accounts connected</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {sortedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{getAccountDisplayName(account)}</span>
                        {(account.is_default_for_payments || account.is_default_for_payouts) && (
                          <Star className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {account.institution_name || 'Unknown Bank'}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {getStatusBadge(account.status)}
                        {account.is_default_for_payments && (
                          <Badge variant="outline" className="text-xs">Payments</Badge>
                        )}
                        {account.is_default_for_payouts && (
                          <Badge variant="outline" className="text-xs">Payouts</Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {account.status === 'linked' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(account.id, 'payments')}
                              disabled={account.is_default_for_payments}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Set Default Payments
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(account.id, 'payouts')}
                              disabled={account.is_default_for_payouts}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Set Default Payouts
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Disconnect
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect Bank Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to disconnect {getAccountDisplayName(account)}?
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Payment Settings */}
      {properties.length > 0 && (
        <PropertyPaymentSettingsPanel
          properties={properties}
          userId={userId}
        />
      )}
    </div>
  );
}