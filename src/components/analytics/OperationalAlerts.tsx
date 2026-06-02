import React from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AlertData {
  id: string;
  type: 'good' | 'warning' | 'critical';
  title: string;
  description: string;
  value: string;
  trend: number[];
  status: 'active' | 'resolved';
  timestamp: string;
}

interface OperationalAlertsProps {
  loading: boolean;
}

const OperationalAlerts = ({ loading }: OperationalAlertsProps) => {
  // Mock operational health data
  const systemHealthData: AlertData[] = [
    {
      id: '1',
      type: 'good',
      title: 'Database Performance',
      description: 'Query response times within normal range',
      value: '95ms avg',
      trend: [98, 92, 95, 89, 95, 91, 95],
      status: 'active',
      timestamp: '2 min ago'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Email Queue Length',
      description: 'Elevated email queue, processing delays possible',
      value: '342 pending',
      trend: [120, 145, 189, 234, 298, 321, 342],
      status: 'active',
      timestamp: '5 min ago'
    },
    {
      id: '3',
      type: 'critical',
      title: 'Vacant Property Ratio',
      description: 'Vacancy rate above 25% threshold',
      value: '28.5%',
      trend: [18, 20, 22, 24, 26, 27, 28.5],
      status: 'active',
      timestamp: '1 hour ago'
    },
    {
      id: '4',
      type: 'good',
      title: 'Application Processing',
      description: 'All applications processed within SLA',
      value: '100% on-time',
      trend: [95, 97, 98, 96, 99, 100, 100],
      status: 'active',
      timestamp: '10 min ago'
    },
    {
      id: '5',
      type: 'warning',
      title: 'Maintenance Response Time',
      description: 'Average response time increasing',
      value: '4.2 days',
      trend: [2.8, 3.1, 3.4, 3.7, 3.9, 4.1, 4.2],
      status: 'active',
      timestamp: '30 min ago'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'good':
        return 'bg-emerald-100 text-emerald-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendColor = (type: string) => {
    switch (type) {
      case 'good':
        return '#10b981'; // emerald-500
      case 'warning':
        return '#f59e0b'; // amber-500
      case 'critical':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const criticalAlerts = systemHealthData.filter(alert => alert.type === 'critical').length;
  const warningAlerts = systemHealthData.filter(alert => alert.type === 'warning').length;
  const goodAlerts = systemHealthData.filter(alert => alert.type === 'good').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Operational Health & Alerts</h3>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-emerald-600">
            {goodAlerts} Good
          </Badge>
          <Badge variant="outline" className="text-amber-600">
            {warningAlerts} Warning
          </Badge>
          <Badge variant="outline" className="text-red-600">
            {criticalAlerts} Critical
          </Badge>
        </div>
      </div>

      {/* Overall System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Operational</div>
            <p className="text-xs text-muted-foreground">All core systems functional</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247ms</div>
            <p className="text-xs text-emerald-600">-12ms vs last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.98%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemHealthData.map((alert) => (
          <Card key={alert.id} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">{alert.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
              {getIcon(alert.type)}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold">{alert.value}</div>
                  <Badge className={getStatusColor(alert.type)}>
                    {alert.type}
                  </Badge>
                </div>
                
                {/* Mini trend sparkline */}
                <div className="h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={alert.trend.map((value, index) => ({ value, index }))}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={getTrendColor(alert.type)} 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Updated {alert.timestamp}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md">Recent Alert Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '10:45 AM', type: 'resolved', message: 'Database connection pool restored to normal levels' },
              { time: '10:23 AM', type: 'warning', message: 'Email queue length increased above threshold (342 pending)' },
              { time: '9:15 AM', type: 'critical', message: 'Vacancy rate exceeded 25% threshold (28.5%)' },
              { time: '8:45 AM', type: 'resolved', message: 'Application processing delays resolved' },
              { time: '8:20 AM', type: 'warning', message: 'Maintenance response time trending upward' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded border-l-2 border-l-gray-200">
                <div className="text-xs text-muted-foreground min-w-[60px]">
                  {activity.time}
                </div>
                <div className="flex-1">
                  <div className="text-sm">{activity.message}</div>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    activity.type === 'resolved' ? 'text-emerald-600' :
                    activity.type === 'warning' ? 'text-amber-600' :
                    'text-red-600'
                  }
                >
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalAlerts;