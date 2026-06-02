import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building2 } from 'lucide-react';
import { useStripeConnectAccounts } from '@/hooks/useStripeConnectAccounts';

interface ConnectAccountSelectProps {
  userId: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showDefault?: boolean;
}

export function ConnectAccountSelect({ 
  userId, 
  value, 
  onValueChange, 
  placeholder = "Select Connect account",
  disabled = false,
  showDefault = true
}: ConnectAccountSelectProps) {
  const { accounts } = useStripeConnectAccounts(userId);
  
  const completedAccounts = accounts.filter(account => account.onboarding_complete);

  return (
    <Select value={value === null ? 'default' : (value || 'default')} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-md z-50">
        {showDefault && (
          <SelectItem value="default">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Default/Unassigned</span>
            </div>
          </SelectItem>
        )}
        {completedAccounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{account.account_name}</span>
              {account.is_default && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {account.business_type && (
                <span className="text-xs text-muted-foreground">
                  ({account.business_type})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
        {completedAccounts.length === 0 && !showDefault && (
          <SelectItem value="default" disabled>
            <span className="text-muted-foreground">No accounts available - using Default/Unassigned</span>
          </SelectItem>
        )}
        {completedAccounts.length === 0 && showDefault && (
          <SelectItem value="default" disabled>
            <span className="text-muted-foreground">No accounts available</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}