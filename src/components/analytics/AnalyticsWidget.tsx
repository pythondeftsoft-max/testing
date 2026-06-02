
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedDescription, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AnalyticsWidgetProps {
  title: string;
  description?: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  icon?: LucideIcon;
  chart?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  className?: string;
}

const AnalyticsWidget = ({
  title,
  description,
  value,
  trend,
  icon: Icon,
  chart,
  size = 'medium',
  status = 'neutral',
  className
}: AnalyticsWidgetProps) => {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3 lg:col-span-4'
  };

  const statusColors = {
    good: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
    neutral: 'text-foreground'
  };

  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  const getVariant = () => {
    if (status === 'good') return 'subtle';
    if (status === 'warning') return 'premium';
    if (status === 'critical') return 'outlined';
    return 'elevated';
  };

  return (
    <CardEnhanced 
      variant={getVariant()}
      className={cn(sizeClasses[size], className)}
    >
      <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardEnhancedTitle className="text-sm font-medium">{title}</CardEnhancedTitle>
          {description && (
            <CardEnhancedDescription className="text-xs">{description}</CardEnhancedDescription>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-gradient-blue-gold">
            <Icon className="h-4 w-4 text-white" />
          </div>
        )}
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={cn("text-2xl font-bold", statusColors[status])}>
              {typeof value === 'number' && value > 1000 
                ? (value / 1000).toFixed(1) + 'k'
                : value}
            </div>
            {trend && (
              <Badge 
                variant="secondary" 
                className={cn("text-xs", trendColors[trend.direction])}
              >
                {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'} 
                {trend.value}% {trend.label}
              </Badge>
            )}
          </div>
          {chart && (
            <div className="h-[60px] w-full">
              {chart}
            </div>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default AnalyticsWidget;
