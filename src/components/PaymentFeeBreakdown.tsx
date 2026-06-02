
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Info } from "lucide-react";
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { SupportedCurrency } from '@/lib/currencyUtils';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

interface PaymentFeeBreakdownProps {
  rentAmount: number;
  paymentMethod?: 'card' | 'ach' | 'us_bank_account' | 'checkbook';
  showDetails?: boolean;
  currency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
}

export const PaymentFeeBreakdown: React.FC<PaymentFeeBreakdownProps> = ({ 
  rentAmount, 
  paymentMethod = 'card',
  showDetails = true,
  currency,
  countryCode,
  locale
}) => {
  const { data: config } = usePlatformConfig();
  
  // Get payment method specific fees from config
  const methodKey = paymentMethod === 'us_bank_account' ? 'ach' : paymentMethod;
  const feeConfig = config?.config_value as any;
  const methodConfig = feeConfig?.[methodKey] || feeConfig?.card;
  
  // Use correct field names from platform_configs
  const stripeFee = methodConfig?.stripe_processing_fee ?? 0;
  const platformRevenueFee = methodConfig?.platform_revenue_fee ?? 0.005;
  const tenantPaysPercent = methodConfig?.tenant_pays_percent ?? 50;
  const landlordPaysPercent = methodConfig?.landlord_pays_percent ?? 50;
  
  // Calculate total fees
  const totalPlatformFee = rentAmount * platformRevenueFee;
  const tenantPlatformPortion = totalPlatformFee * (tenantPaysPercent / 100);
  const landlordPlatformPortion = totalPlatformFee * (landlordPaysPercent / 100);
  const tenantStripeFee = rentAmount * stripeFee;
  
  const tenantFee = tenantPlatformPortion + tenantStripeFee;
  const totalTenantAmount = rentAmount + tenantFee;
  const netToLandlord = rentAmount - landlordPlatformPortion;
  
  const platformFeePercent = (platformRevenueFee * 100).toFixed(2);
  const tenantFeePercent = ((tenantFee / rentAmount) * 100).toFixed(2);

  // Currency display props for consistency
  const currencyProps = {
    currency,
    countryCode,
    locale
  };

  const paymentMethodLabel = {
    card: 'Card',
    ach: 'ACH',
    us_bank_account: 'ACH',
    checkbook: 'Checkbook'
  }[paymentMethod];

  if (!showDetails) {
    return (
      <div className="bg-muted p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Monthly Rent:</span>
          <CurrencyDisplay 
            amount={rentAmount} 
            variant="compact" 
            className="font-medium" 
            {...currencyProps}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Processing Fee ({paymentMethodLabel}: {tenantFeePercent}%):</span>
          <CurrencyDisplay 
            amount={tenantFee} 
            variant="compact" 
            className="font-medium" 
            {...currencyProps}
          />
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center font-semibold">
          <span>Total Amount:</span>
          <CurrencyDisplay 
            amount={totalTenantAmount} 
            variant="compact" 
            {...currencyProps}
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Payment Breakdown ({paymentMethodLabel})
        </CardTitle>
        <CardDescription>
          {paymentMethod === 'card' 
            ? 'Card payments have higher fees. Consider ACH for lower costs!'
            : 'ACH payments have lower processing fees'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Monthly Rent</span>
            <CurrencyDisplay 
              amount={rentAmount} 
              variant="compact" 
              className="font-medium" 
              {...currencyProps}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Processing Fee</span>
              <Badge variant="secondary" className="text-xs">{tenantFeePercent}%</Badge>
            </div>
            <CurrencyDisplay 
              amount={tenantFee} 
              variant="compact" 
              className="font-medium" 
              {...currencyProps}
            />
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total You Pay</span>
            <CurrencyDisplay 
              amount={totalTenantAmount} 
              variant="default" 
              {...currencyProps}
            />
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            How fees work:
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>• Landlord receives:</span>
              <CurrencyDisplay 
                amount={netToLandlord} 
                variant="compact" 
                className="font-medium" 
                {...currencyProps}
              />
            </div>
            <div className="flex justify-between">
              <span>• Platform fee ({platformFeePercent}%):</span>
              <CurrencyDisplay 
                amount={totalPlatformFee} 
                variant="compact" 
                className="font-medium" 
                {...currencyProps}
              />
            </div>
            <div className="ml-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>- Tenant pays ({tenantPaysPercent}%):</span>
                <CurrencyDisplay 
                  amount={tenantPlatformPortion} 
                  variant="compact" 
                  {...currencyProps}
                />
              </div>
              <div className="flex justify-between">
                <span>- Landlord pays ({landlordPaysPercent}%):</span>
                <CurrencyDisplay 
                  amount={landlordPlatformPortion} 
                  variant="compact" 
                  {...currencyProps}
                />
              </div>
            </div>
            {tenantStripeFee > 0 && (
              <div className="flex justify-between">
                <span>• Stripe processing fee:</span>
                <CurrencyDisplay 
                  amount={tenantStripeFee} 
                  variant="compact" 
                  className="font-medium" 
                  {...currencyProps}
                />
              </div>
            )}
            <div className="text-xs mt-3 pt-2 border-t border-border text-muted-foreground">
              Secure payments powered by Stripe. No hidden fees or monthly charges.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
