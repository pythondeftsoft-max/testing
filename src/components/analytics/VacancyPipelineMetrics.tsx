import React from 'react';
import { Home, Calendar, Users, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import AnalyticsWidget from './AnalyticsWidget';

interface VacancyPipelineData {
  avg_days_on_market: number;
  current_vacant_units: number;
  current_occupied_units: number;
  new_tenant_profiles_this_period: number;
  vacancy_rate: number;
}

interface VacancyPipelineMetricsProps {
  data: VacancyPipelineData | null;
  loading: boolean;
}

const VacancyPipelineMetrics = ({ data, loading }: VacancyPipelineMetricsProps) => {
  // Mock historical data for vacancy vs seeker trends
  const historicalData = [
    { month: 'Jan', vacant: 25, seekers: 45 },
    { month: 'Feb', vacant: 22, seekers: 52 },
    { month: 'Mar', vacant: 28, seekers: 48 },
    { month: 'Apr', vacant: 24, seekers: 58 },
    { month: 'May', vacant: 20, seekers: 62 },
    { month: 'Jun', vacant: data?.current_vacant_units || 18, seekers: data?.new_tenant_profiles_this_period || 65 },
  ];

  const vacancyTrendData = [
    { value: 32 }, { value: 28 }, { value: 25 }, { value: 24 }, 
    { value: 22 }, { value: 20 }, { value: data?.avg_days_on_market || 18 }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Vacancy & Pipeline Health</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsWidget
          title="Avg Days on Market"
          description="Time until first application"
          value={`${Math.round(data?.avg_days_on_market || 0)} days`}
          trend={{
            value: 12,
            direction: 'down',
            label: 'vs last month'
          }}
          icon={Calendar}
          status={data?.avg_days_on_market && data.avg_days_on_market < 30 ? 'good' : 'warning'}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vacancyTrendData}>
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
          title="Vacant Units"
          description="Currently available properties"
          value={data?.current_vacant_units || 0}
          icon={Home}
          status={data?.vacancy_rate && data.vacancy_rate < 15 ? 'good' : 'warning'}
        />

        <AnalyticsWidget
          title="Occupied Units"
          description="Properties with tenants"
          value={data?.current_occupied_units || 0}
          icon={Users}
          status="good"
        />

        <AnalyticsWidget
          title="Vacancy Rate"
          description="% of properties vacant"
          value={`${Math.round(data?.vacancy_rate || 0)}%`}
          trend={{
            value: 5,
            direction: 'down',
            label: 'vs last month'
          }}
          icon={TrendingDown}
          status={data?.vacancy_rate && data.vacancy_rate < 15 ? 'good' : data?.vacancy_rate && data.vacancy_rate < 25 ? 'warning' : 'critical'}
        />
      </div>

      {/* Dual-axis chart for vacant units vs new seekers */}
      <div className="p-6 border rounded-lg">
        <h4 className="text-md font-medium mb-4">Vacancy vs Seeker Pipeline (Last 6 Months)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historicalData}>
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Bar yAxisId="left" dataKey="vacant" fill="hsl(var(--destructive))" name="Vacant Units" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="seekers" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="New Seekers"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span>Vacant Units</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>New Tenant Profiles</span>
          </div>
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">New Tenant Profiles (This Period)</div>
          <div className="text-2xl font-bold">{data?.new_tenant_profiles_this_period || 0}</div>
          <div className="text-xs text-emerald-600 mt-1">+15% vs last period</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Supply/Demand Ratio</div>
          <div className="text-2xl font-bold">
            {data?.current_vacant_units && data?.new_tenant_profiles_this_period 
              ? (data.new_tenant_profiles_this_period / data.current_vacant_units).toFixed(1)
              : '0.0'}:1
          </div>
          <div className="text-xs text-muted-foreground mt-1">Seekers per vacant unit</div>
        </div>
      </div>
    </div>
  );
};

export default VacancyPipelineMetrics;