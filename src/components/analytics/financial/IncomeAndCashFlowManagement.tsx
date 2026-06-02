import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart } from 'recharts';
import { usePortfolioCashFlow } from '@/hooks/usePortfolioFinancialData';
import { format, subMonths, startOfMonth } from 'date-fns';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { generateMockCashFlowData, getRandomScenario, getScenarioByIndex } from '@/utils/mockFinancialReports';
import { FinancialWidgetWrapper } from '../wrappers/FinancialWidgetWrapper';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';
import { DynamicWidget } from '../widgets/DynamicWidget';
import { WidgetState } from '@/hooks/useFinancialWidgetState';
import { WidgetType } from '../GenerateMoreWidgetsButton';
import { AdvancedWidgetRenderer } from '../widgets/AdvancedWidgetRenderer';

interface IncomeAndCashFlowManagementProps {
  landlordId: string;
  portfolioId: string;
  filters?: {
    startDate: string;
    endDate: string;
    propertyIds: string[];
    propertyTypes: string[];
    categories: {
      rent: boolean;
      fees: boolean;
      maintenance: boolean;
      insurance: boolean;
      taxes: boolean;
      management: boolean;
      other: boolean;
    };
  };
  // Widget management props
  isFavorited: (widgetId: string) => boolean;
  onToggleFavorite: (widgetId: string, widgetData?: FavoriteWidget) => void;
  isWidgetVisible: (widgetId: string) => boolean;
  onDeleteWidget: (widgetId: string) => void;
  onRegenerateWidget: (widgetId: string) => void;
  getRegenerationCount: (widgetId: string) => number;
  getDynamicWidgets: (category: string) => Array<{ id: string; state: WidgetState }>;
}

