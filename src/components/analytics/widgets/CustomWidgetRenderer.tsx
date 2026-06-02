import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  DollarSign, 
  Wrench, 
  Users, 
  Building, 
  AlertCircle, 
  Brain,
  Gauge,
  Activity,
  BarChart3,
  TrendingUp,
  PieChart,
  CalendarDays,
  Target,
  Building2,
  Receipt,
  Coins,
  Scale
} from 'lucide-react';
import { type CustomWidget } from './AddWidgetModal';
import { WidgetActionsMenu } from '../WidgetActionsMenu';
import { IndividualAssetCard } from './IndividualAssetCard';
import { TotalNetWorthCard } from './TotalNetWorthCard';
import { TotalCashFlowCard } from './TotalCashFlowCard';
import { OverallROICard } from './OverallROICard';
import { UnifiedAssetAllocationChart } from './UnifiedAssetAllocationChart';
import { IncomeSourcesChart } from './IncomeSourcesChart';
import { ExpenseCategoriesChart } from './ExpenseCategoriesChart';
import { PropertiesVsAssetsChart } from './PropertiesVsAssetsChart';
import { ROIComparisonChart } from './ROIComparisonChart';
import { AnnualProjectedIncomeCard } from './AnnualProjectedIncomeCard';
import { PortfolioDiversityScoreCard } from './PortfolioDiversityScoreCard';
import { TotalHoldingsCountCard } from './TotalHoldingsCountCard';
import { TotalMonthlyIncomeCard } from './TotalMonthlyIncomeCard';
import { TotalMonthlyExpensesCard } from './TotalMonthlyExpensesCard';
import { TotalPropertyValueCard } from './TotalPropertyValueCard';
import { TotalAssetValueCard } from './TotalAssetValueCard';
import { NetMonthlyCashFlowCard } from './NetMonthlyCashFlowCard';
import { PropertyROICard } from './PropertyROICard';
import { AssetROICard } from './AssetROICard';
import { IncomeExpenseRatioCard } from './IncomeExpenseRatioCard';
import { useAuth } from '@/hooks/useAuth';

const iconMap = {
  Home,
  DollarSign,
  Wrench,
  Users,
  Building,
  AlertCircle,
  Brain,
  Gauge,
  Activity,
  BarChart3,
  TrendingUp,
  PieChart,
  CalendarDays,
  Target,
  Building2,
  Receipt,
  Coins,
  Scale
};

interface CustomWidgetRendererProps {
  widget: CustomWidget;
  onRemove?: (widgetId: string) => void;
  onToggleFavorite?: (widgetId: string) => void;
  isFavorited?: boolean;
  isPreview?: boolean;
}

