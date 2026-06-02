import React from 'react';
import { Badge } from "@/components/ui/badge";
import { usePropertyPaymentSettings } from '@/hooks/usePropertyPaymentSettings';
import { usePortfolioPaymentSettings } from '@/hooks/usePortfolioPaymentSettings';
import { useStripeConnectAccounts } from '@/hooks/useStripeConnectAccounts';

interface EffectiveAccountLabelProps {
  propertyId: string;
  portfolioId?: string;
  userId: string;
}

export function EffectiveAccountLabel({ propertyId, portfolioId, userId }: EffectiveAccountLabelProps) {
  const { settings: propertySettings, isLoading: propertyLoading } = usePropertyPaymentSettings(propertyId);
  const { settings: portfolioSettings, isLoading: portfolioLoading } = usePortfolioPaymentSettings(portfolioId);
  const { accounts } = useStripeConnectAccounts(userId);
  
  if (propertyLoading || portfolioLoading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }
  
  // Priority: Property setting > Portfolio setting > Default/Unassigned
  const effectiveAccountId = propertySettings?.stripe_connect_account_id || 
                            portfolioSettings?.connect_account_id || 
                            null;
  
  const accountName = effectiveAccountId 
    ? accounts.find(acc => acc.id === effectiveAccountId)?.account_name || 'Unknown account'
    : 'Default/Unassigned';

  const source = propertySettings?.stripe_connect_account_id ? 'property' :
                 portfolioSettings?.connect_account_id ? 'portfolio' : 
                 'default';
    
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{accountName}</span>
      <Badge 
        variant={source === 'property' ? 'default' : source === 'portfolio' ? 'secondary' : 'outline'} 
        className="text-xs"
      >
        {source === 'property' ? 'Property' : source === 'portfolio' ? 'Portfolio' : 'Unassigned'}
      </Badge>
    </div>
  );
}