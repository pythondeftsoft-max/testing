import React from 'react';
import { Eye, MousePointer, Calendar, Map } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import AnalyticsWidget from './AnalyticsWidget';

interface MarketplaceData {
  total_property_views: number;
  total_applications: number;
  application_rate: number;
  expiring_leases_30_days: number;
  expiring_leases_60_days: number;
  expiring_leases_90_days: number;
}

interface MarketplaceMetricsProps {
  data: MarketplaceData | null;
  loading: boolean;
}

const MarketplaceMetrics = ({ data, loading }: MarketplaceMetricsProps) => {
  // Mock data for lease expiration forecast
  const leaseExpirationData = [
    { period: '0-30 days', count: data?.expiring_leases_30_days || 5 },
    { period: '31-60 days', count: data?.expiring_leases_60_days || 8 },
    { period: '61-90 days', count: data?.expiring_leases_90_days || 12 },
  ];

  // Mock view preferences data
  const viewPreferencesData = [
    { week: 'W1', mapViews: 120, listViews: 180 },
    { week: 'W2', mapViews: 135, listViews: 165 },
    { week: 'W3', mapViews: 145, listViews: 155 },
    { week: 'W4', mapViews: 160, listViews: 140 },
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Marketplace Activity</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsWidget
          title="Property Views"
          description="Total property page views"
          value={data?.total_property_views || 0}
          trend={{
            value: 18,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={Eye}
          status="good"
        />

        <AnalyticsWidget
          title="Interest Rate"
          description="% of views that convert to applications"
          value={`${Math.round(data?.application_rate || 0)}%`}
          trend={{
            value: 3,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={MousePointer}
          status={data?.application_rate && data.application_rate > 10 ? 'good' : 'neutral'}
        />

        <AnalyticsWidget
          title="Map vs List Views"
          description="Map view preference trend"
          value="53%"
          trend={{
            value: 8,
            direction: 'up',
            label: 'map preference'
          }}
          icon={Map}
          status="neutral"
        />

        <AnalyticsWidget
          title="Leases Expiring (30d)"
          description="Properties becoming available"
          value={data?.expiring_leases_30_days || 0}
          icon={Calendar}
          status={data?.expiring_leases_30_days && data.expiring_leases_30_days > 5 ? 'warning' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Expiration Forecast */}
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-4">Lease Expiration Forecast</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leaseExpirationData}>
                <XAxis dataKey="period" />
                <YAxis />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{data?.expiring_leases_30_days || 0}</div>
              <div className="text-muted-foreground">0-30 days</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{data?.expiring_leases_60_days || 0}</div>
              <div className="text-muted-foreground">31-60 days</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{data?.expiring_leases_90_days || 0}</div>
              <div className="text-muted-foreground">61-90 days</div>
            </div>
          </div>
        </div>

        {/* View Preferences Trend */}
        <div className="p-6 border rounded-lg">
          <h4 className="text-md font-medium mb-4">Map vs List View Preferences</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewPreferencesData}>
                <XAxis dataKey="week" />
                <YAxis />
                <Area 
                  type="monotone" 
                  dataKey="mapViews" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="listViews" 
                  stackId="1"
                  stroke="hsl(var(--secondary))" 
                  fill="hsl(var(--secondary))" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Map Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded"></div>
              <span>List Views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Click-through and Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Applications</div>
          <div className="text-2xl font-bold">{data?.total_applications || 0}</div>
          <div className="text-xs text-emerald-600 mt-1">+12% vs last month</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Avg Time on Property Page</div>
          <div className="text-2xl font-bold">3.2 min</div>
          <div className="text-xs text-emerald-600 mt-1">+0.4 min vs last month</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Bounce Rate</div>
          <div className="text-2xl font-bold">24%</div>
          <div className="text-xs text-red-600 mt-1">+2% vs last month</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Return Visitors</div>
          <div className="text-2xl font-bold">67%</div>
          <div className="text-xs text-emerald-600 mt-1">+5% vs last month</div>
        </div>
      </div>

      {/* Property Performance Summary */}
      <div className="p-6 border rounded-lg">
        <h4 className="text-md font-medium mb-4">Property Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Most Viewed Properties</div>
            <div className="space-y-2">
              {['123 Main St - 45 views', '456 Oak Ave - 38 views', '789 Pine Rd - 32 views'].map((property, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{property.split(' - ')[0]}</span>
                  <span className="text-muted-foreground">{property.split(' - ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">Highest Application Rates</div>
            <div className="space-y-2">
              {['321 Elm St - 18% rate', '654 Maple Dr - 15% rate', '987 Cedar Ln - 12% rate'].map((property, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{property.split(' - ')[0]}</span>
                  <span className="text-emerald-600">{property.split(' - ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceMetrics;