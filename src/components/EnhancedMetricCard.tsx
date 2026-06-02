import React from 'react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useCountUp } from '@/hooks/useCountUp';

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  subtitle?: string;
  percentage?: number;
  percentageLabel?: string;
  onClick?: () => void;
  isPositive?: boolean;
  showAsSuccess?: boolean;
  infoText?: string;
  showSparkline?: boolean;
}

const EnhancedMetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  subtitle,
  percentage,
  percentageLabel,
  onClick,
  isPositive = true,
  showAsSuccess = false,
  infoText,
  showSparkline = true
}: EnhancedMetricCardProps) => {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatPercentage = (percentage: number) => {
    const prefix = percentage >= 0 ? '+' : '';
    return `${prefix}${percentage.toFixed(1)}%`;
  };

  const isCurrencyValue = title.toLowerCase().includes('rent') || 
    title.toLowerCase().includes('cash') || 
    title.toLowerCase().includes('flow') ||
    title.toLowerCase().includes('revenue') ||
    title.toLowerCase().includes('income');

  // Use count-up animation for numeric values
  const numericValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : 0);
  const animatedValue = useCountUp(Math.abs(numericValue), 2000, !isNaN(numericValue));

  const displayValue = typeof value === 'number' && isCurrencyValue
    ? formatCurrency(animatedValue * (numericValue < 0 ? -1 : 1))
    : typeof value === 'number' 
      ? animatedValue.toLocaleString()
      : value;

  // Determine if the value represents a positive trend
  const valueIsPositive = typeof value === 'number' ? value >= 0 : isPositive;

  return (
    <CardEnhanced 
      variant="command"
      className={`command-metric-card ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardEnhancedContent className="p-6">
        <div className="space-y-4">
          {/* Header with icon and info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
              {infoText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      sideOffset={8}
                      collisionPadding={16}
                      avoidCollisions={true}
                      className="max-w-sm bg-popover text-popover-foreground border-border px-4 py-3 shadow-lg z-[99999]"
                    >
                      <p className="text-sm leading-relaxed">{infoText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className={`p-2.5 ${iconColor} rounded-xl shadow-sm`}>
              <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Value with optional sparkline */}
          <div className="flex items-end justify-between gap-4">
            <span className={`text-4xl font-bold tracking-tight transition-colors ${
              showAsSuccess 
                ? 'text-success' 
                : !valueIsPositive 
                  ? 'text-destructive' 
                  : 'text-foreground'
            }`}>
              {displayValue}
            </span>
            {showSparkline && (
              <Sparkline 
                positive={valueIsPositive} 
                width={80} 
                height={32} 
              />
            )}
          </div>
          
          {/* Percentage badge and label */}
          {percentage !== undefined && (
            <div className="flex items-center justify-between">
              <Badge 
                variant={percentage >= 0 ? "success" : "destructive"}
                className="flex items-center gap-1 text-xs"
              >
                {percentage >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {formatPercentage(percentage)}
              </Badge>
              {percentageLabel && (
                <span className="text-xs text-muted-foreground">{percentageLabel}</span>
              )}
            </div>
          )}
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default EnhancedMetricCard;

