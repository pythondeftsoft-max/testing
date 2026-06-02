import React from 'react';
import { DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { getSupportedCurrencies, type SupportedCurrency } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencySelectorProps {
  value?: SupportedCurrency;
  onValueChange?: (currency: SupportedCurrency) => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
  userId?: string; // Kept for backwards compatibility but now uses context
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onValueChange,
  className,
  showIcon = true,
  compact = false,
}) => {
  const currencies = getSupportedCurrencies();
  const { currency: contextCurrency, setCurrency } = useCurrency();
  
  // Use prop value if provided (controlled), otherwise use context
  const currentValue = value ?? contextCurrency;
  const currentCurrency = currencies.find(c => c.code === currentValue) || currencies[0];

  const handleSelect = async (code: SupportedCurrency) => {
    if (code === currentValue) return;
    
    // Update context (which handles localStorage and database sync)
    await setCurrency(code);
    
    // Call external handler if provided
    if (onValueChange) {
      onValueChange(code);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2 border-border/50 hover:bg-accent/50",
            compact && "h-8 px-2",
            className
          )}
        >
          {showIcon && <DollarSign className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium">{currentCurrency.symbol}</span>
          {!compact && (
            <span className="text-muted-foreground">{currentCurrency.code}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {currencies.map(currency => (
          <DropdownMenuItem
            key={currency.code}
            onClick={() => handleSelect(currency.code)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              currency.code === currentValue && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium w-6">{currency.symbol}</span>
              <span>{currency.code}</span>
            </div>
            <span className="text-sm text-muted-foreground">{currency.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
