import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Plus, CreditCard } from 'lucide-react';
import { useBankAccounts, BankAccount } from '@/hooks/useBankAccounts';
import { type ManualPaymentMethod } from '@/components/ManualPaymentMethodModal';

interface PaymentMethodSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  type?: 'payments' | 'payouts' | 'all';
  className?: string;
  onAddNew?: () => void;
  manualMethods?: ManualPaymentMethod[];
}

export function PaymentMethodSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select payment method",
  type = 'all',
  className,
  onAddNew,
  manualMethods = []
}: PaymentMethodSelectProps) {
  const { accounts, isLoading } = useBankAccounts();

  const getAccountDisplayName = (account: BankAccount) => {
    if (account.account_name) {
      return account.mask ? `${account.account_name} ••••${account.mask}` : account.account_name;
    }
    return account.mask ? `••••${account.mask}` : 'Unknown Account';
  };

  const getFilteredAccounts = () => {
    return accounts.filter(account => {
      if (account.status !== 'linked') return false;
      
      if (type === 'payments') {
        return true; // All linked accounts can be used for payments
      } else if (type === 'payouts') {
        return true; // All linked accounts can be used for payouts
      }
      return true; // type === 'all'
    });
  };

  const filteredAccounts = getFilteredAccounts();
  const selectedAccount = filteredAccounts.find(account => account.id === value);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading payment methods..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (filteredAccounts.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No payment methods available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedAccount && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{getAccountDisplayName(selectedAccount)}</span>
              {type === 'payments' && selectedAccount.is_default_for_payments && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              {type === 'payouts' && selectedAccount.is_default_for_payouts && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {filteredAccounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2 w-full">
              <Building2 className="h-4 w-4" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getAccountDisplayName(account)}</span>
                  {type === 'payments' && account.is_default_for_payments && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  {type === 'payouts' && account.is_default_for_payouts && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.institution_name} • {account.account_type}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
        
        {/* Manual Payment Methods */}
        {manualMethods.map((method) => (
          <SelectItem key={method.id} value={method.id}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{method.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {method.type} {method.description && `• ${method.description}`}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
        
        {onAddNew && (
          <SelectItem value="__add_new__" onSelect={(e) => {
            e.preventDefault();
            onAddNew();
          }}>
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              <span>Add New Payment Method</span>
            </div>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}