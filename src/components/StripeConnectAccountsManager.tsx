import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useStripeConnectAccounts } from '@/hooks/useStripeConnectAccounts';
import { Plus, RefreshCw, Settings, Trash2, Star, ExternalLink, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { openStripeLink, copyStripeLink } from '@/utils/stripeLinks';
import { supabase } from '@/integrations/supabase/client';

interface StripeConnectAccountsManagerProps {
  userId: string;
}

export const StripeConnectAccountsManager: React.FC<StripeConnectAccountsManagerProps> = ({
  userId
}) => {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, refreshAccount } = useStripeConnectAccounts(userId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAccount = async (formData: FormData) => {
    setIsCreating(true);
    const accountData = {
      account_name: formData.get('account_name') as string,
      business_type: formData.get('business_type') as string,
      business_name: formData.get('business_name') as string,
      email: formData.get('email') as string,
    };

    const result = await createAccount(accountData);
    if (result.success && result.onboarding_url) {
      // Use improved link opening with fallbacks
      openStripeLink(result.onboarding_url, { 
        buttonText: "Stripe setup",
        onCopyFallback: () => copyStripeLink(result.onboarding_url, "Stripe setup")
      });
    }
    
    setIsCreating(false);
    setIsCreateDialogOpen(false);
  };

  const handleSetDefault = async (accountId: string) => {
    await updateAccount(accountId, { is_default: true });
  };

  const handleRefresh = async (accountId: string) => {
    await refreshAccount(accountId);
  };

  const handleOpenAccountSetup = async (accountId: string) => {
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      // Get fresh Stripe data with onboarding URL
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          account_id: account.stripe_account_id,
        }
      });

      if (error) throw error;

      if (data?.onboarding_url) {
        openStripeLink(data.onboarding_url, { 
          buttonText: "Stripe setup",
          onCopyFallback: () => copyStripeLink(data.onboarding_url, "Stripe setup")
        });
      }
      
      // Also refresh the account data
      await refreshAccount(accountId);
    } catch (error) {
      console.warn('Failed to open account setup:', error);
    }
  };

  const handleCopyAccountLink = async (accountId: string) => {
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      // Get fresh Stripe data with onboarding URL
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
        body: {
          account_id: account.stripe_account_id,
        }
      });

      if (error) throw error;

      if (data?.onboarding_url) {
        await copyStripeLink(data.onboarding_url, "Stripe setup");
      }
    } catch (error) {
      console.warn('Failed to copy account link:', error);
    }
  };

  const getStatusBadge = (account: any) => {
    if (!account.onboarding_complete) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Setup Required</Badge>;
    }
    if (!account.charges_enabled || !account.payouts_enabled) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Limited</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
  };

  const getBankAccountInfo = (account: any) => {
    const externalAccounts = account.external_accounts || [];
    if (externalAccounts.length === 0) return 'No bank account connected';
    
    const bankAccount = externalAccounts[0];
    return `****${bankAccount.last4 || '0000'} (${bankAccount.bank_name || 'Bank'})`;
  };

  if (isLoading && accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect Accounts</CardTitle>
          <CardDescription>
            Manage multiple merchant accounts for receiving rent payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stripe Connect Accounts</CardTitle>
            <CardDescription>
              Manage multiple merchant accounts to route rent payments to different bank accounts
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Connect Account</DialogTitle>
                <DialogDescription>
                  Create a new Stripe Connect account to receive payments
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateAccount(new FormData(e.currentTarget));
              }} className="space-y-4">
                <div>
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input 
                    id="account_name" 
                    name="account_name" 
                    placeholder="Main Business Account"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select name="business_type">
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="non_profit">Non-profit</SelectItem>
                      <SelectItem value="government_entity">Government Entity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input 
                    id="business_name" 
                    name="business_name" 
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    placeholder="business@example.com"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <Alert>
            <AlertDescription>
              No Connect accounts found. Create your first account to start receiving rent payments.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{account.account_name}</h3>
                    {account.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(account)}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRefresh(account.id)}
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      {!account.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetDefault(account.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Connect Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{account.account_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAccount(account.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong>Bank Account:</strong> {getBankAccountInfo(account)}
                  </div>
                  <div>
                    <strong>Business:</strong> {account.business_name || 'Not specified'}
                  </div>
                </div>

                {!account.onboarding_complete && (
                  <Alert>
                    <AlertDescription>
                      <div className="flex items-center justify-between mb-2">
                        <span>Complete your account setup in Stripe to start receiving payments</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAccountSetup(account.id)}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Continue Setup
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyAccountLink(account.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Links open in new tab. If blocked, use copy button.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};