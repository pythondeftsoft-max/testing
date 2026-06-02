
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface RentSplitData {
  total_rent: number;
  pha_portion: number;
  tenant_portion: number;
  voucher_type?: string;
}

interface PropertyData {
  monthly_rent: number;
  voucher_type?: string;
}

interface MonthlyRentBreakdownProps {
  property?: PropertyData;
  rentSplits?: RentSplitData;
  isLoading?: boolean;
  // New international props (optional for backward compatibility)
  currency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
}

export const MonthlyRentBreakdown: React.FC<MonthlyRentBreakdownProps> = ({
  property,
  rentSplits,
  isLoading,
  currency,
  countryCode,
  locale
}) => {
  // Debug logging
  console.log('MonthlyRentBreakdown - property:', property);
  console.log('MonthlyRentBreakdown - rentSplits:', rentSplits);
  console.log('MonthlyRentBreakdown - isLoading:', isLoading);

  // Currency display props for consistency
  const currencyProps = {
    currency,
    countryCode,
    locale
  };

  if (isLoading) {
    return <div className="animate-pulse text-2xl font-bold text-muted-foreground">Loading...</div>;
  }

  // If no property data, show no data state
  if (!property?.monthly_rent && !rentSplits?.total_rent) {
    return (
      <div className="space-y-1">
        <span className="text-2xl font-bold text-muted-foreground">No rent data</span>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            No property assigned
          </Badge>
        </div>
      </div>
    );
  }

  // Use rent splits data if available, otherwise fall back to property data
  const totalRent = rentSplits?.total_rent || property?.monthly_rent || 0;
  const hasRentSplits = rentSplits && rentSplits.pha_portion > 0;
  
  console.log('MonthlyRentBreakdown - totalRent:', totalRent);
  console.log('MonthlyRentBreakdown - hasRentSplits:', hasRentSplits);
  
  if (!hasRentSplits) {
    // Simple display when no rent splits
    return (
      <div className="space-y-1">
        <CurrencyDisplay 
          amount={totalRent} 
          variant="large" 
          className="text-foreground" 
          {...currencyProps}
        />
      </div>
    );
  }

  // Detailed breakdown when rent splits exist
  const hapPortion = rentSplits.pha_portion;
  const tenantPortion = rentSplits.tenant_portion;
  const voucherType = rentSplits.voucher_type || property?.voucher_type;

  return (
    <div className="space-y-1">
      {/* Total Rent */}
      <CurrencyDisplay 
        amount={totalRent} 
        variant="large" 
        className="text-foreground" 
        {...currencyProps}
      />
      
      {/* Clean Breakdown */}
      <div className="text-sm text-muted-foreground">
        <span className="text-blue-600 font-medium">
          HAP <CurrencyDisplay 
            amount={hapPortion} 
            variant="compact" 
            {...currencyProps}
          />
        </span>
        <span className="mx-2">|</span>
        <span className="text-green-600 font-medium">
          You <CurrencyDisplay 
            amount={tenantPortion} 
            variant="compact" 
            {...currencyProps}
          />
        </span>
      </div>
    </div>
  );
};
