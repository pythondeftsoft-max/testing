import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, Target, BarChart3, PieChart } from 'lucide-react';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';

interface FinancialForecastingProps {
  landlordId: string;
  portfolioId: string;
}

export const FinancialForecasting: React.FC<FinancialForecastingProps> = ({
  landlordId,
  portfolioId,
}) => {
  const { data: analytics, isLoading } = useModernPropertyAnalytics(landlordId, portfolioId);
  const predictiveAnalytics = analytics?.predictiveAnalytics;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Key Financial Projections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricDisplay
          label="Projected NOI"
          value={formatCurrency(predictiveAnalytics?.projectedNOI || 0)}
          isLoading={isLoading}
          trend="up"
          trendValue="4.2%"
        />
        <MetricDisplay
          label="Break-even Occupancy"
          value={`${predictiveAnalytics?.breakEvenOccupancy || 0}%`}
          isLoading={isLoading}
        />
        <MetricDisplay
          label="Revenue Optimization"
          value={formatCurrency(predictiveAnalytics?.revenueOptimizationPotential || 0)}
          isLoading={isLoading}
          trend="up"
        />
      </div>

      {/* Detailed Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              12-Month Revenue Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency((predictiveAnalytics?.projectedNOI || 0) * 1.2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Projected gross revenue (next 12 months)
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Q1 Projection</span>
                  <span className="text-sm font-medium">{formatCurrency((predictiveAnalytics?.projectedNOI || 0) * 0.28)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Q2 Projection</span>
                  <span className="text-sm font-medium">{formatCurrency((predictiveAnalytics?.projectedNOI || 0) * 0.32)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Q3 Projection</span>
                  <span className="text-sm font-medium">{formatCurrency((predictiveAnalytics?.projectedNOI || 0) * 0.31)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Q4 Projection</span>
                  <span className="text-sm font-medium">{formatCurrency((predictiveAnalytics?.projectedNOI || 0) * 0.29)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Occupancy & Break-even Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Occupancy</span>
                  <span className="font-medium">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Break-even Occupancy</span>
                  <span className="font-medium">{predictiveAnalytics?.breakEvenOccupancy || 0}%</span>
                </div>
                <Progress value={predictiveAnalytics?.breakEvenOccupancy || 0} className="h-2" />
              </div>
              
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground mb-2">Financial Health Score</div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-green-500">Excellent</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(((92 - (predictiveAnalytics?.breakEvenOccupancy || 0)) / 92) * 100)}% above break-even
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};