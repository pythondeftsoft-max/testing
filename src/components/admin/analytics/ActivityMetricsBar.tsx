import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, CheckCircle, DollarSign, AlertTriangle, Target, Users } from 'lucide-react';
import type { ActivityMetrics } from '@/hooks/useActivityTrackerData';

interface ActivityMetricsBarProps {
  metrics: ActivityMetrics;
  isLoading?: boolean;
}

export const ActivityMetricsBar: React.FC<ActivityMetricsBarProps> = ({ metrics, isLoading }) => {
  const kpis = [
    {
      label: 'Total Points',
      value: metrics.total_points.toFixed(1),
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Lease Signed',
      value: metrics.lease_signed_moves,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Paid/Housed',
      value: metrics.paid_housed_moves,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Backward Moves',
      value: metrics.backwards_moves,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversion_rate.toFixed(1)}%`,
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Entities Touched',
      value: metrics.entities_touched,
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
