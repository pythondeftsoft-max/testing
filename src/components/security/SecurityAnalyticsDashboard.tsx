
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Globe,
  User,
  Activity
} from 'lucide-react';

interface SecurityLog {
  id: string;
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  severity: string;
  created_at: string;
  hash: string;
}

interface SecurityAnalyticsDashboardProps {
  logs: SecurityLog[];
  eventCounts: Record<string, number>;
  dateRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const SecurityAnalyticsDashboard: React.FC<SecurityAnalyticsDashboardProps> = ({
  logs,
  eventCounts,
  dateRange
}) => {
  const analytics = useMemo(() => {
    // Event timeline data
    const timelineData = logs.reduce((acc, log) => {
      const hour = new Date(log.created_at).getHours();
      const key = `${hour}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timeline = Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      events: timelineData[`${i}:00`] || 0
    }));

    // Severity distribution
    const severityData = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityChart = Object.entries(severityData).map(([severity, count]) => ({
      name: severity,
      value: count
    }));

    // Top IP addresses
    const ipData = logs.reduce((acc, log) => {
      if (log.ip_address) {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topIPs = Object.entries(ipData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Event type distribution
    const eventTypeChart = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([type, count]) => ({
        name: type.replace(/_/g, ' '),
        value: count
      }));

    // Risk metrics
    const criticalEvents = logs.filter(log => log.severity === 'critical').length;
    const highEvents = logs.filter(log => log.severity === 'high').length;
    const uniqueIPs = new Set(logs.map(log => log.ip_address).filter(Boolean)).size;
    const uniqueUsers = new Set(logs.map(log => log.user_id).filter(Boolean)).size;

    return {
      timeline,
      severityChart,
      topIPs,
      eventTypeChart,
      metrics: {
        totalEvents: logs.length,
        criticalEvents,
        highEvents,
        uniqueIPs,
        uniqueUsers,
        riskScore: Math.min(100, (criticalEvents * 10 + highEvents * 5) / Math.max(1, logs.length) * 100)
      }
    };
  }, [logs, eventCounts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      default: return '#059669';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{analytics.metrics.totalEvents}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Events</p>
                <p className="text-2xl font-bold text-red-600">{analytics.metrics.criticalEvents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Severity</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.metrics.highEvents}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique IPs</p>
                <p className="text-2xl font-bold">{analytics.metrics.uniqueIPs}</p>
              </div>
              <Globe className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                <p className="text-2xl font-bold">{analytics.metrics.riskScore.toFixed(1)}</p>
              </div>
              <div className="flex items-center">
                {analytics.metrics.riskScore > 50 ? (
                  <TrendingUp className="h-8 w-8 text-red-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Timeline (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="events" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.severityChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.severityChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.eventTypeChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top IP Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topIPs.length > 0 ? (
                analytics.topIPs.map((item, index) => (
                  <div key={item.ip} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-mono text-sm">{item.ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.count} events</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.count / Math.max(...analytics.topIPs.map(i => i.count))) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No IP data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
