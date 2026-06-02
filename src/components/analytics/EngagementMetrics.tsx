import React from 'react';
import { Bell, MessageSquare, Wrench, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import AnalyticsWidget from './AnalyticsWidget';

interface EngagementData {
  total_notifications: number;
  total_applications: number;
  total_messages: number;
  total_maintenance_requests: number;
  completed_maintenance_requests: number;
  avg_maintenance_resolution_days: number;
}

interface EngagementMetricsProps {
  data: EngagementData | null;
  loading: boolean;
}

const EngagementMetrics = ({ data, loading }: EngagementMetricsProps) => {
  // Mock weekly engagement data
  const weeklyEngagementData = [
    { week: 'W1', notifications: 45, messages: 28, applications: 12 },
    { week: 'W2', notifications: 52, messages: 31, applications: 15 },
    { week: 'W3', notifications: 38, messages: 25, applications: 8 },
    { week: 'W4', notifications: 61, messages: 35, applications: 18 },
  ];

  const maintenanceCompletionRate = data?.total_maintenance_requests 
    ? Math.round((data.completed_maintenance_requests / data.total_maintenance_requests) * 100)
    : 0;

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
      <h3 className="text-lg font-semibold">Engagement & Activity</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsWidget
          title="Notifications Sent"
          description="Total notifications this period"
          value={data?.total_notifications || 0}
          trend={{
            value: 12,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={Bell}
          status="neutral"
        />

        <AnalyticsWidget
          title="Messages Exchanged"
          description="Total messages between users"
          value={data?.total_messages || 0}
          trend={{
            value: 8,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={MessageSquare}
          status="good"
        />

        <AnalyticsWidget
          title="New Applications"
          description="Property applications submitted"
          value={data?.total_applications || 0}
          trend={{
            value: 15,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={TrendingUp}
          status="good"
        />

        <AnalyticsWidget
          title="Maintenance Completion"
          description="% of requests completed"
          value={`${maintenanceCompletionRate}%`}
          trend={{
            value: 5,
            direction: 'up',
            label: 'vs last month'
          }}
          icon={Wrench}
          status={maintenanceCompletionRate > 80 ? 'good' : 'warning'}
        />
      </div>

      {/* Weekly Engagement Chart */}
      <div className="p-6 border rounded-lg">
        <h4 className="text-md font-medium mb-4">Weekly Platform Activity</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyEngagementData}>
              <XAxis dataKey="week" />
              <YAxis />
              <Bar dataKey="notifications" fill="hsl(var(--primary))" name="Notifications" />
              <Bar dataKey="messages" fill="hsl(var(--secondary))" name="Messages" />
              <Bar dataKey="applications" fill="hsl(var(--accent))" name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-secondary rounded"></div>
            <span>Messages</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded"></div>
            <span>Applications</span>
          </div>
        </div>
      </div>

      {/* Maintenance & Support Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Maintenance Requests</div>
          <div className="text-2xl font-bold">{data?.total_maintenance_requests || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">This period</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Completed Requests</div>
          <div className="text-2xl font-bold">{data?.completed_maintenance_requests || 0}</div>
          <div className="text-xs text-emerald-600 mt-1">
            +{Math.round((data?.completed_maintenance_requests || 0) * 0.1)} vs last period
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Avg Resolution Time</div>
          <div className="text-2xl font-bold">
            {Math.round(data?.avg_maintenance_resolution_days || 0)} days
          </div>
          <div className="text-xs text-muted-foreground mt-1">From request to completion</div>
        </div>
      </div>

      {/* Response Rate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Notification Response Rate</div>
          <div className="text-2xl font-bold">73%</div>
          <div className="text-xs text-emerald-600 mt-1">+5% vs last month</div>
          <div className="text-xs text-muted-foreground">Of pushed matches clicked</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Response Time</div>
          <div className="text-2xl font-bold">2.4 hrs</div>
          <div className="text-xs text-red-600 mt-1">+0.3 hrs vs last month</div>
          <div className="text-xs text-muted-foreground">For tenant inquiries</div>
        </div>
      </div>
    </div>
  );
};

export default EngagementMetrics;