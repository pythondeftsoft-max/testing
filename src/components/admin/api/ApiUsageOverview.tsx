import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgentApiStats, useActiveApiKeysCount, TimeRange } from '@/hooks/useAgentApiStats';
import { Activity, CheckCircle, XCircle, Clock, Key, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

export const ApiUsageOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { data: stats, isLoading: statsLoading } = useAgentApiStats(timeRange);
  const { data: activeKeysCount, isLoading: keysLoading } = useActiveApiKeysCount();

  const successRate = stats && stats.total_requests > 0
    ? ((stats.success_count / stats.total_requests) * 100).toFixed(1)
    : '0.0';

  const topEndpointsData = stats?.top_endpoints || [];
  const requestsByDayData = (stats?.requests_by_day || []).reverse();
  const errorTypesData = stats?.error_types || [];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        {TIME_RANGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={timeRange === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (stats?.total_requests || 0).toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-success">{successRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-destructive">
                  {statsLoading ? '...' : (stats?.error_count || 0).toLocaleString()}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : `${stats?.avg_duration_ms || 0}ms`}
                </p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-2xl font-bold">
                  {keysLoading ? '...' : activeKeysCount}
                </p>
              </div>
              <Key className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Requests Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsByDayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={requestsByDayData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => [value, 'Requests']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No request data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Top Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topEndpointsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topEndpointsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="endpoint" 
                    width={150}
                    fontSize={11}
                    tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Distribution */}
      {errorTypesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Error Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={errorTypesData}
                    dataKey="count"
                    nameKey="response_status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ response_status }) => `${response_status}`}
                  >
                    {errorTypesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {errorTypesData.map((item, index) => (
                  <Badge
                    key={item.response_status}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {item.response_status}: {item.count} requests
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
