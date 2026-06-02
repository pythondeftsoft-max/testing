import React, { useState, useEffect } from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Star, Plus, Grid3X3, BarChart3 } from 'lucide-react';
import ModernMetricCard from '@/components/analytics/ModernMetricCard';
import { useEnhancedPortfolioAnalytics } from '@/hooks/useEnhancedPortfolioAnalytics';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';

interface CustomOverviewProps {
  portfolioId: string;
  currentUserId: string;
  healthData: {
    occupancyRate: number;
    collectionRate: number;
    averageMaintenanceResolutionDays: number;
    onTimePaymentRate: number;
    openMaintenanceRequests: number;
    totalUnits: number;
  };
}

interface Widget {
  id: string;
  category: 'financial' | 'operational' | 'properties' | 'assets' | 'tenants';
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  isFavorited: boolean;
  formatValue?: 'currency' | 'percentage' | 'number';
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
}

const CustomOverview = ({ portfolioId, currentUserId, healthData }: CustomOverviewProps) => {
  const [favoriteWidgets, setFavoriteWidgets] = useState<string[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const isEverything = !portfolioId || portfolioId === 'everything';
  const { data: portfolioData } = useEnhancedPortfolioAnalytics(
    currentUserId,
    isEverything ? undefined : portfolioId
  );
  
  const { data: propertyData } = useModernPropertyAnalytics(currentUserId, portfolioId);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`portfolio-favorites-${currentUserId}`);
    if (saved) {
      setFavoriteWidgets(JSON.parse(saved));
    } else {
      // Set default favorites
      setFavoriteWidgets(['occupancy-rate', 'collection-rate', 'total-revenue', 'cap-rate']);
    }
  }, [currentUserId]);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavoriteWidgets(newFavorites);
    localStorage.setItem(`portfolio-favorites-${currentUserId}`, JSON.stringify(newFavorites));
  };

  const toggleFavorite = (widgetId: string) => {
    const newFavorites = favoriteWidgets.includes(widgetId)
      ? favoriteWidgets.filter(id => id !== widgetId)
      : [...favoriteWidgets, widgetId];
    saveFavorites(newFavorites);
  };

  // Create all available widgets
  const allWidgets: Widget[] = [
    // Financial Metrics
    {
      id: 'occupancy-rate',
      category: 'financial',
      title: 'Occupancy Rate',
      value: healthData.occupancyRate,
      formatValue: 'percentage',
      icon: BarChart3,
      isFavorited: favoriteWidgets.includes('occupancy-rate'),
      trend: { value: 2.3, isPositive: true, period: 'vs last month' }
    },
    {
      id: 'collection-rate',
      category: 'financial',
      title: 'Collection Rate',
      value: healthData.collectionRate,
      formatValue: 'percentage',
      icon: BarChart3,
      isFavorited: favoriteWidgets.includes('collection-rate'),
      trend: { value: 1.2, isPositive: true, period: 'vs last month' }
    },
    {
      id: 'total-revenue',
      category: 'financial',
      title: 'Total Revenue',
      value: portfolioData?.enhancedMetrics.totalUnits ? portfolioData?.enhancedMetrics.totalUnits * 1200 : 0,
      formatValue: 'currency',
      icon: BarChart3,
      isFavorited: favoriteWidgets.includes('total-revenue'),
      trend: { value: 8.5, isPositive: true, period: 'vs last month' }
    },
    {
      id: 'cap-rate',
      category: 'properties',
      title: 'Cap Rate',
      value: propertyData?.modernFinancialMetrics.capRate || 0,
      formatValue: 'percentage',
      icon: Grid3X3,
      isFavorited: favoriteWidgets.includes('cap-rate'),
      trend: { value: 0.3, isPositive: true, period: 'vs last quarter' }
    },
    {
      id: 'cash-on-cash',
      category: 'properties',
      title: 'Cash on Cash Return',
      value: propertyData?.modernFinancialMetrics.cashOnCashReturn || 0,
      formatValue: 'percentage',
      icon: Grid3X3,
      isFavorited: favoriteWidgets.includes('cash-on-cash'),
    },
    {
      id: 'maintenance-response',
      category: 'operational',
      title: 'Avg Maintenance Response',
      value: healthData.averageMaintenanceResolutionDays,
      subtitle: 'days',
      icon: Settings,
      isFavorited: favoriteWidgets.includes('maintenance-response'),
    },
    {
      id: 'total-units',
      category: 'operational',
      title: 'Total Units',
      value: healthData.totalUnits,
      icon: Grid3X3,
      isFavorited: favoriteWidgets.includes('total-units'),
    },
    {
      id: 'open-maintenance',
      category: 'operational',
      title: 'Open Maintenance Requests',
      value: healthData.openMaintenanceRequests,
      icon: Settings,
      isFavorited: favoriteWidgets.includes('open-maintenance'),
    }
  ];

  const favoriteWidgetsList = allWidgets.filter(widget => widget.isFavorited);
  const widgetsByCategory = (category: string) => 
    allWidgets.filter(widget => widget.category === category);

  const renderWidgetGrid = (widgets: Widget[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {widgets.map((widget) => (
        <div key={widget.id} className="relative group">
          <ModernMetricCard
            title={widget.title}
            value={widget.value}
            subtitle={widget.subtitle}
            icon={widget.icon}
            formatValue={widget.formatValue}
            trend={widget.trend}
            variant="default"
            className="h-full"
          />
          {isCustomizing && (
            <Button
              size="sm"
              variant={widget.isFavorited ? "default" : "outline"}
              className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => toggleFavorite(widget.id)}
            >
              <Star className={`h-3 w-3 ${widget.isFavorited ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Your Favorite Analytics */}
      <section>
        <CardEnhanced variant="premium" className="border-0 shadow-md">
          <CardEnhancedHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardEnhancedTitle className="text-xl font-semibold">Your Favorite Analytics</CardEnhancedTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your personalized dashboard with most important metrics
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isCustomizing ? "default" : "secondary"} className="text-xs">
                  {favoriteWidgetsList.length} Favorites
                </Badge>
                <Button
                  variant={isCustomizing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {isCustomizing ? 'Done' : 'Customize'}
                </Button>
              </div>
            </div>
          </CardEnhancedHeader>

          <CardEnhancedContent className="pt-0">
            {favoriteWidgetsList.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Favorites Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Customize" to select your favorite metrics from the sections below
                </p>
                <Button onClick={() => setIsCustomizing(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Favorites
                </Button>
              </div>
            ) : (
              renderWidgetGrid(favoriteWidgetsList)
            )}
          </CardEnhancedContent>
        </CardEnhanced>
      </section>

      {/* Core Portfolio Metrics */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Metrics
          </h2>
          <p className="text-sm text-muted-foreground">
            Key financial performance indicators for your portfolio
          </p>
        </div>
        {renderWidgetGrid(widgetsByCategory('financial'))}
      </section>

      {/* Operational Excellence */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operational Metrics
          </h2>
          <p className="text-sm text-muted-foreground">
            Operational efficiency and management performance
          </p>
        </div>
        {renderWidgetGrid(widgetsByCategory('operational'))}
      </section>

      {/* Property Analytics */}
      <section className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Property Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Property-specific performance and investment metrics
          </p>
        </div>
        {renderWidgetGrid(widgetsByCategory('properties'))}
      </section>
    </div>
  );
};

export default CustomOverview;