import React, { useState, useEffect } from 'react';
import { formatCurrency, formatCurrencyByCountry } from '@/lib/formatters';
import { convertCurrency, type SupportedCurrency } from '@/lib/currencyUtils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencyDisplayProps {
  amount: number | null | undefined;
  currency?: SupportedCurrency;
  fromCurrency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
  className?: string;
  showCurrencyCode?: boolean;
  variant?: 'default' | 'large' | 'compact';
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency: currencyProp,
  fromCurrency = 'USD',
  countryCode,
  locale,
  className = '',
  showCurrencyCode = false,
  variant = 'default'
}) => {
  // Use currency from context if no prop provided
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp ?? contextCurrency;
  
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const performConversion = async () => {
      if (amount === null || amount === undefined) {
        setConvertedAmount(null);
        return;
      }

      // No conversion needed if currencies match or no target currency
      if (!currency || currency === fromCurrency) {
        setConvertedAmount(amount);
        return;
      }

      setIsConverting(true);
      try {
        const result = await convertCurrency(amount, fromCurrency, currency);
        if (result) {
          setConvertedAmount(result.convertedAmount);
        } else {
          setConvertedAmount(amount); // Fallback to original
        }
      } catch (error) {
        console.error('Currency conversion error:', {
          error,
          amount,
          fromCurrency,
          toCurrency: currency,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        setConvertedAmount(amount); // Fallback to original
      } finally {
        setIsConverting(false);
      }
    };

    performConversion();
  }, [amount, currency, fromCurrency]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'large':
        return 'text-2xl font-bold';
      case 'compact':
        return 'text-sm';
      default:
        return 'text-base font-medium';
    }
  };

  const formatAmount = () => {
    const displayAmount = convertedAmount !== null ? convertedAmount : amount;
    
    if (countryCode && !currency) {
      return formatCurrencyByCountry(displayAmount, countryCode, locale);
    }
    return formatCurrency(displayAmount, currency, locale);
  };

  const formattedAmount = formatAmount();

  return (
    <span className={`${getVariantClasses()} ${className}`}>
      {formattedAmount}
      {showCurrencyCode && currency && (
        <span className="text-xs text-muted-foreground ml-1">
          {currency}
        </span>
      )}
    </span>
  );
};