export const CustomWidgetRenderer: React.FC<CustomWidgetRendererProps> = ({
  widget,
  onRemove,
  onToggleFavorite,
  isFavorited = false,
  isPreview = false
}) => {
  const { user } = useAuth();
  const getIcon = (iconName: string) => {
    const size = widget.size === 'small' ? 'h-4 w-4' : widget.size === 'large' ? 'h-6 w-6' : 'h-5 w-5';
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className={size} /> : null;
  };

  const getSizeClasses = () => {
    switch (widget.size) {
      case 'small':
        return 'w-full max-w-[200px] min-h-[120px]';
      case 'medium':
        return 'w-full min-h-[180px]';
      case 'large':
        return 'w-full min-h-[400px]';
      case 'full-width':
        return 'w-full min-h-[200px]';
      default:
        return 'w-full min-h-[180px]';
    }
  };

  const getContentClasses = () => {
    switch (widget.size) {
      case 'small':
        return 'text-xs p-1';
      case 'medium':
        return 'text-sm p-2';
      case 'large':
        return 'text-base p-4';
      case 'full-width':
        return 'text-sm p-3';
      default:
        return 'text-sm p-2';
    }
  };

  const renderWidgetContent = () => {
    switch (widget.config.component) {
      case 'TotalNetWorthCard':
        return (
          <TotalNetWorthCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalCashFlowCard':
        return (
          <TotalCashFlowCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'OverallROICard':
        return (
          <OverallROICard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'UnifiedAssetAllocationChart':
        return (
          <UnifiedAssetAllocationChart 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'IncomeSourcesChart':
        return (
          <IncomeSourcesChart 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'ExpenseCategoriesChart':
        return (
          <ExpenseCategoriesChart 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'PropertiesVsAssetsChart':
        return (
          <PropertiesVsAssetsChart 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'ROIComparisonChart':
        return (
          <ROIComparisonChart 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'AnnualProjectedIncomeCard':
        return (
          <AnnualProjectedIncomeCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'PortfolioDiversityScoreCard':
        return (
          <PortfolioDiversityScoreCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalHoldingsCountCard':
        return (
          <TotalHoldingsCountCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalMonthlyIncomeCard':
        return (
          <TotalMonthlyIncomeCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalMonthlyExpensesCard':
        return (
          <TotalMonthlyExpensesCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalPropertyValueCard':
        return (
          <TotalPropertyValueCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'TotalAssetValueCard':
        return (
          <TotalAssetValueCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'NetMonthlyCashFlowCard':
        return (
          <NetMonthlyCashFlowCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'PropertyROICard':
        return (
          <PropertyROICard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'AssetROICard':
        return (
          <AssetROICard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'IncomeExpenseRatioCard':
        return (
          <IncomeExpenseRatioCard 
            landlordId={user?.id || ''} 
            portfolioId={widget.config.defaultProps?.portfolioId}
            userId={user?.id}
          />
        );
        
      case 'IndividualAssetCard':
        if (widget.config.assetData) {
          return (
            <IndividualAssetCard
              assetData={widget.config.assetData}
              onRemove={onRemove}
              onToggleFavorite={onToggleFavorite}
              isFavorited={isFavorited}
              isPreview={isPreview}
              widgetId={widget.id}
            />
          );
        }
        return (
          <div className="p-6 text-center text-muted-foreground">
            <div className="text-sm">Asset data not available</div>
          </div>
        );

      case 'PremiumD3Gauge':
        return (
          <div className="flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-openkey-blue mb-2">85%</div>
              <div className="text-sm text-muted-foreground">Portfolio Health</div>
            </div>
          </div>
        );

      case 'InteractiveMetricCard':
        return (
          <div className={widget.size === 'small' ? 'p-1' : 'p-4'}>
            {widget.size !== 'small' && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{widget.name}</span>
                {getIcon(widget.config.icon)}
              </div>
            )}
            <div className={`font-bold text-openkey-blue ${
              widget.size === 'small' ? 'text-lg mb-0' : 'text-2xl mb-1'
            }`}>
              {widget.widgetId === 'occupancy-metric' ? '87%' : 
               widget.widgetId === 'financial-metric' ? '94%' :
               widget.widgetId === 'maintenance-metric' ? '3 days' : '91%'}
            </div>
            {widget.size !== 'small' && (
              <div className="text-sm text-green-600">+8.5% from last month</div>
            )}
          </div>
        );

      case 'QuickStatCard':
        return (
          <div className={`text-center ${widget.size === 'small' ? 'p-1' : 'p-6'}`}>
            {widget.size !== 'small' && (
              <div className="flex justify-center mb-3">
                {getIcon(widget.config.icon)}
              </div>
            )}
            <div className={`font-bold text-openkey-blue ${
              widget.size === 'small' ? 'text-xl mb-0' : 'text-3xl mb-1'
            }`}>
              {widget.widgetId === 'total-units-stat' ? '156' : '7'}
            </div>
            {widget.size !== 'small' && (
              <div className="text-sm text-muted-foreground">
                {widget.name}
              </div>
            )}
          </div>
        );

      case 'ComparativeAnalysisPanel':
        return (
          <div className="p-6">
            <div className="text-center mb-4">
              <h4 className="font-semibold text-openkey-blue">Performance vs Market</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Your Portfolio</span>
                <Badge variant="default">Above Average</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-openkey-blue h-2 rounded-full w-3/4"></div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Comparing occupancy, revenue, and efficiency metrics
              </div>
            </div>
          </div>
        );

      case 'RealPredictiveInsightsPanel':
        return (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-openkey-blue" />
              <h4 className="font-semibold text-openkey-blue">AI Insights</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-openkey-blue">
                <div className="text-sm font-medium">Vacancy Risk Alert</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Property A123 shows 23% higher vacancy risk next quarter
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="text-sm font-medium">Opportunity Detected</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Market rent could increase by $150 for Unit B456
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-6 text-center text-muted-foreground">
            <div className="text-4xl mb-2">{getIcon(widget.config.icon)}</div>
            <div className="font-medium">{widget.name}</div>
            <div className="text-sm mt-1">{widget.description}</div>
          </div>
        );
    }
  };

  return (
    <Card className={`bg-white border-openkey-blue/20 hover:shadow-md transition-shadow relative h-full ${getSizeClasses()}`}>
      {!isPreview && (onRemove || onToggleFavorite) && (
        <div className="absolute top-2 right-2 z-10">
          <WidgetActionsMenu
            isFavorited={isFavorited}
            onToggleFavorite={() => onToggleFavorite?.(widget.id)}
            onDelete={() => onRemove?.(widget.id)}
          />
        </div>
      )}
      
      <CardHeader className={widget.size === 'small' ? 'pb-1 p-2' : 'pb-2'}>
        <CardTitle className={`flex items-center gap-2 text-openkey-blue pr-8 ${
          widget.size === 'small' ? 'text-xs font-medium' : 
          widget.size === 'large' ? 'text-lg' : 'text-base'
        }`}>
          {getIcon(widget.config.icon)}
          {widget.size === 'small' ? '' : widget.name}
        </CardTitle>
        {widget.description && widget.size !== 'small' && (
          <div className={`text-muted-foreground ${getContentClasses()}`}>
            {widget.description}
          </div>
        )}
      </CardHeader>
      
      <CardContent className={`flex-1 ${getContentClasses()}`}>
        {renderWidgetContent()}
      </CardContent>
    </Card>
  );
};