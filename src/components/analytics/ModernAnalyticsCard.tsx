
import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPercentage } from '@/lib/formatters';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface Trend {
  value: number;
  isPositive: boolean;
  period: string;
}

interface ModernAnalyticsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  trend?: Trend;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'destructive' | 'secondary';
  };
  chart?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  formatValue?: 'currency' | 'percentage' | 'number';
  className?: string;
  // Enhanced international props
  currency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
}

const ModernAnalyticsCard = ({
  title,
  value,
  icon: Icon,
  iconColor = "text-openkey-blue",
  subtitle,
  trend,
  badge,
  chart,
  onClick,
  loading = false,
  formatValue = 'number',
  className = '',
  currency,
  countryCode,
  locale
}: ModernAnalyticsCardProps) => {
  const formatDisplayValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (formatValue) {
      case 'currency':
        return (
          <CurrencyDisplay 
            amount={val} 
            currency={currency} 
            countryCode={countryCode} 
            locale={locale}
            variant="large"
          />
        );
      case 'percentage':
        return formatPercentage(val);
      default:
        return val.toLocaleString();
    }
  };

  if (loading) {
    return (
      <CardEnhanced 
        variant="subtle" 
        className={`cursor-pointer animate-pulse ${className}`}
      >
        <CardEnhancedHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted/50 rounded w-3/4"></div>
            <div className="w-5 h-5 bg-muted/50 rounded"></div>
          </div>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="h-8 bg-muted/50 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-muted/50 rounded w-full"></div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced 
      variant="subtle" 
      className={`card-hover cursor-pointer transition-all duration-200 hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <CardEnhancedHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardEnhancedTitle className="text-sm font-medium text-muted-foreground leading-tight">
            {title}
          </CardEnhancedTitle>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-foreground">
              {formatDisplayValue(value)}
            </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-tight line-clamp-2">
              {subtitle}
            </p>
          )}
          
          {chart && (
            <div className="mt-4">
              {chart}
            </div>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default ModernAnalyticsCard;
