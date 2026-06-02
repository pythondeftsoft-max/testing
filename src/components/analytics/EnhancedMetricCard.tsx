import React from 'react';
import { LucideIcon, Info } from 'lucide-react';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TrendSparklineChart from './charts/TrendSparklineChart';

interface TrendData {
  value: number;
  isPositive: boolean;
  percentage: number;
}

interface SparklineData {
  value: number;
}

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: TrendData;
  sparklineData?: SparklineData[];
  isLoading?: boolean;
  onClick?: () => void;
  formatValue?: 'currency' | 'percentage' | 'number';
  gradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
  infoText?: string;
}

const EnhancedMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparklineData,
  isLoading = false,
  onClick,
  formatValue = 'number',
  gradient = false,
  size = 'md',
  className,
  badge,
  infoText,
}: EnhancedMetricCardProps) => {
  const formatDisplayValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (formatValue) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-4 space-y-2';
      case 'lg':
        return 'p-8 space-y-4';
      default:
        return 'p-6 space-y-3';
    }
  };

  const getValueTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xl';
      case 'lg':
        return 'text-4xl';
      default:
        return 'text-2xl';
    }
  };

  const getBadgeClasses = () => {
    if (!badge) return '';
    
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (badge.variant) {
      case 'success':
        return `${baseClasses} bg-success/10 text-success border border-success/20`;
      case 'warning':
        return `${baseClasses} bg-warning/10 text-warning border border-warning/20`;
      case 'error':
        return `${baseClasses} bg-destructive/10 text-destructive border border-destructive/20`;
      case 'info':
        return `${baseClasses} bg-primary/10 text-primary border border-primary/20`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground`;
    }
  };

  if (isLoading) {
    return (
      <CardEnhanced variant="command" className={`${getSizeClasses()} animate-pulse command-metric-card`}>
        <CardEnhancedContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          {sparklineData && <Skeleton className="h-10 w-full" />}
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced
        variant="command"
        className={`
          command-metric-card
          transition-all duration-300
          ${onClick ? 'cursor-pointer' : ''} 
          relative overflow-hidden group
        `}
        onClick={onClick}
      >
        <CardEnhancedContent className={getSizeClasses()}>
          <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-muted-foreground leading-none">
                  {title}
                </h3>
                {infoText && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
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
                {badge && (
                  <span className={getBadgeClasses()}>
                    {badge.text}
                  </span>
                )}
              </div>
            
            <div className={`${getValueTextSize()} font-bold text-foreground leading-tight`}>
              {formatDisplayValue(value)}
            </div>
            
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          {Icon && (
            <div className={`
              ${gradient ? 'text-primary' : 'text-muted-foreground'} 
              transition-colors duration-200 group-hover:text-primary
              ${size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'}
            `}>
              <Icon className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${trend.isPositive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
              }
            `}>
              <span className={`text-xs ${trend.isPositive ? '↗' : '↘'}`}>
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {trend.percentage.toFixed(1)}%
            </div>
            <span className="text-xs text-muted-foreground">
              vs last period
            </span>
          </div>
        )}

        {/* Sparkline Chart */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3">
            <TrendSparklineChart 
              data={sparklineData}
              height={40}
              color={gradient ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            />
          </div>
        )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default EnhancedMetricCard;