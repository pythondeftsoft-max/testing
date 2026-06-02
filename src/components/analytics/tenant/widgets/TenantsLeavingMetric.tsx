import React from 'react';
import { UserMinus } from 'lucide-react';
import ModernAnalyticsCard from '@/components/analytics/ModernAnalyticsCard';

interface TenantsLeavingMetricProps {
  value: number;
  trend?: { value: number; isPositive: boolean; period?: string };
}

export const TenantsLeavingMetric: React.FC<TenantsLeavingMetricProps> = ({ value, trend }) => {
  const formattedTrend = trend ? { ...trend, period: trend.period || 'vs last period' } : undefined;
  
  return (
    <ModernAnalyticsCard
      title="Tenants Leaving"
      value={value}
      subtitle="Next 3 months"
      icon={UserMinus}
      trend={formattedTrend}
      formatValue="number"
      className="h-[150px]"
    />
  );
};