export const IncomeAndCashFlowManagement: React.FC<IncomeAndCashFlowManagementProps> = ({
  landlordId,
  portfolioId,
  filters,
  isFavorited,
  onToggleFavorite,
  isWidgetVisible,
  onDeleteWidget,
  onRegenerateWidget,
  getRegenerationCount,
  getDynamicWidgets,
}) => {
  // State to store widget data for favorites
  const [widgetDataMap, setWidgetDataMap] = React.useState<Record<string, {
    value?: string | number;
    subtitle?: string;
    icon?: string;
    trend?: { value: number; isPositive: boolean };
    formatValue?: 'currency' | 'percentage' | 'number';
  }>>({});

  // Handler for when widget data is ready
  const handleWidgetDataReady = (widgetId: string, data: {
    value?: string | number;
    subtitle?: string;
    icon?: string;
    trend?: { value: number; isPositive: boolean };
    formatValue?: 'currency' | 'percentage' | 'number';
  }) => {
    setWidgetDataMap(prev => ({
      ...prev,
      [widgetId]: data
    }));
  };
  // Use custom dates from filters if provided, otherwise use default 12-month range
  const endDate = useMemo(() => 
    filters?.endDate || format(new Date(), 'yyyy-MM-dd'), 
    [filters?.endDate]
  );
  const startDate = useMemo(() => 
    filters?.startDate || format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd'), 
    [filters?.startDate]
  );

  const { data: cashFlowData, isLoading, error } = usePortfolioCashFlow(portfolioId, startDate, endDate);
  
  // Generate mock data when real data is unavailable (with regeneration cycling)
  const mockData = useMemo(() => {
    const regenerations = ['avg-monthly-operating', 'avg-monthly-net', 'operating-change', 'total-operating'].reduce((acc, id) => {
      return Math.max(acc, getRegenerationCount(id));
    }, 0);
    const scenarioIndex = regenerations % 8;
    const scenarios = ['high-performing', 'average', 'struggling', 'growing', 'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'];
    return generateMockCashFlowData(scenarios[scenarioIndex] as any);
  }, [getRegenerationCount]);
  
  const effectiveData = cashFlowData || (error ? mockData : null);

  const chartData = useMemo(() => {
    if (!effectiveData || !Array.isArray(effectiveData) || effectiveData.length === 0) return [];
    
    return effectiveData.map((item) => ({
      month: format(new Date(item.date), 'MMM'),
      operating: item.operating_cash_flow || 0,
      investing: item.investing_cash_flow || 0,
      financing: item.financing_cash_flow || 0,
      net: (item.operating_cash_flow || 0) + (item.investing_cash_flow || 0) + (item.financing_cash_flow || 0),
    }));
  }, [effectiveData]);

  const currentMonthData = useMemo(() => {
    if (!effectiveData || !Array.isArray(effectiveData) || effectiveData.length === 0) return null;
    
    const latest = effectiveData[effectiveData.length - 1];
    
    const grossRent = latest.gross_rent || 0;
    const expenses = [
      { name: 'Maintenance', amount: Math.abs(latest.maintenance_expenses || 0) },
      { name: 'Insurance', amount: Math.abs(latest.insurance_expenses || 0) },
      { name: 'Taxes', amount: Math.abs(latest.tax_expenses || 0) },
      { name: 'Management', amount: Math.abs(latest.management_fees || 0) },
      { name: 'Other', amount: Math.abs(latest.other_expenses || 0) },
    ].filter(expense => expense.amount > 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netOperatingIncome = grossRent - totalExpenses;

    return {
      grossRent,
      expenses,
      totalExpenses,
      netOperatingIncome,
      operatingCashFlow: latest.operating_cash_flow || 0,
    };
  }, [effectiveData]);

  const summaryMetrics = useMemo(() => {
    if (!chartData.length) return null;

    const totalOperating = chartData.reduce((sum, item) => sum + item.operating, 0);
    const totalNet = chartData.reduce((sum, item) => sum + item.net, 0);
    const avgMonthlyOperating = totalOperating / chartData.length;
    const avgMonthlyNet = totalNet / chartData.length;

    // Calculate month-over-month change for operating cash flow
    const currentMonth = chartData[chartData.length - 1]?.operating || 0;
    const previousMonth = chartData[chartData.length - 2]?.operating || 0;
    const operatingChange = previousMonth !== 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

    return {
      totalOperating,
      totalNet,
      avgMonthlyOperating,
      avgMonthlyNet,
      operatingChange,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <MetricSkeleton />
          </Card>
        ))}
      </div>
    );
  }

  if (error && !mockData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load cash flow data</span>
        </div>
      </Card>
    );
  }

  if (!chartData.length && !currentMonthData) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No cash flow data available</p>
        </div>
      </Card>
    );
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <DollarSign className="w-4 h-4 text-muted-foreground" />;
  };

  const AvgMonthlyOperatingWidget = () => {
    if (!isWidgetVisible('avg-monthly-operating')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="avg-monthly-operating"
        title="Avg Monthly Operating"
        tab="financial"
        category="income"
        isFavorited={isFavorited('avg-monthly-operating')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        showHeader={false}
        value={summaryMetrics?.avgMonthlyOperating}
        formatValue="currency"
        iconName="DollarSign"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-openkey-blue/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-openkey-blue" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Monthly Operating</p>
            <p className="text-xl font-bold text-foreground">
              ${summaryMetrics?.avgMonthlyOperating.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const AvgMonthlyNetWidget = () => {
    if (!isWidgetVisible('avg-monthly-net')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="avg-monthly-net"
        title="Avg Monthly Net"
        tab="financial"
        category="income"
        isFavorited={isFavorited('avg-monthly-net')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        showHeader={false}
        value={summaryMetrics?.avgMonthlyNet}
        formatValue="currency"
        iconName="TrendingUp"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Monthly Net</p>
            <p className="text-xl font-bold text-foreground">
              ${summaryMetrics?.avgMonthlyNet.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const OperatingChangeWidget = () => {
    if (!isWidgetVisible('operating-change')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="operating-change"
        title="Operating Change"
        tab="financial"
        category="income"
        isFavorited={isFavorited('operating-change')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        showHeader={false}
        value={summaryMetrics?.operatingChange}
        formatValue="percentage"
        iconName="ArrowUpRight"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <ArrowUpRight className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Operating Change</p>
            <div className="flex items-center gap-1">
              {getTrendIcon(summaryMetrics?.operatingChange || 0)}
              <p className={`text-xl font-bold ${(summaryMetrics?.operatingChange || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {(summaryMetrics?.operatingChange || 0) > 0 ? '+' : ''}{(summaryMetrics?.operatingChange || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const TotalOperatingWidget = () => {
    if (!isWidgetVisible('total-operating')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-operating"
        title="Total Operating (12mo)"
        tab="financial"
        category="income"
        isFavorited={isFavorited('total-operating')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        showHeader={false}
        value={summaryMetrics?.totalOperating}
        formatValue="currency"
        iconName="ArrowDownRight"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info/10 rounded-lg">
            <ArrowDownRight className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Operating (12mo)</p>
            <p className="text-xl font-bold text-foreground">
              ${summaryMetrics?.totalOperating.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const CurrentMonthWaterfallWidget = () => {
    if (!isWidgetVisible('current-month-waterfall') || !currentMonthData) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="current-month-waterfall"
        title="Current Month Cash Flow"
        tab="financial"
        category="income"
        isFavorited={isFavorited('current-month-waterfall')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="panel"
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
            <span className="font-medium text-foreground">Gross Rent</span>
            <span className="font-bold text-success">+${currentMonthData.grossRent.toLocaleString()}</span>
          </div>
          
          {currentMonthData.expenses.map((expense, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-destructive/5 rounded">
              <span className="text-sm text-muted-foreground">{expense.name}</span>
              <span className="text-sm text-destructive">-${expense.amount.toLocaleString()}</span>
            </div>
          ))}
          
          <div className="border-t pt-3">
            <div className="flex justify-between items-center p-3 bg-openkey-blue/10 rounded-lg">
              <span className="font-medium text-foreground">Net Operating Income</span>
              <span className={`font-bold ${currentMonthData.netOperatingIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${currentMonthData.netOperatingIncome.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
            <span className="font-medium text-foreground">Operating Cash Flow</span>
            <span className={`font-bold ${currentMonthData.operatingCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${currentMonthData.operatingCashFlow.toLocaleString()}
            </span>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const CashFlowTrendsWidget = () => {
    if (!isWidgetVisible('cash-flow-trends') || !chartData.length) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="cash-flow-trends"
        title="12-Month Cash Flow Trends"
        tab="financial"
        category="income"
        isFavorited={isFavorited('cash-flow-trends')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name === 'operating' ? 'Operating' :
                name === 'investing' ? 'Investing' :
                name === 'financing' ? 'Financing' : 'Net Cash Flow'
              ]}
            />
            <Legend />
            <Bar 
              dataKey="operating" 
              fill="hsl(var(--openkey-blue))" 
              name="Operating"
            />
            <Bar 
              dataKey="investing" 
              fill="hsl(var(--warning))" 
              name="Investing"
            />
            <Bar 
              dataKey="financing" 
              fill="hsl(var(--info))" 
              name="Financing"
            />
            <Line 
              type="monotone" 
              dataKey="net" 
              stroke="hsl(var(--success))" 
              strokeWidth={3}
              name="Net Cash Flow"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </FinancialWidgetWrapper>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AvgMonthlyOperatingWidget />
          <AvgMonthlyNetWidget />
          <OperatingChangeWidget />
          <TotalOperatingWidget />
        </div>
      )}

      {/* Additional Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Render new metric widgets */}
        {isWidgetVisible('rental-income-velocity') && (
          <FinancialWidgetWrapper
            widgetId="rental-income-velocity"
            title="Rental Income Velocity"
            tab="financial"
            category="income"
            isFavorited={isFavorited('rental-income-velocity')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="metric"
            showHeader={false}
            value={widgetDataMap['rental-income-velocity']?.value}
            subtitle={widgetDataMap['rental-income-velocity']?.subtitle}
            iconName={widgetDataMap['rental-income-velocity']?.icon}
            formatValue={widgetDataMap['rental-income-velocity']?.formatValue}
            trend={widgetDataMap['rental-income-velocity']?.trend}
          >
            <AdvancedWidgetRenderer
              widgetType="rental-income-velocity"
              category="income"
              title="Rental Income Velocity"
              description="Rate of rental income growth month-over-month"
              componentType="metric"
              regenerationCount={getRegenerationCount('rental-income-velocity')}
              onDataReady={(data) => handleWidgetDataReady('rental-income-velocity', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('collection-rate') && (
          <FinancialWidgetWrapper
            widgetId="collection-rate"
            title="Collection Rate"
            tab="financial"
            category="income"
            isFavorited={isFavorited('collection-rate')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="metric"
            showHeader={false}
            value={widgetDataMap['collection-rate']?.value}
            subtitle={widgetDataMap['collection-rate']?.subtitle}
            iconName={widgetDataMap['collection-rate']?.icon}
            formatValue={widgetDataMap['collection-rate']?.formatValue}
            trend={widgetDataMap['collection-rate']?.trend}
          >
            <AdvancedWidgetRenderer
              widgetType="collection-rate"
              category="income"
              title="Collection Rate"
              description="Percentage of rent collected on time"
              componentType="metric"
              regenerationCount={getRegenerationCount('collection-rate')}
              onDataReady={(data) => handleWidgetDataReady('collection-rate', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('gross-rent-multiplier') && (
          <FinancialWidgetWrapper
            widgetId="gross-rent-multiplier"
            title="Gross Rent Multiplier"
            tab="financial"
            category="income"
            isFavorited={isFavorited('gross-rent-multiplier')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="metric"
            showHeader={false}
            value={widgetDataMap['gross-rent-multiplier']?.value}
            subtitle={widgetDataMap['gross-rent-multiplier']?.subtitle}
            iconName={widgetDataMap['gross-rent-multiplier']?.icon}
            formatValue={widgetDataMap['gross-rent-multiplier']?.formatValue}
            trend={widgetDataMap['gross-rent-multiplier']?.trend}
          >
            <AdvancedWidgetRenderer
              widgetType="gross-rent-multiplier"
              category="income"
              title="Gross Rent Multiplier"
              description="Property value divided by annual rent"
              componentType="metric"
              regenerationCount={getRegenerationCount('gross-rent-multiplier')}
              onDataReady={(data) => handleWidgetDataReady('gross-rent-multiplier', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('income-per-unit') && (
          <FinancialWidgetWrapper
            widgetId="income-per-unit"
            title="Income Per Unit"
            tab="financial"
            category="income"
            isFavorited={isFavorited('income-per-unit')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="metric"
            showHeader={false}
            value={widgetDataMap['income-per-unit']?.value}
            subtitle={widgetDataMap['income-per-unit']?.subtitle}
            iconName={widgetDataMap['income-per-unit']?.icon}
            formatValue={widgetDataMap['income-per-unit']?.formatValue}
            trend={widgetDataMap['income-per-unit']?.trend}
          >
            <AdvancedWidgetRenderer
              widgetType="income-per-unit"
              category="income"
              title="Income Per Unit"
              description="Average monthly income per rental unit"
              componentType="metric"
              regenerationCount={getRegenerationCount('income-per-unit')}
              onDataReady={(data) => handleWidgetDataReady('income-per-unit', data)}
            />
          </FinancialWidgetWrapper>
        )}
      </div>

      {/* Charts & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentMonthWaterfallWidget />
        <CashFlowTrendsWidget />

        {/* New Advanced Chart Widgets */}
        {isWidgetVisible('rental-income-trends') && (
          <FinancialWidgetWrapper
            widgetId="rental-income-trends"
            title="Rental Income Trends"
            tab="financial"
            category="income"
            isFavorited={isFavorited('rental-income-trends')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="rental-income-trends"
              category="income"
              title="Rental Income Trends"
              description="Monthly rental income patterns and growth analysis"
              componentType="chart"
              regenerationCount={getRegenerationCount('rental-income-trends')}
              onDataReady={(data) => handleWidgetDataReady('rental-income-trends', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('seasonal-income-patterns') && (
          <FinancialWidgetWrapper
            widgetId="seasonal-income-patterns"
            title="Seasonal Income Patterns"
            tab="financial"
            category="income"
            isFavorited={isFavorited('seasonal-income-patterns')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="seasonal-income-patterns"
              category="income"
              title="Seasonal Income Patterns"
              description="Identify seasonal trends in rental income across properties"
              componentType="chart"
              regenerationCount={getRegenerationCount('seasonal-income-patterns')}
              onDataReady={(data) => handleWidgetDataReady('seasonal-income-patterns', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('income-source-breakdown') && (
          <FinancialWidgetWrapper
            widgetId="income-source-breakdown"
            title="Income Source Breakdown"
            tab="financial"
            category="income"
            isFavorited={isFavorited('income-source-breakdown')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="income-source-breakdown"
              category="income"
              title="Income Source Breakdown"
              description="Pie chart showing breakdown by income source type"
              componentType="chart"
              regenerationCount={getRegenerationCount('income-source-breakdown')}
              onDataReady={(data) => handleWidgetDataReady('income-source-breakdown', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('cash-flow-forecasting') && (
          <FinancialWidgetWrapper
            widgetId="cash-flow-forecasting"
            title="Cash Flow Forecasting"
            tab="financial"
            category="income"
            isFavorited={isFavorited('cash-flow-forecasting')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="cash-flow-forecasting"
              category="income"
              title="Cash Flow Forecasting"
              description="Predictive analytics for future cash flow projections"
              componentType="chart"
              regenerationCount={getRegenerationCount('cash-flow-forecasting')}
              onDataReady={(data) => handleWidgetDataReady('cash-flow-forecasting', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('rent-roll-timeline') && (
          <FinancialWidgetWrapper
            widgetId="rent-roll-timeline"
            title="Rent Roll Timeline"
            tab="financial"
            category="income"
            isFavorited={isFavorited('rent-roll-timeline')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="rent-roll-timeline"
              category="income"
              title="Rent Roll Timeline"
              description="Timeline view of rent collections and payment patterns"
              componentType="chart"
              regenerationCount={getRegenerationCount('rent-roll-timeline')}
              onDataReady={(data) => handleWidgetDataReady('rent-roll-timeline', data)}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('property-income-comparison') && (
          <FinancialWidgetWrapper
            widgetId="property-income-comparison"
            title="Property Income Comparison"
            tab="financial"
            category="income"
            isFavorited={isFavorited('property-income-comparison')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="property-income-comparison"
              category="income"
              title="Property Income Comparison"
              description="Compare income performance across different properties"
              componentType="chart"
              regenerationCount={getRegenerationCount('property-income-comparison')}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('market-vs-actual-rent') && (
          <FinancialWidgetWrapper
            widgetId="market-vs-actual-rent"
            title="Market vs Actual Rent"
            tab="financial"
            category="income"
            isFavorited={isFavorited('market-vs-actual-rent')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="chart"
          >
            <AdvancedWidgetRenderer
              widgetType="market-vs-actual-rent"
              category="income"
              title="Market vs Actual Rent"
              description="Compare your rents against market rates"
              componentType="chart"
              regenerationCount={getRegenerationCount('market-vs-actual-rent')}
            />
          </FinancialWidgetWrapper>
        )}
      </div>

      {/* Analysis Panels Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isWidgetVisible('vacancy-impact-analysis') && (
          <FinancialWidgetWrapper
            widgetId="vacancy-impact-analysis"
            title="Vacancy Impact Analysis"
            tab="financial"
            category="income"
            isFavorited={isFavorited('vacancy-impact-analysis')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="panel"
          >
            <AdvancedWidgetRenderer
              widgetType="vacancy-impact-analysis"
              category="income"
              title="Vacancy Impact Analysis"
              description="Analyze how vacancy rates affect cash flow performance"
              componentType="panel"
              regenerationCount={getRegenerationCount('vacancy-impact-analysis')}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('market-rent-analyzer') && (
          <FinancialWidgetWrapper
            widgetId="market-rent-analyzer"
            title="Market Rent Analyzer"
            tab="financial"
            category="income"
            isFavorited={isFavorited('market-rent-analyzer')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="panel"
          >
            <AdvancedWidgetRenderer
              widgetType="market-rent-analyzer"
              category="income"
              title="Market Rent Analyzer"
              description="Compare current rents with market rates for optimization"
              componentType="panel"
              regenerationCount={getRegenerationCount('market-rent-analyzer')}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('rent-roll-summary') && (
          <FinancialWidgetWrapper
            widgetId="rent-roll-summary"
            title="Rent Roll Summary"
            tab="financial"
            category="income"
            isFavorited={isFavorited('rent-roll-summary')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="panel"
          >
            <AdvancedWidgetRenderer
              widgetType="rent-roll-summary"
              category="income"
              title="Rent Roll Summary"
              description="Comprehensive overview of rent collection patterns"
              componentType="panel"
              regenerationCount={getRegenerationCount('rent-roll-summary')}
            />
          </FinancialWidgetWrapper>
        )}

        {isWidgetVisible('income-optimization-suggestions') && (
          <FinancialWidgetWrapper
            widgetId="income-optimization-suggestions"
            title="Income Optimization Suggestions"
            tab="financial"
            category="income"
            isFavorited={isFavorited('income-optimization-suggestions')}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteWidget}
            onRegenerate={onRegenerateWidget}
            componentType="panel"
          >
            <AdvancedWidgetRenderer
              widgetType="income-optimization-suggestions"
              category="income"
              title="Income Optimization Suggestions"
              description="AI-powered suggestions for maximizing rental income"
              componentType="panel"
              regenerationCount={getRegenerationCount('income-optimization-suggestions')}
            />
          </FinancialWidgetWrapper>
        )}
      </div>
    </div>
  );
};