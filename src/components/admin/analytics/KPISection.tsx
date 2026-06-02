import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Building, TrendingUp, Activity, Users } from 'lucide-react';
import { ComprehensiveMetrics } from '@/hooks/useComprehensiveAdminMetrics';

interface KPISectionProps {
  metrics: ComprehensiveMetrics;
}

export const KPISection = ({ metrics }: KPISectionProps) => {
  const totalRevenue = metrics.financial.total_collected + metrics.financial.total_pending;
  const occupancyRate = metrics.properties.total > 0 
    ? Math.round((Object.values(metrics.properties.by_status).find((_, i) => i === 0) || 0) / metrics.properties.total * 100)
    : 0;
  
  const kpis = [
    {
      label: 'Total Platform Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      trend: metrics.financial.collection_rate > 70 ? 'up' : 'down',
      trendValue: `${metrics.financial.collection_rate}% collected`
    },
    {
      label: 'Active Properties',
      value: metrics.properties.total.toLocaleString(),
      icon: <Building className="h-5 w-5" />,
      trend: 'up',
      trendValue: `${occupancyRate}% occupancy`
    },
    {
      label: 'Total Users',
      value: metrics.users.total.toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      trend: 'neutral',
      trendValue: `${metrics.users.landlords}L / ${metrics.users.tenants}T`
    },
    {
      label: 'Platform Health',
      value: `${Math.round((metrics.financial.collection_rate + occupancyRate) / 2)}%`,
      icon: <Activity className="h-5 w-5" />,
      trend: metrics.financial.collection_rate > 70 ? 'up' : 'down',
      trendValue: 'Overall score'
    },
    {
      label: 'Engagement Rate',
      value: `${Math.round((metrics.messages.this_month / Math.max(metrics.users.total, 1)) * 100)}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      trend: metrics.messages.this_month > 20 ? 'up' : 'neutral',
      trendValue: `${metrics.messages.this_month} msgs this month`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <div className="text-primary">{kpi.icon}</div>
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold">{kpi.value}</span>
              <span
                className={`text-xs ${
                  kpi.trend === 'up'
                    ? 'text-green-600'
                    : kpi.trend === 'down'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                }`}
              >
                {kpi.trendValue}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
