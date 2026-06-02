
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Info } from 'lucide-react';
import { WidgetActionsMenu } from './WidgetActionsMenu';
import { CardEnhanced, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatPercentage } from '@/lib/formatters';
import type { SupportedCurrency } from '@/lib/currencyUtils';

interface ModernMetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  formatValue?: 'currency' | 'percentage' | 'number';
  currency?: SupportedCurrency;
  countryCode?: string;
  locale?: string;
  variant?: 'default' | 'gradient' | 'compact';
  className?: string;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default';
  };
  sparklineData?: Array<{ value: number }>;
  tooltip?: {
    description: string;
    formula?: string;
    dataRequired: string[];
    benchmark?: string;
  };
  // Favoriting functionality
  widgetId?: string;
  tab?: 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants';
  category?: string;
  isFavorited?: boolean;
  onToggleFavorite?: (widgetId: string, widgetData?: any) => void;
  onDelete?: () => void;
  showFavoriteButton?: boolean;
}

const ModernMetricCard: React.FC<ModernMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-openkey-blue',
  subtitle,
  formatValue = 'number',
  currency,
  countryCode,
  locale,
  variant = 'default',
  className = '',
  loading = false,
  trend,
  badge,
  tooltip,
  widgetId,
  tab,
  category,
  isFavorited = false,
  onToggleFavorite,
  onDelete,
  showFavoriteButton = false,
}) => {
  const formatDisplayValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (formatValue) {
      case 'currency':
        return (
          <CurrencyDisplay 
            amount={val} 
            currency={currency} 
            countryCode={countryCode} 
            locale={locale}
            variant="large"
          />
        );
      case 'percentage':
        return formatPercentage(val);
      default:
        return val.toLocaleString();
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-br from-openkey-blue/5 to-openkey-gold/5 border-openkey-blue/20';
      case 'compact':
        return 'p-4';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <CardEnhanced className={`${getVariantClasses()} ${className}`}>
        <CardEnhancedContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="w-5 h-5 bg-muted rounded"></div>
            </div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${className} relative group`}
    >
      <CardEnhanced className={`${getVariantClasses()} hover:shadow-md transition-shadow card-hover-gold relative overflow-hidden`}>
        {/* Widget Actions Menu */}
        {showFavoriteButton && widgetId && onToggleFavorite && (
          <div className="absolute top-2 right-2 z-10">
            <WidgetActionsMenu
              isFavorited={isFavorited}
              onToggleFavorite={() => {
                // Create complete widget data for favoriting
                const getIconName = (iconComponent: any): string => {
                  if (!iconComponent) return 'bar-chart-3';
                  
                  // Map common Lucide React icons to their string names
                  const iconMap: Record<string, string> = {
                    'TrendingUp': 'trending-up',
                    'DollarSign': 'dollar-sign', 
                    'Building2': 'building-2',
                    'Users': 'users',
                    'Home': 'home',
                    'Calendar': 'calendar',
                    'Percent': 'percent',
                    'Wrench': 'wrench',
                    'Receipt': 'receipt',
                    'AlertCircle': 'alert-circle',
                  };
                  
                  const iconName = iconComponent.name || iconComponent.displayName;
                  return iconMap[iconName] || 'bar-chart-3';
                };

                const widgetData = {
                  id: widgetId,
                  tab: tab || ('properties' as const),
                  category: category || 'metric',
                  title,
                  componentType: 'metric' as const,
                  widgetProps: {
                    value,
                    subtitle,
                    icon: getIconName(Icon),
                    iconColor,
                    badge,
                    trend,
                    formatValue,
                    variant,
                    className,
                  }
                };
                onToggleFavorite(widgetId, widgetData);
              }}
              onDelete={onDelete || (() => {
                // Fallback to unfavoriting if no explicit delete handler
                if (onToggleFavorite) {
                  onToggleFavorite(widgetId);
                }
              })}
            />
          </div>
        )}
        
        <CardEnhancedContent className="p-6">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${iconColor}`} />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {title}
                </h3>
                {tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{tooltip.description}</p>
                          {tooltip.formula && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Formula:</p>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{tooltip.formula}</code>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Required Data:</p>
                            <ul className="text-xs space-y-0.5">
                              {tooltip.dataRequired.map((item, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-current rounded-full"></span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {tooltip.benchmark && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Benchmark:</p>
                              <p className="text-xs">{tooltip.benchmark}</p>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {badge && (
                <Badge variant={badge.variant} className="text-xs">
                  {badge.text}
                </Badge>
              )}
            </div>

            {/* Value */}
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {formatDisplayValue(value)}
              </div>
              {trend && (
                <div className={`flex items-center text-xs ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="mr-1">
                    {trend.isPositive ? '↗' : '↘'}
                  </span>
                  {formatPercentage(trend.value)} vs {trend.period}
                </div>
              )}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    </motion.div>
  );
};

export default ModernMetricCard;
