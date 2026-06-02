import React from 'react';
import { UserCheck, Clock, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import AnalyticsWidget from './AnalyticsWidget';

interface TenantPlacementData {
  avg_time_to_placement: number;
  placement_rate: number;
  application_conversion_rate: number;
  total_requests: number;
  filled_requests: number;
  total_applications: number;
  approved_applications: number;
}

interface TenantPlacementMetricsProps {
  data: TenantPlacementData | null;
  loading: boolean;
}

const TenantPlacementMetrics = ({ data, loading }: TenantPlacementMetricsProps) => {
  // Mock trend data for sparklines
  const placementTrendData = [
    { value: 85 }, { value: 88 }, { value: 90 }, { value: 87 }, 
    { value: 92 }, { value: 89 }, { value: data?.placement_rate || 90 }
  ];

  const conversionTrendData = [
    { value: 65 }, { value: 68 }, { value: 70 }, { value: 67 }, 
    { value: 72 }, { value: 69 }, { value: data?.application_conversion_rate || 70 }
  ];

  const timeTrendData = [
    { value: 18 }, { value: 16 }, { value: 15 }, { value: 17 }, 
    { value: 14 }, { value: 16 }, { value: data?.avg_time_to_placement || 15 }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Tenant Placement & Conversion</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnalyticsWidget
          title="Average Time to Placement"
          description="Days from request to tenant placement"
          value={`${Math.round(data?.avg_time_to_placement || 0)} days`}
          trend={{
            value: 8,
            direction: 'down',
            label: 'vs last month'
          }}
          icon={Clock}
          status={data?.avg_time_to_placement && data.avg_time_to_placement < 20 ? 'good' : 'warning'}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeTrendData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />

        <AnalyticsWidget
          title="Placement Rate"
          description="% of requests that get filled"
          value={`${Math.round(data?.placement_rate || 0)}%`}
          trend={{
            value: 5,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={UserCheck}
          status={data?.placement_rate && data.placement_rate > 80 ? 'good' : 'warning'}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={placementTrendData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />

        <AnalyticsWidget
          title="Application → Lease Conversion"
          description="% of applications that convert to leases"
          value={`${Math.round(data?.application_conversion_rate || 0)}%`}
          trend={{
            value: 3,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={TrendingUp}
          status={data?.application_conversion_rate && data.application_conversion_rate > 60 ? 'good' : 'neutral'}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={conversionTrendData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Requests</div>
          <div className="text-2xl font-bold">{data?.total_requests || 0}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Filled Requests</div>
          <div className="text-2xl font-bold">{data?.filled_requests || 0}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Applications</div>
          <div className="text-2xl font-bold">{data?.total_applications || 0}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Approved Applications</div>
          <div className="text-2xl font-bold">{data?.approved_applications || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default TenantPlacementMetrics;