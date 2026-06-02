
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  valueClassName?: string;
}

export const MetricDisplay = ({
  label,
  value,
  subtitle,
  isLoading = false,
  error = false,
  icon,
  trend,
  trendValue,
  valueClassName = ""
}: MetricDisplayProps) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      // Format numbers with proper thousand separators
      return val.toLocaleString();
    }
    return val;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-400">
            <div className="text-sm">{label}</div>
            <div className="text-lg font-semibold">--</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2 mb-2">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-bold ${valueClassName}`}>{formatValue(value)}</span>
          {trend && trendValue && (
            <span
              className={`text-xs ${
                trend === 'up'
                  ? 'text-green-600'
                  : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {trendValue}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};
