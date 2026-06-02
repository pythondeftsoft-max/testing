import React from 'react';
import { WidgetActionsMenu } from '../WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface PredictiveWidgetWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  title: string;
  tab: 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants';
  category: string;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate?: (widgetId: string) => void;
  // Widget definition for re-rendering predictive widgets
  widgetDefinition?: any; // WidgetDefinition from widgetTypes.ts
  // Enhanced props for complete widget data
  value?: string | number;
  subtitle?: string;
  iconName?: string;
  iconColor?: string;
  formatValue?: 'currency' | 'percentage' | 'number';
  componentType?: 'metric' | 'chart' | 'panel';
  className?: string;
}

export const PredictiveWidgetWrapper: React.FC<PredictiveWidgetWrapperProps> = ({
  children,
  widgetId,
  title,
  tab,
  category,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  widgetDefinition,
  value,
  subtitle,
  iconName,
  iconColor,
  formatValue,
  componentType = 'panel',
  className
}) => {
  const handleToggleFavorite = () => {
    console.log('PredictiveWidgetWrapper - Before creating widgetData:', {
      widgetId,
      tab,
      category,
      title,
      componentType,
      widgetDefinition,
      hasWidgetDefinition: !!widgetDefinition
    });
    
    const widgetData: FavoriteWidget = {
      id: widgetId,
      tab,
      category,
      title,
      componentType,
      widgetDefinition, // Include widget definition for re-rendering
      widgetProps: {
        value,
        subtitle,
        icon: iconName,
        iconColor,
        formatValue,
        className,
      }
    };
    
    console.log('PredictiveWidgetWrapper - Created widgetData:', widgetData);
    console.log('PredictiveWidgetWrapper - widgetData.widgetDefinition:', widgetData.widgetDefinition);
    
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
    <div className={`group relative ${className || ''}`}>
      {/* Actions menu in top-right corner */}
      <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
        <WidgetActionsMenu
          isFavorited={isFavorited}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
        />
      </div>
      
      {children}
    </div>
  );
};