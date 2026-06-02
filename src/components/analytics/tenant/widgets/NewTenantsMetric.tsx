import React from 'react';
import { UserPlus } from 'lucide-react';
import ModernAnalyticsCard from '@/components/analytics/ModernAnalyticsCard';

interface NewTenantsMetricProps {
  value: number;
  trend?: { value: number; isPositive: boolean; period?: string };
}

export const NewTenantsMetric: React.FC<NewTenantsMetricProps> = ({ value, trend }) => {
  const formattedTrend = trend ? { ...trend, period: trend.period || 'vs last period' } : undefined;
  
  return (
    <ModernAnalyticsCard
      title="New Tenants"
      value={value}
      subtitle="Last 6 months"
      icon={UserPlus}
      trend={formattedTrend}
      formatValue="number"
      className="h-[150px]"
    />
  );
};
