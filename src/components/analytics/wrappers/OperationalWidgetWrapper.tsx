import React from 'react';
import { WidgetActionsMenu } from '../WidgetActionsMenu';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface OperationalWidgetWrapperProps {
  children: React.ReactNode;
  widgetId: string;
  title: string;
  tab: 'operational';
  category: string;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate?: (widgetId: string) => void;
  // Enhanced props for complete widget data
  value?: string | number;
  subtitle?: string;
  iconName?: string;
  iconColor?: string;
  formatValue?: 'currency' | 'percentage' | 'number';
  componentType?: 'metric' | 'chart' | 'panel';
  className?: string;
}

export const OperationalWidgetWrapper: React.FC<OperationalWidgetWrapperProps> = ({
  children,
  widgetId,
  title,
  tab,
  category,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  value,
  subtitle,
  iconName,
  iconColor,
  formatValue,
  componentType = 'metric',
  className
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
        formatValue,
        className,
      }
    };
    
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