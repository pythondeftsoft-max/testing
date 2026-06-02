import React from 'react';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { WidgetActionsMenu } from '@/components/analytics/WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface FavoriteChartWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  title: string;
  tab: 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants';
  category: string;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  className?: string;
  // Enhanced props for complete widget data
  value?: string | number;
  subtitle?: string;
  iconName?: string; // string name for icon mapping
  iconColor?: string;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  trend?: { value: number; isPositive: boolean; period?: string };
  formatValue?: 'currency' | 'percentage' | 'number';
  variant?: 'default' | 'gradient' | 'compact';
  description?: string;
}

export const FavoriteChartWrapper: React.FC<FavoriteChartWrapperProps> = ({
  children,
  widgetId,
  title,
  tab,
  category,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  className = '',
  value,
  subtitle,
  iconName,
  iconColor,
  badge,
  trend,
  formatValue,
  variant,
  description
}) => {
  const handleToggleFavorite = () => {
    const widgetData: FavoriteWidget = {
      id: widgetId,
      tab,
      category,
      title,
      componentType: 'chart',
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
    <div className={`group relative ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <WidgetActionsMenu
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavorite}
          onDelete={onDelete || (() => {})}
          onRegenerate={onRegenerate}
        />
      </div>
      {children}
    </div>
  );
};