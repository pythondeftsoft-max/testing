import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  BarChart3, 
  PieChart, 
  Activity,
  Home,
  Calculator,
  Clock,
  Shield,
  FileText,
  Settings,
  Star,
  LucideIcon
} from 'lucide-react';
import { WidgetActionsMenu } from './WidgetActionsMenu';
import ModernMetricCard from './ModernMetricCard';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import ROISpeedometerChart from './charts/ROISpeedometerChart';
import { PredictiveMetricCard } from './predictive/PredictiveMetricCard';
import { PredictiveChartCard } from './predictive/PredictiveChartCard';
import { PredictiveAnalysisPanel } from './predictive/PredictiveAnalysisPanel';

interface FavoriteWidgetRendererProps {
  widget: FavoriteWidget;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  onDelete?: (widgetId: string) => void;
  isFavorited: boolean;
  propertyFilters?: {
    selectedPropertyTypes: string[];
    selectedPortfolios: string[];
    selectedProperties: string[];
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  assetFilters?: {
    portfolio: string;
    timeframe: string;
  };
}

// Icon mapping for string-based icon names
const iconMap = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'dollar-sign': DollarSign,
  'users': Users,
  'building-2': Building2,
  'bar-chart-3': BarChart3,
  'pie-chart': PieChart,
  'activity': Activity,
  'home': Home,
  'calculator': Calculator,
  'clock': Clock,
  'shield': Shield,
  'file-text': FileText,
  'settings': Settings,
  'star': Star,
} as const;

