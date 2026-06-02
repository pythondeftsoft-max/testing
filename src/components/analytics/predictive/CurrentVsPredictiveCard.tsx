import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PredictiveData {
  value: number;
  confidence: number;
  timeframe: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface CurrentVsPredictiveCardProps {
  title: string;
  currentValue: number;
  predictiveData: PredictiveData;
  formatValue?: 'currency' | 'percentage' | 'number';
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

const formatDisplayValue = (value: number, format?: 'currency' | 'percentage' | 'number'): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString();
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (confidence >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3" />;
    case 'down':
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Target className="h-3 w-3" />;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositive: boolean = true): string => {
  if (trend === 'stable') return 'text-muted-foreground';
  const goodTrend = isPositive ? trend === 'up' : trend === 'down';
  return goodTrend ? 'text-green-600' : 'text-red-600';
};

export const CurrentVsPredictiveCard: React.FC<CurrentVsPredictiveCardProps> = ({
  title,
  currentValue,
  predictiveData,
  formatValue = 'number',
  icon: Icon,
  className
}) => {
  // Determine if upward trend is positive (true for most metrics except things like maintenance costs)
  const isUpwardPositive = !title.toLowerCase().includes('cost') && !title.toLowerCase().includes('expense');

  return (
    <CardEnhanced className={cn("bg-white border-border/50 hover:border-border transition-all duration-200", className)}>
      <CardEnhancedHeader className="pb-3">
        <CardEnhancedTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent className="space-y-4">
        {/* Current vs Predicted Values */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Value */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Current
            </div>
            <div className="text-xl font-semibold text-foreground">
              {formatDisplayValue(currentValue, formatValue)}
            </div>
          </div>

          {/* Predicted Value */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              {predictiveData.timeframe}
            </div>
            <div className="text-xl font-semibold text-foreground">
              {formatDisplayValue(predictiveData.value, formatValue)}
            </div>
          </div>
        </div>

        {/* Trend and Confidence */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Trend */}
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            getTrendColor(predictiveData.trend, isUpwardPositive)
          )}>
            {getTrendIcon(predictiveData.trend)}
            {predictiveData.trend !== 'stable' && (
              <span>
                {Math.abs(predictiveData.trendPercentage).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Confidence Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs border",
              getConfidenceColor(predictiveData.confidence)
            )}
          >
            {predictiveData.confidence}% confidence
          </Badge>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};