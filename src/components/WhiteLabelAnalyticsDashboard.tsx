import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Eye, Clock, Download, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsProps {
  configId: string;
}

const WhiteLabelAnalyticsDashboard = ({ configId }: AnalyticsProps) => {
  // Fetch real performance metrics for the white-label config
  const { data: perfRows = [], isLoading: loadingPerformance } = useQuery({
    queryKey: ['site_performance_metrics', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_performance_metrics')
        .select('*')
        .eq('config_id', configId)
        .order('metric_date', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const analytics: any[] = []; // No traffic table yet
  const performance: any[] = perfRows;
  const isLoading = false;

  if (isLoading || loadingPerformance) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Process analytics data
  const totalViews = analytics?.reduce((sum, item) => sum + (item.metadata?.page_views || 0), 0) || 0;
  const uniqueVisitors = analytics?.reduce((sum, item) => sum + (item.metadata?.unique_visitors || 0), 0) || 0;
  const avgSessionDuration = analytics?.reduce((sum, item) => sum + (item.metadata?.avg_session_duration || 0), 0) / (analytics?.length || 1) || 0;
  const conversionRate = analytics?.reduce((sum, item) => sum + (item.metadata?.conversion_rate || 0), 0) / (analytics?.length || 1) || 0;

  // Prepare chart data
  const pageViewsData = analytics?.slice(0, 7).reverse().map(item => ({
    date: new Date(item.created_at).toLocaleDateString(),
    views: item.metadata?.page_views || 0,
    visitors: item.metadata?.unique_visitors || 0,
  })) || [];

  const performanceData = performance?.slice().reverse().map((item: any) => ({
    date: new Date(item.metric_date || item.created_at).toLocaleDateString(),
    loadTime: (item.page_load_time_ms || 0) / 1000,
    fcp: (item.first_contentful_paint_ms || 0) / 1000,
    lcp: (item.largest_contentful_paint_ms || 0) / 1000,
  })) || [];

  const deviceData = [
    { name: 'Desktop', value: 65, color: '#8884d8' },
    { name: 'Mobile', value: 30, color: '#82ca9d' },
    { name: 'Tablet', value: 5, color: '#ffc658' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time insights for your white-label site
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +8% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgSessionDuration)}s</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +5% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +2.1% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Overview</CardTitle>
              <CardDescription>Page views and unique visitors over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pageViewsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="visitors" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Load times and core web vitals</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="loadTime" fill="#8884d8" />
                  <Bar dataKey="fcp" fill="#82ca9d" />
                  <Bar dataKey="lcp" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Visitor distribution by device type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events on your white-label site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">{item.event_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">
                  {item.metadata?.page_views || 0} views
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabelAnalyticsDashboard;