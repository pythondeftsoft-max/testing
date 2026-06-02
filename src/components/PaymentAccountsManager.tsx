import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, CreditCard, Star, StarOff, Trash2, Building2, Link, AlertTriangle } from 'lucide-react';
import { usePaymentAccounts } from '@/hooks/usePaymentAccounts';
import { AddPaymentAccountModal } from '@/components/AddPaymentAccountModal';

interface PaymentAccountsManagerProps {
  userId: string;
  portfolioId?: string;
}

export const PaymentAccountsManager = ({ userId, portfolioId }: PaymentAccountsManagerProps) => {
  const { accounts, isLoading, deleteAccount, setAsDefault, refreshAccounts } = usePaymentAccounts(userId, portfolioId);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSetDefault = async (accountId: string) => {
    await setAsDefault(accountId);
  };

  const handleDelete = async (accountId: string) => {
    await deleteAccount(accountId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Accounts
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Link Bank Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Payment Accounts</h3>
              <p className="text-muted-foreground mb-4">
                Link a bank account to start sending secure payments through Checkbook
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Link Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      account.link_status === 'linked' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {account.link_status === 'linked' ? (
                        <Link className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{account.label}</p>
                        {account.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {account.link_status === 'linked' ? (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                            Unlinked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {account.bank_name && <span>{account.bank_name}</span>}
                        {account.account_holder_name && (
                          <>
                            {account.bank_name && <span>•</span>}
                            <span>{account.account_holder_name}</span>
                          </>
                        )}
                        {account.account_type && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{account.account_type}</span>
                          </>
                        )}
                        {account.account_last4 && (
                          <>
                            <span>•</span>
                            <span>****{account.account_last4}</span>
                          </>
                        )}
                        {account.routing_last4 && (
                          <>
                            <span>•</span>
                            <span>Routing ****{account.routing_last4}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {account.link_status !== 'linked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                        className="text-xs"
                      >
                        Link Account
                      </Button>
                    )}
                    {!account.is_default && account.link_status === 'linked' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                        className="h-8 w-8 p-0"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Payment Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{account.label}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(account.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          refreshAccounts();
          setShowAddModal(false);
        }}
        userId={userId}
        portfolioId={portfolioId}
      />
    </>
  );
};