export const FavoriteWidgetRenderer: React.FC<FavoriteWidgetRendererProps> = ({
  widget,
  onToggleFavorite,
  onDelete,
  isFavorited,
  propertyFilters,
  assetFilters
}) => {
  const { widgetProps, widgetDefinition, category } = widget;

  // Determine if this widget should be affected by filters
  const shouldApplyPropertyFilters = widget.tab === 'properties' && propertyFilters;
  const shouldApplyAssetFilters = widget.tab === 'assets' && assetFilters;

  // Check if filters are active
  const hasActivePropertyFilters = propertyFilters && (
    propertyFilters.selectedPropertyTypes.length > 0 ||
    propertyFilters.selectedPortfolios.length > 0 ||
    propertyFilters.selectedProperties.length > 0 ||
    (propertyFilters.dateRange.from !== undefined && propertyFilters.dateRange.to !== undefined)
  );

  const hasActiveAssetFilters = assetFilters && (
    assetFilters.portfolio !== 'everything' ||
    assetFilters.timeframe !== 'ytd'
  );

  // Debug logging
  console.log('FavoriteWidgetRenderer - Full widget object:', widget);
  console.log('FavoriteWidgetRenderer - Category:', category);
  console.log('FavoriteWidgetRenderer - Component Type:', widget.componentType);
  console.log('FavoriteWidgetRenderer - Has widgetDefinition:', !!widgetDefinition);
  console.log('FavoriteWidgetRenderer - widgetDefinition:', widgetDefinition);
  console.log('FavoriteWidgetRenderer - widgetProps:', widgetProps);
  console.log('FavoriteWidgetRenderer - Will render predictive?', category === 'predictive-analytics' && !!widgetDefinition);

  // Handle predictive analytics widgets with full widget definition
  if (widget.category === 'predictive-analytics' && widgetDefinition) {
    return (
      <div className="group relative">
        <div className="absolute top-2 right-2 z-20 transition-opacity duration-200">
          <WidgetActionsMenu
            isFavorited={isFavorited}
            onToggleFavorite={() => onToggleFavorite(widget.id, widget)}
            onDelete={onDelete ? () => onDelete(widget.id) : undefined}
          />
        </div>
        
        {widget.componentType === 'metric' && (
          <PredictiveMetricCard widget={widgetDefinition} />
        )}
        
        {widget.componentType === 'chart' && (
          <PredictiveChartCard widget={widgetDefinition} />
        )}
        
        {widget.componentType === 'panel' && (
          <PredictiveAnalysisPanel widget={widgetDefinition} />
        )}
      </div>
    );
  }

  // If no widgetProps, render a fallback placeholder
  if (!widgetProps) {
    return (
      <CardEnhanced className="card-hover-gold h-32 flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
        <CardEnhancedContent className="p-4 text-center">
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              {widget.componentType === 'metric' && <BarChart3 className="h-6 w-6 text-muted-foreground" />}
              {widget.componentType === 'chart' && <TrendingUp className="h-6 w-6 text-muted-foreground" />}
              {widget.componentType === 'panel' && <Settings className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">{widget.title}</h4>
              <p className="text-xs text-muted-foreground capitalize">
                {widget.tab} • {widget.componentType}
              </p>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  // Get icon component from string name
  const getIconComponent = (iconName?: string): LucideIcon | undefined => {
    if (!iconName) return undefined;
    return iconMap[iconName as keyof typeof iconMap];
  };

  // Render the actual widget based on componentType
  switch (widget.componentType) {
    case 'metric':
      const IconComponent = getIconComponent(widgetProps.icon);
      // Use fallback icon if none found
      const FallbackIcon = iconMap['bar-chart-3'];

      // Apply asset filter to subtitle if applicable
      let adjustedSubtitle = widgetProps.subtitle;
      if (shouldApplyAssetFilters && assetFilters) {
        // For asset widgets, update the timeframe label in subtitle
        const timeframeLabels: Record<string, string> = {
          '24h': '24H',
          '7d': '7D',
          '30d': '30D',
          '90d': '90D',
          'ytd': 'YTD',
          '1y': '1Y',
          'all': 'All Time'
        };
        const timeframeLabel = timeframeLabels[assetFilters.timeframe] || 'YTD';
        
        // If subtitle contains a timeframe pattern, replace it
        if (adjustedSubtitle && /\(.*?\)/.test(adjustedSubtitle)) {
          adjustedSubtitle = adjustedSubtitle.replace(/\(.*?\)/, `(${timeframeLabel})`);
        }
      }
      
      return (
        <div className="relative">
          {shouldApplyPropertyFilters && hasActivePropertyFilters && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                Filtered
              </Badge>
            </div>
          )}
          <ModernMetricCard
            widgetId={widget.id}
            tab={widget.tab}
            category={widget.category}
            title={widget.title}
            value={widgetProps.value || ''}
            icon={IconComponent || FallbackIcon}
            iconColor={widgetProps.iconColor}
            subtitle={adjustedSubtitle}
            badge={widgetProps.badge ? {
              ...widgetProps.badge,
              variant: widgetProps.badge.variant === 'outline' ? 'secondary' : 
                      (widgetProps.badge.variant as 'default' | 'secondary' | 'destructive' | 'success' | 'warning')
            } : undefined}
            trend={widgetProps.trend ? {
              ...widgetProps.trend,
              period: widgetProps.trend.period || 'vs last period'
            } : undefined}
            formatValue={widgetProps.formatValue}
            variant={widgetProps.variant}
            className={widgetProps.className}
            isFavorited={isFavorited}
            onToggleFavorite={() => onToggleFavorite(widget.id, widget)}
            onDelete={onDelete ? () => onDelete(widget.id) : undefined}
            showFavoriteButton={true}
          />
        </div>
      );

    case 'chart':
    case 'panel':
      // Check for specific chart types with full rendering
      if (widget.chartConfig?.chartType === 'speedometer' && 
          typeof widgetProps.value === 'number' && 
          widget.chartConfig.zones) {
        return (
          <div className="group relative">
            <div className="absolute top-2 right-2 z-10 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
              <WidgetActionsMenu
                isFavorited={isFavorited}
                onToggleFavorite={() => onToggleFavorite(widget.id, widget)}
                onDelete={onDelete ? () => onDelete(widget.id) : () => onToggleFavorite(widget.id, widget)}
              />
            </div>
            <ROISpeedometerChart
              value={widgetProps.value}
              title={widget.title}
              maxValue={widget.chartConfig.maxValue || 15}
              zones={widget.chartConfig.zones}
            />
            {widgetProps.subtitle && (
              <p className="text-sm text-muted-foreground text-center mt-2">{widgetProps.subtitle}</p>
            )}
          </div>
        );
      }
      
      // For other charts and panels, render a enhanced card with the data
      const ChartIconComponent = getIconComponent(widgetProps.icon);
      const ChartFallbackIcon = iconMap['bar-chart-3'];
      
      return (
        <div className="group relative">
          {shouldApplyPropertyFilters && hasActivePropertyFilters && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                Filtered
              </Badge>
            </div>
          )}
          <CardEnhanced className="card-hover-gold">
            <CardEnhancedContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {React.createElement(ChartIconComponent || ChartFallbackIcon, { className: "h-4 w-4" })}
                  <h3 className="font-semibold text-navy-blue">{widget.title}</h3>
                </div>
                <WidgetActionsMenu
                  isFavorited={isFavorited}
                  onToggleFavorite={() => onToggleFavorite(widget.id, widget)}
                  onDelete={onDelete ? () => onDelete(widget.id) : () => onToggleFavorite(widget.id, widget)}
                />
              </div>
              
              {widgetProps.description && (
                <p className="text-sm text-navy-blue/70 mb-3">{widgetProps.description}</p>
              )}
              
              {widgetProps.value && (
                <div className="text-2xl font-bold text-navy-blue mb-2">
                  {widgetProps.formatValue === 'currency' && typeof widgetProps.value === 'number' 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(widgetProps.value)
                    : widgetProps.formatValue === 'percentage' && typeof widgetProps.value === 'number'
                    ? `${widgetProps.value.toFixed(1)}%`
                    : widgetProps.value
                  }
                </div>
              )}
              
              {widgetProps.subtitle && (
                <p className="text-sm text-muted-foreground">{widgetProps.subtitle}</p>
              )}
              
              {widgetProps.trend && (
                <div className={`flex items-center gap-1 text-sm mt-2 ${
                  widgetProps.trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {widgetProps.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {Math.abs(widgetProps.trend.value).toFixed(1)}%
                    {widgetProps.trend.period && ` ${widgetProps.trend.period}`}
                  </span>
                </div>
              )}
              
              {widgetProps.badge && (
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    widgetProps.badge.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                    widgetProps.badge.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' :
                    widgetProps.badge.variant === 'outline' ? 'border border-input bg-background' :
                    'bg-primary text-primary-foreground'
                  }`}>
                    {widgetProps.badge.text}
                  </span>
                </div>
              )}
            </CardEnhancedContent>
          </CardEnhanced>
        </div>
      );

    default:
      return (
        <CardEnhanced className="card-hover-gold h-32 flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
          <CardEnhancedContent className="p-4 text-center">
            <div className="space-y-2">
              <Settings className="h-6 w-6 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-medium text-foreground">{widget.title}</h4>
              <p className="text-xs text-muted-foreground">Unknown widget type</p>
            </div>
          </CardEnhancedContent>
        </CardEnhanced>
      );
  }
};