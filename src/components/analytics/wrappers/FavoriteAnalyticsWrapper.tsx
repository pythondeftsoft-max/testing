import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import StarButton from '@/components/analytics/StarButton';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface FavoriteAnalyticsWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  title: string;
  description?: string;
  tab: 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants';
  category: string;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  icon?: React.ReactNode;
  // Enhanced props for complete widget data
  value?: string | number;
  subtitle?: string;
  iconName?: string; // string name for icon mapping
  iconColor?: string;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  trend?: { value: number; isPositive: boolean; period?: string };
  formatValue?: 'currency' | 'percentage' | 'number';
  variant?: 'default' | 'gradient' | 'compact';
  className?: string;
}

export const FavoriteAnalyticsWrapper: React.FC<FavoriteAnalyticsWrapperProps> = ({
  children,
  widgetId,
  title,
  description,
  tab,
  category,
  isFavorited,
  onToggleFavorite,
  icon,
  value,
  subtitle,
  iconName,
  iconColor,
  badge,
  trend,
  formatValue,
  variant,
  className
}) => {
  const handleToggleFavorite = () => {
    const widgetData: FavoriteWidget = {
      id: widgetId,
      tab,
      category,
      title,
      componentType: 'panel',
      widgetProps: {
        value,
        subtitle,
        icon: iconName,
        iconColor,
        badge,
        trend,
        formatValue,
        variant,
        description,
        className,
      }
    };
    
    onToggleFavorite(widgetId, widgetData);
  };

  return (
    <Card className="group relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-navy-blue">{title}</h3>
              {description && (
                <p className="text-sm text-navy-blue/70">{description}</p>
              )}
            </div>
          </div>
          <StarButton
            isFavorited={isFavorited}
            onToggle={handleToggleFavorite}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};