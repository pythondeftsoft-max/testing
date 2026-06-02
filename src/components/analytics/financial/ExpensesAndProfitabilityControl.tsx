import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { usePortfolioProfitLoss } from '@/hooks/usePortfolioFinancialData';
import { usePortfolioProperties } from '@/hooks/usePortfolioFinancialData';
import { format, subMonths, startOfMonth } from 'date-fns';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, TrendingUp, TrendingDown, Minus, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { generateMockProfitLossData, generateMockPropertiesData, getRandomScenario } from '@/utils/mockFinancialReports';
import { FinancialWidgetWrapper } from '../wrappers/FinancialWidgetWrapper';
import { FavoriteWidget } from '@/hooks/useWidgetFavorites';

interface ExpensesAndProfitabilityControlProps {
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
}

export const ExpensesAndProfitabilityControl: React.FC<ExpensesAndProfitabilityControlProps> = ({
  landlordId,
  portfolioId,
  filters,
  isFavorited,
  onToggleFavorite,
  isWidgetVisible,
  onDeleteWidget,
  onRegenerateWidget,
  getRegenerationCount,
}) => {
  // Use custom dates from filters if provided, otherwise use default 12-month range
  const endDate = useMemo(() => 
    filters?.endDate || format(new Date(), 'yyyy-MM-dd'), 
    [filters?.endDate]
  );
  const startDate = useMemo(() => 
    filters?.startDate || format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd'), 
    [filters?.startDate]
  );

  const { data: profitLossData, isLoading: plLoading, error: plError } = usePortfolioProfitLoss(portfolioId, startDate, endDate);
  const { data: propertiesData, isLoading: propLoading } = usePortfolioProperties(portfolioId);

  // Generate mock data when real data is unavailable (with regeneration cycling)
  const mockPLData = useMemo(() => {
    const regenerations = getRegenerationCount('profit-margin');
    const scenarioIndex = regenerations % 8;
    const scenarios = ['high-performing', 'average', 'struggling', 'growing', 'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'];
    return generateMockProfitLossData(scenarios[scenarioIndex] as any);
  }, [getRegenerationCount]);
  
  const mockPropsData = useMemo(() => {
    const regenerations = getRegenerationCount('profit-margin');
    const scenarioIndex = regenerations % 8;
    const scenarios = ['high-performing', 'average', 'struggling', 'growing', 'seasonal', 'large-portfolio', 'small-portfolio', 'mixed-portfolio'];
    return generateMockPropertiesData(scenarios[scenarioIndex] as any);
  }, [getRegenerationCount]);
  
  const effectivePLData = profitLossData || (plError ? mockPLData : null);
  const effectivePropsData = propertiesData || mockPropsData;

  const isLoading = plLoading || propLoading;
  const error = plError;

  const analysisData = useMemo(() => {
    if (!effectivePLData || !Array.isArray(effectivePLData) || effectivePLData.length === 0 || !effectivePropsData?.length) return null;

    // Calculate monthly trends
    const monthlyTrends = effectivePLData.map((item) => ({
      month: format(new Date(item.date), 'MMM yy'),
      revenue: item.total_revenue || 0,
      expenses: Math.abs(item.total_expenses || 0),
      noi: (item.total_revenue || 0) - Math.abs(item.total_expenses || 0),
      margin: item.total_revenue > 0 ? (((item.total_revenue || 0) - Math.abs(item.total_expenses || 0)) / item.total_revenue) * 100 : 0,
    }));

    // Calculate expense breakdown from latest month
    const latestMonth = effectivePLData[effectivePLData.length - 1];
    const expenseBreakdown = [
      { name: 'Maintenance', value: Math.abs(latestMonth.maintenance_expenses || 0), color: 'hsl(var(--destructive))' },
      { name: 'Management', value: Math.abs(latestMonth.management_fees || 0), color: 'hsl(var(--warning))' },
      { name: 'Insurance', value: Math.abs(latestMonth.insurance_expenses || 0), color: 'hsl(var(--info))' },
      { name: 'Taxes', value: Math.abs(latestMonth.tax_expenses || 0), color: 'hsl(var(--success))' },
      { name: 'Other', value: Math.abs(latestMonth.other_expenses || 0), color: 'hsl(var(--muted))' },
    ].filter(item => item.value > 0);

    // Calculate expense trends for expense control
    const expenseTrends = effectivePLData.map((item) => ({
      month: format(new Date(item.date), 'MMM yy'),
      maintenance: Math.abs(item.maintenance_expenses || 0),
      management: Math.abs(item.management_fees || 0),
      insurance: Math.abs(item.insurance_expenses || 0),
      taxes: Math.abs(item.tax_expenses || 0),
      other: Math.abs(item.other_expenses || 0),
    }));

    // Calculate property-level profitability using estimated values
    const propertyProfitability = effectivePropsData.map((property) => {
      const monthlyRent = 1000; // Estimate $1k rent per property
      const annualRevenue = monthlyRent * 12;
      const estimatedExpenses = annualRevenue * 0.45; // Estimate 45% expense ratio
      const noi = annualRevenue - estimatedExpenses;
      const margin = annualRevenue > 0 ? (noi / annualRevenue) * 100 : 0;

      return {
        property: property.street_address || `Property ${property.id}`,
        revenue: annualRevenue,
        expenses: estimatedExpenses,
        noi: noi,
        margin: margin,
        expenseRatio: annualRevenue > 0 ? (estimatedExpenses / annualRevenue) * 100 : 0,
      };
    }).sort((a, b) => b.margin - a.margin);

    const totalRevenue = monthlyTrends.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpenses = monthlyTrends.reduce((sum, item) => sum + item.expenses, 0);
    const averageMargin = monthlyTrends.length > 0 ? monthlyTrends.reduce((sum, item) => sum + item.margin, 0) / monthlyTrends.length : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    return {
      monthlyTrends,
      expenseBreakdown,
      expenseTrends,
      propertyProfitability,
      totalRevenue,
      totalExpenses,
      averageMargin,
      expenseRatio,
    };
  }, [effectivePLData, effectivePropsData]);

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

  if (error && !mockPLData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load profitability data</span>
        </div>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No profitability data available</p>
        </div>
      </Card>
    );
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-success';
    if (margin >= 15) return 'text-warning';
    return 'text-destructive';
  };

  const getExpenseRatioColor = (ratio: number) => {
    if (ratio <= 40) return 'text-success';
    if (ratio <= 60) return 'text-warning';
    return 'text-destructive';
  };

  const ProfitMarginWidget = () => {
    if (!isWidgetVisible('profit-margin')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="profit-margin"
        title="Avg Profit Margin"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('profit-margin')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Profit Margin</p>
            <p className={`text-xl font-bold ${getMarginColor(analysisData.averageMargin)}`}>
              {analysisData.averageMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const ExpenseRatioWidget = () => {
    if (!isWidgetVisible('expense-ratio')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="expense-ratio"
        title="Expense Ratio"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('expense-ratio')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <BarChart3 className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expense Ratio</p>
            <p className={`text-xl font-bold ${getExpenseRatioColor(analysisData.expenseRatio)}`}>
              {analysisData.expenseRatio.toFixed(1)}%
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const TotalRevenueWidget = () => {
    if (!isWidgetVisible('total-revenue')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-revenue"
        title="Total Revenue (12mo)"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('total-revenue')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-openkey-blue/10 rounded-lg">
            <PieChartIcon className="w-5 h-5 text-openkey-blue" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue (12mo)</p>
            <p className="text-xl font-bold text-foreground">
              ${analysisData.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const TotalExpensesWidget = () => {
    if (!isWidgetVisible('total-expenses')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="total-expenses"
        title="Total Expenses (12mo)"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('total-expenses')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="metric"
        showHeader={false}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses (12mo)</p>
            <p className="text-xl font-bold text-destructive">
              ${analysisData.totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const MonthlyNOITrendWidget = () => {
    if (!isWidgetVisible('monthly-noi-trend')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="monthly-noi-trend"
        title="Monthly NOI Trend"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('monthly-noi-trend')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analysisData.monthlyTrends}>
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'NOI']}
              />
              <Line 
                type="monotone" 
                dataKey="noi" 
                stroke="hsl(var(--openkey-blue))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--openkey-blue))', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const ExpenseBreakdownWidget = () => {
    if (!isWidgetVisible('expense-breakdown')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="expense-breakdown"
        title="Expense Breakdown"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('expense-breakdown')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analysisData.expenseBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {analysisData.expenseBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2">
            {analysisData.expenseBreakdown.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const ExpenseControlTrendsWidget = () => {
    if (!isWidgetVisible('expense-control-trends')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="expense-control-trends"
        title="Expense Control Trends"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('expense-control-trends')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysisData.expenseTrends}>
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
              />
              <Bar dataKey="maintenance" stackId="expenses" fill="hsl(var(--destructive))" />
              <Bar dataKey="management" stackId="expenses" fill="hsl(var(--warning))" />
              <Bar dataKey="insurance" stackId="expenses" fill="hsl(var(--info))" />
              <Bar dataKey="taxes" stackId="expenses" fill="hsl(var(--success))" />
              <Bar dataKey="other" stackId="expenses" fill="hsl(var(--muted))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const PropertyProfitabilityRankingWidget = () => {
    if (!isWidgetVisible('property-profitability-ranking')) return null;
    return (
      <FinancialWidgetWrapper
        widgetId="property-profitability-ranking"
        title="Property Profitability Ranking"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('property-profitability-ranking')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="panel"
      >
        <div className="space-y-2">
          {analysisData.propertyProfitability.map((property, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-muted/20 rounded">
              <div>
                <p className="font-medium text-sm">{property.property}</p>
                <p className="text-xs text-muted-foreground">
                  ${property.revenue.toLocaleString()} revenue
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getMarginColor(property.margin)}`}>
                  {property.margin.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  ${property.noi.toLocaleString()} NOI
                </p>
              </div>
            </div>
          ))}
        </div>
      </FinancialWidgetWrapper>
    );
  };

  const UtilityExpenseAnalysisWidget = () => {
    if (!isWidgetVisible('utility-expense-analysis')) return null;
    
    // Generate mock utility expense data
    const utilityData = useMemo(() => {
      const regenerations = getRegenerationCount('utility-expense-analysis');
      const months = analysisData?.monthlyTrends || [];
      
      return months.map((month, index) => {
        const baseMultiplier = 1 + (regenerations * 0.15);
        const seasonalVariation = Math.sin((index / 12) * 2 * Math.PI) * 0.3 + 1;
        
        return {
          month: month.month,
          electric: Math.round((200 + Math.random() * 150) * baseMultiplier * seasonalVariation),
          gas: Math.round((100 + Math.random() * 80) * baseMultiplier * seasonalVariation),
          water: Math.round((80 + Math.random() * 40) * baseMultiplier),
          internet: Math.round((50 + Math.random() * 20) * baseMultiplier),
          total: 0,
        };
      }).map(item => ({
        ...item,
        total: item.electric + item.gas + item.water + item.internet
      }));
    }, [analysisData?.monthlyTrends, getRegenerationCount]);

    const avgMonthlyUtilities = utilityData.length > 0 
      ? utilityData.reduce((sum, item) => sum + item.total, 0) / utilityData.length 
      : 0;

    return (
      <FinancialWidgetWrapper
        widgetId="utility-expense-analysis"
        title="Utility Expense Analysis"
        tab="financial"
        category="expenses"
        isFavorited={isFavorited('utility-expense-analysis')}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDeleteWidget}
        onRegenerate={onRegenerateWidget}
        componentType="chart"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Avg Monthly Utilities</div>
            <div className="text-lg font-bold text-foreground">
              ${avgMonthlyUtilities.toFixed(0)}
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number, name: string) => [`$${value}`, name]}
              />
              <Bar dataKey="electric" stackId="utilities" fill="hsl(var(--warning))" />
              <Bar dataKey="gas" stackId="utilities" fill="hsl(var(--info))" />
              <Bar dataKey="water" stackId="utilities" fill="hsl(var(--openkey-blue))" />
              <Bar dataKey="internet" stackId="utilities" fill="hsl(var(--success))" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Electric</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span>Gas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-openkey-blue" />
              <span>Water</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Internet</span>
            </div>
          </div>
        </div>
      </FinancialWidgetWrapper>
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Profitability & Expense Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ProfitMarginWidget />
        <ExpenseRatioWidget />
        <TotalRevenueWidget />
        <TotalExpensesWidget />
      </div>

      {/* Monthly NOI Trend & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyNOITrendWidget />
        <ExpenseBreakdownWidget />
      </div>

      {/* Expense Control Trends */}
      <ExpenseControlTrendsWidget />

      {/* Utility Expense Analysis */}
      <UtilityExpenseAnalysisWidget />

      {/* Property-Level Profitability Ranking */}
      <PropertyProfitabilityRankingWidget />
    </div>
  );
};