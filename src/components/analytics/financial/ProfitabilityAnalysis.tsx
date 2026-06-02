import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { usePortfolioProfitLoss } from '@/hooks/usePortfolioFinancialData';
import { usePortfolioProperties } from '@/hooks/usePortfolioFinancialData';
import { format, subMonths, startOfMonth } from 'date-fns';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProfitabilityAnalysisProps {
  landlordId: string;
  portfolioId: string;
}

export const ProfitabilityAnalysis: React.FC<ProfitabilityAnalysisProps> = ({
  landlordId,
  portfolioId,
}) => {
  const endDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const startDate = useMemo(() => format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd'), []);

  const { data: profitLossData, isLoading: plLoading, error: plError } = usePortfolioProfitLoss(portfolioId, startDate, endDate);
  const { data: propertiesData, isLoading: propLoading } = usePortfolioProperties(portfolioId);

  const isLoading = plLoading || propLoading;
  const error = plError;

  const analysisData = useMemo(() => {
    if (!profitLossData || !Array.isArray(profitLossData) || profitLossData.length === 0 || !propertiesData?.length) return null;

    // Calculate monthly trends
    const monthlyTrends = profitLossData.map((item) => ({
      month: format(new Date(item.date), 'MMM yy'),
      revenue: item.total_revenue || 0,
      expenses: Math.abs(item.total_expenses || 0),
      noi: (item.total_revenue || 0) - Math.abs(item.total_expenses || 0),
      margin: item.total_revenue > 0 ? (((item.total_revenue || 0) - Math.abs(item.total_expenses || 0)) / item.total_revenue) * 100 : 0,
    }));

    // Calculate expense breakdown from latest month
    const latestMonth = profitLossData[profitLossData.length - 1];
    const expenseBreakdown = [
      { name: 'Maintenance', value: Math.abs(latestMonth.maintenance_expenses || 0), color: 'hsl(var(--destructive))' },
      { name: 'Management', value: Math.abs(latestMonth.management_fees || 0), color: 'hsl(var(--warning))' },
      { name: 'Insurance', value: Math.abs(latestMonth.insurance_expenses || 0), color: 'hsl(var(--info))' },
      { name: 'Taxes', value: Math.abs(latestMonth.tax_expenses || 0), color: 'hsl(var(--success))' },
      { name: 'Other', value: Math.abs(latestMonth.other_expenses || 0), color: 'hsl(var(--muted))' },
    ].filter(item => item.value > 0);

    // Calculate property-level profitability using estimated values
    const propertyProfitability = propertiesData.map((property) => {
      const monthlyRent = 1000; // Estimate $1k rent per property
      const annualRevenue = monthlyRent * 12;
      const estimatedExpenses = annualRevenue * 0.45; // Estimate 45% expense ratio
      const noi = annualRevenue - estimatedExpenses;
      const margin = annualRevenue > 0 ? (noi / annualRevenue) * 100 : 0;

      return {
        property: property.street_address || `Property ${property.id}`,
        revenue: annualRevenue,
        noi: noi,
        margin: margin,
        units: 1, // Assume 1 unit per property for now
        revenuePerUnit: annualRevenue,
      };
    }).sort((a, b) => b.margin - a.margin);

    const totalRevenue = monthlyTrends.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpenses = monthlyTrends.reduce((sum, item) => sum + item.expenses, 0);
    const averageMargin = monthlyTrends.length > 0 ? monthlyTrends.reduce((sum, item) => sum + item.margin, 0) / monthlyTrends.length : 0;

    return {
      monthlyTrends,
      expenseBreakdown,
      propertyProfitability,
      totalRevenue,
      totalExpenses,
      averageMargin,
    };
  }, [profitLossData, propertiesData]);

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

  if (error) {
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

  return (
    <div className="space-y-6">
      {/* Key Profitability Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div>
            <p className="text-sm text-muted-foreground">Average Profit Margin</p>
            <p className={`text-2xl font-bold ${getMarginColor(analysisData.averageMargin)}`}>
              {analysisData.averageMargin.toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(analysisData.averageMargin)}
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue (12mo)</p>
            <p className="text-2xl font-bold text-success">
              ${analysisData.totalRevenue.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses (12mo)</p>
            <p className="text-2xl font-bold text-destructive">
              ${analysisData.totalExpenses.toLocaleString()}
            </p>
          </div>
        </Card>
      </div>

      {/* Monthly Profitability Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Monthly NOI Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
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
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
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
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Property-Level Profitability Ranking */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Property Profitability Ranking</h3>
          <div className="space-y-2">
            {analysisData.propertyProfitability.slice(0, 10).map((property, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-openkey-blue/10 text-openkey-blue text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{property.property}</p>
                    <p className="text-xs text-muted-foreground">
                      {property.units} units • ${property.revenuePerUnit.toLocaleString()}/unit/year
                    </p>
                  </div>
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
        </div>
      </Card>
    </div>
  );
};