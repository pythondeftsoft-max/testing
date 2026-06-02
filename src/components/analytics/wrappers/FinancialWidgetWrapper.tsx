import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { WidgetActionsMenu } from '../WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { MockDataSection } from '@/utils/mockFinancialReports';

interface FinancialWidgetWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  title: string;
  description?: string;
  tab: 'financial';
  category: MockDataSection;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate?: (widgetId: string) => void;
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
  componentType?: 'metric' | 'chart' | 'panel';
  showHeader?: boolean;
  // Chart-specific configuration for complex widgets
  chartConfig?: {
    chartType?: 'speedometer' | 'bar' | 'line' | 'pie';
    maxValue?: number;
    zones?: {
      min: number;
      max: number;
      color: string;
      label: string;
    }[];
    data?: any[];
    additionalProps?: Record<string, any>;
  };
}

export const FinancialWidgetWrapper: React.FC<FinancialWidgetWrapperProps> = ({
  children,
  widgetId,
  title,
  description,
  tab,
  category,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  icon,
  value,
  subtitle,
  iconName,
  iconColor,
  badge,
  trend,
  formatValue,
  variant,
  className,
  componentType = 'panel',
  showHeader = true,
  chartConfig
}) => {
  const handleToggleFavorite = () => {
    const widgetData: FavoriteWidget = {
      id: widgetId,
      tab,
      category,
      title,
      componentType,
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
      },
      chartConfig
    };
    
    // Debug logging
    console.log('FinancialWidgetWrapper - favoriting widget:', {
      widgetId,
      title,
      value,
      subtitle,
      chartConfig,
      widgetData
    });
    
    onToggleFavorite(widgetId, widgetData);
  };

  const handleDelete = () => {
    onDelete(widgetId);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(widgetId);
    }
  };

  return (
    <Card className={`group relative ${className || ''}`}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 bg-primary/10 rounded-lg">
                  {icon}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="transition-opacity duration-200">
              <WidgetActionsMenu
                isFavorited={isFavorited}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onRegenerate={onRegenerate ? handleRegenerate : undefined}
              />
            </div>
          </div>
        </CardHeader>
      )}
      
      {/* Show actions menu in top-right corner when no header */}
      {!showHeader && (
        <div className="absolute top-1 right-1 z-20 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onRegenerate={onRegenerate ? handleRegenerate : undefined}
          />
        </div>
      )}
      
      <CardContent className={showHeader ? '' : 'pt-6'}>
        {children}
      </CardContent>
    </Card>
  );
};