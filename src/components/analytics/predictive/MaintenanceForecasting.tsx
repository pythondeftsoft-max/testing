import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Badge } from '@/components/ui/badge';
import { Wrench, Calendar, AlertTriangle, TrendingUp, Clock, Settings } from 'lucide-react';
import { useModernPropertyAnalytics } from '@/hooks/useModernPropertyAnalytics';

interface MaintenanceForecastingProps {
  landlordId: string;
  portfolioId: string;
}

export const MaintenanceForecasting: React.FC<MaintenanceForecastingProps> = ({
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

  const maintenanceItems = [
    { item: 'HVAC Systems', risk: 'Medium', timeline: '6-8 months', cost: 3200 },
    { item: 'Plumbing Fixtures', risk: 'Low', timeline: '12+ months', cost: 850 },
    { item: 'Exterior Paint', risk: 'High', timeline: '2-3 months', cost: 4500 },
    { item: 'Flooring Replacement', risk: 'Medium', timeline: '8-10 months', cost: 2800 },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricDisplay
          label="Predicted Maintenance Costs"
          value={formatCurrency(predictiveAnalytics?.predictedMaintenanceCosts || 0)}
          isLoading={isLoading}
          trend="up"
          trendValue="2.1%"
        />
        <MetricDisplay
          label="Preventive Opportunities"
          value="6 items"
          isLoading={isLoading}
        />
        <MetricDisplay
          label="Cost Savings Potential"
          value={formatCurrency(2300)}
          isLoading={isLoading}
          trend="up"
        />
      </div>

      {/* Detailed Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Maintenance Timeline Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenanceItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.item}</div>
                    <div className="text-xs text-muted-foreground">
                      Expected: {item.timeline}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskColor(item.risk) as any}>
                      {item.risk}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(item.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Predictive Maintenance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">High Priority</span>
                </div>
                <div className="text-sm text-red-700 mb-1">
                  Exterior painting required before winter
                </div>
                <div className="text-xs text-red-600">
                  Risk of structural damage if delayed
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-800">Schedule Soon</span>
                </div>
                <div className="text-sm text-yellow-700 mb-1">
                  HVAC system showing early wear signs
                </div>
                <div className="text-xs text-yellow-600">
                  Consider preventive service to avoid emergency repairs
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">Optimization</span>
                </div>
                <div className="text-sm text-green-700 mb-1">
                  Bulk maintenance scheduling available
                </div>
                <div className="text-xs text-green-600">
                  Save 15% by coordinating multiple properties
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};