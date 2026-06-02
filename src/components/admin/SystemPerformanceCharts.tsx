
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface SystemPerformanceChartsProps {
  systemHealth: any;
  edgeFunctionStats: any;
}

const SystemPerformanceCharts = ({ systemHealth, edgeFunctionStats }: SystemPerformanceChartsProps) => {
  // Mock data for demonstration - in production this would come from actual metrics
  const responseTimeData = [
    { time: '00:00', database: 120, api: 85, edgeFunctions: 95 },
    { time: '04:00', database: 110, api: 92, edgeFunctions: 88 },
    { time: '08:00', database: 135, api: 110, edgeFunctions: 102 },
    { time: '12:00', database: 145, api: 125, edgeFunctions: 115 },
    { time: '16:00', database: 130, api: 105, edgeFunctions: 98 },
    { time: '20:00', database: 115, api: 95, edgeFunctions: 90 },
  ];

  const errorRateData = [
    { time: '00:00', errors: 2, requests: 1250 },
    { time: '04:00', errors: 1, requests: 890 },
    { time: '08:00', errors: 5, requests: 2100 },
    { time: '12:00', errors: 8, requests: 2800 },
    { time: '16:00', errors: 3, requests: 2200 },
    { time: '20:00', errors: 2, requests: 1500 },
  ];

  const resourceUsageData = [
    { name: 'CPU', value: 45, color: '#8884d8' },
    { name: 'Memory', value: 62, color: '#82ca9d' },
    { name: 'Storage', value: 28, color: '#ffc658' },
    { name: 'Network', value: 35, color: '#ff7300' },
  ];

  const systemUptimeData = [
    { service: 'Database', uptime: 99.9 },
    { service: 'API', uptime: 99.8 },
    { service: 'Edge Functions', uptime: 99.7 },
    { service: 'Authentication', uptime: 99.95 },
    { service: 'Storage', uptime: 99.85 },
  ];

  return (
    <div className="space-y-6">
      {/* Response Time Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trends (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="database" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Database"
              />
              <Line 
                type="monotone" 
                dataKey="api" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="API"
              />
              <Line 
                type="monotone" 
                dataKey="edgeFunctions" 
                stroke="#ffc658" 
                strokeWidth={2}
                name="Edge Functions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Error Rate Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={errorRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'errors' ? `${value} errors` : `${value} requests`, 
                    name === 'errors' ? 'Errors' : 'Total Requests'
                  ]}
                />
                <Bar dataKey="errors" fill="#ff7300" name="errors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={resourceUsageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {resourceUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Uptime */}
      <Card>
        <CardHeader>
          <CardTitle>Service Uptime (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={systemUptimeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[99, 100]} />
              <YAxis type="category" dataKey="service" width={100} />
              <Tooltip formatter={(value) => [`${value}%`, 'Uptime']} />
              <Bar 
                dataKey="uptime" 
                fill="#82ca9d"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Medium</div>
            <p className="text-xs text-muted-foreground">
              45 req/min average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">
              +12 from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Excellent performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Background jobs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemPerformanceCharts;
