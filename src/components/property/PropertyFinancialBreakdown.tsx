
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface PropertyFinancialBreakdownProps {
  monthlyRent: number;
  securityDeposit?: number;
  applicationFee?: number;
  firstMonthRent?: number;
  utilityEstimate?: number;
  moveInSpecial?: string;
  // New international props (optional for backward compatibility)
  currency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
}

export const PropertyFinancialBreakdown = ({
  monthlyRent,
  securityDeposit = monthlyRent,
  applicationFee = 50,
  firstMonthRent = monthlyRent,
  utilityEstimate = 150,
  moveInSpecial,
  currency,
  countryCode,
  locale
}: PropertyFinancialBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const totalMoveInCost = firstMonthRent + securityDeposit + applicationFee;
  
  // Currency display props for consistency
  const currencyProps = {
    currency,
    countryCode,
    locale
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Move-in Costs</span>
          </div>
          <Info className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Move-in Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {moveInSpecial && (
              <div className="p-2 bg-green-50 text-green-700 rounded text-center font-medium">
                🎉 {moveInSpecial}
              </div>
            )}
            <div className="flex justify-between">
              <span>First Month Rent</span>
              <CurrencyDisplay 
                amount={firstMonthRent} 
                variant="compact" 
                className="font-medium" 
                {...currencyProps}
              />
            </div>
            <div className="flex justify-between">
              <span>Security Deposit</span>
              <CurrencyDisplay 
                amount={securityDeposit} 
                variant="compact" 
                className="font-medium" 
                {...currencyProps}
              />
            </div>
            <div className="flex justify-between">
              <span>Application Fee</span>
              <CurrencyDisplay 
                amount={applicationFee} 
                variant="compact" 
                className="font-medium" 
                {...currencyProps}
              />
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total Move-in</span>
              <CurrencyDisplay 
                amount={totalMoveInCost} 
                variant="compact" 
                {...currencyProps}
              />
            </div>
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Est. Monthly Utilities</span>
              <CurrencyDisplay 
                amount={utilityEstimate} 
                variant="compact" 
                {...currencyProps}
              />
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
