import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboardSkeleton } from '../WhiteLabelLoadingStates';
import { useWhiteLabelAnalytics } from '@/hooks/useWhiteLabelAnalytics';
import { useWhiteLabelApprovalStats } from '@/hooks/useWhiteLabelApprovalStats';
import { WhiteLabelApprovalsTable } from './WhiteLabelApprovalsTable';
import { WhiteLabelDomainsTable } from './WhiteLabelDomainsTable';
import { MetricDisplay } from '@/components/ui/metric-display';
import { subDays } from 'date-fns';
import { AnalyticsEmptyState } from './whitelabel/AnalyticsEmptyState';
import { TestDataGenerator } from './whitelabel/TestDataGenerator';
import { ChartEmptyState } from './whitelabel/ChartEmptyState';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Globe, 
  Palette, 
  Layout,
  Users,
  BarChart3,
  Shield,
  RefreshCw,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

interface WhiteLabelConfig {
  id: string;
  user_id: string;
  company_name?: string;
  white_label_type?: 'hybrid' | 'full';
  admin_approved?: boolean;
  is_active: boolean;
  subscription_tier?: string;
  custom_subdomain?: string;
  custom_domain?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  favicon_url?: string;
  footer_text?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  feature_flags?: any;
  max_custom_css_size?: number;
  landing_page_config?: any;
  email_template_config?: any;
  theme_preset?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    company_name: string;
  } | null;
}

export const WhiteLabelAdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConfig, setSelectedConfig] = useState<WhiteLabelConfig | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Analytics data for overview - memoize to prevent infinite refetch
  const analyticsDateRange = useMemo(() => ({ 
    start: subDays(new Date(), 30), 
    end: new Date() 
  }), []);
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useWhiteLabelAnalytics(analyticsDateRange);
  const { data: approvalStats, isLoading: approvalStatsLoading } = useWhiteLabelApprovalStats();
  
  // Check if we have any analytics data
  const hasAnalyticsData = analytics && analytics.length > 0 && 
    analytics.some(config => config.page_views > 0);
  
  console.log('📊 Analytics State:', { 
    analyticsLoading, 
    hasAnalytics: !!analytics,
    analyticsLength: analytics?.length,
    hasAnalyticsData 
  });

  // Fetch all white label configs
  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['admin-white-label-configs', approvalFilter],
    queryFn: async () => {
      let query = supabase
        .from('white_label_configs')
        .select(`
          *,
          profiles!white_label_configs_user_id_fkey(
            first_name,
            last_name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      // For now, filter by is_active status since admin_approved doesn't exist yet
      if (approvalFilter === 'pending') {
        query = query.eq('is_active', false);
      } else if (approvalFilter === 'approved') {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Get admin stats - simplified for now
  const { data: stats } = useQuery({
    queryKey: ['admin-white-label-stats'],
    queryFn: async () => {
      // Get basic counts from the configs
      const { data: allConfigs } = await supabase
        .from('white_label_configs')
        .select('id, is_active, custom_domain');
      
      const totalConfigs = allConfigs?.length || 0;
      const pendingApproval = allConfigs?.filter(c => !c.is_active).length || 0;
      const activeConfigs = allConfigs?.filter(c => c.is_active).length || 0;
      const customDomains = allConfigs?.filter(c => c.custom_domain).length || 0;
      
      return {
        total_configs: totalConfigs,
        pending_approval: pendingApproval,
        active_configs: activeConfigs,
        custom_domains: customDomains
      };
    },
  });

  // Activate/deactivate config mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ configId, approved }: { configId: string; approved: boolean }) => {
      const updates: any = { is_active: approved };

      const { error } = await supabase
        .from('white_label_configs')
        .update(updates)
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-white-label-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-white-label-stats'] });
      toast({
        title: "Config Updated",
        description: "White label configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating config:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ configId, active }: { configId: string; active: boolean }) => {
      const { error } = await supabase
        .from('white_label_configs')
        .update({ is_active: active })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-white-label-configs'] });
      toast({
        title: "Status Updated",
        description: "Configuration status has been updated.",
      });
    },
  });

  const getStatusBadge = (config: any) => {
    if (config.is_active) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>;
  };

  const getTypeBadge = (type?: string) => {
    if (!type) {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Set</Badge>;
    }
    return type === 'full' ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Full</Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Hybrid</Badge>
    );
  };

  // Calculate analytics totals for overview
  const analyticsTotals = analytics?.reduce((acc, config) => ({
    totalPageViews: acc.totalPageViews + config.page_views,
    totalVisitors: acc.totalVisitors + config.unique_visitors,
    activeConfigs: acc.activeConfigs + (config.page_views > 0 ? 1 : 0),
  }), { totalPageViews: 0, totalVisitors: 0, activeConfigs: 0 }) || 
  { totalPageViews: 0, totalVisitors: 0, activeConfigs: 0 };

  // Prepare chart data
  const topConfigsChartData = analytics
    ?.filter(c => c.page_views > 0)
    .sort((a, b) => b.page_views - a.page_views)
    .slice(0, 5)
    .map(c => ({
      name: c.company_name || c.config_id.slice(0, 8),
      pageViews: c.page_views,
    })) || [];

  const eventTypeData = analytics?.reduce((acc, config) => {
    Object.entries(config.event_counts).forEach(([type, count]) => {
      acc[type] = (acc[type] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const eventChartData = Object.entries(eventTypeData || {})
    .slice(0, 4)
    .map(([name, value]) => ({ name, value }));

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            White Label Management
          </h2>
          <p className="text-muted-foreground">
            Manage white-labeling configurations and approvals
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Configs</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.total_configs || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Pending Approval</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.pending_approval || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.active_configs || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Custom Domains</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.custom_domains || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Analytics Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Analytics Summary (Last 30 Days)</h3>
            
            {/* Always visible metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricDisplay
                label="Total Page Views"
                value={analyticsTotals.totalPageViews}
                icon={<Eye className="h-4 w-4 text-primary" />}
                isLoading={analyticsLoading}
              />
              <MetricDisplay
                label="Unique Visitors"
                value={analyticsTotals.totalVisitors}
                icon={<Users className="h-4 w-4 text-secondary" />}
                isLoading={analyticsLoading}
              />
              <MetricDisplay
                label="Active Configs"
                value={analyticsTotals.activeConfigs}
                icon={<Activity className="h-4 w-4 text-accent" />}
                isLoading={analyticsLoading}
              />
            </div>

            {/* Empty state when no data */}
            {!hasAnalyticsData && !analyticsLoading && (
              <div className="space-y-4 mb-6">
                <AnalyticsEmptyState />
                {configs && configs.length > 0 && (
                  <TestDataGenerator 
                    configs={configs.map(c => ({ 
                      id: c.id, 
                      company_name: c.company_name || `${c.profiles?.first_name || 'Unknown'} ${c.profiles?.last_name || 'User'}` 
                    }))} 
                    onDataGenerated={() => {
                      refetchAnalytics();
                      refetch();
                    }} 
                  />
                )}
              </div>
            )}

            {/* Charts - show when we have data */}
            {hasAnalyticsData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {topConfigsChartData.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Performing Configs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={topConfigsChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="pageViews" fill="hsl(var(--primary))" name="Page Views" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <ChartEmptyState 
                    title="No Page Views Yet" 
                    description="Page view data will appear here once visitors access your white-labeled sites."
                    icon="bar"
                  />
                )}

                {eventChartData.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Event Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={eventChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={60}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                          >
                            {eventChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <ChartEmptyState 
                    title="No Events Tracked" 
                    description="Event tracking data will be displayed here once users interact with your white-labeled sites."
                    icon="pie"
                  />
                )}
              </div>
            )}
          </div>

          {/* Configurations List */}
          <div className="grid gap-4">
            {configs?.map((config: any) => (
              <Card key={config.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        {config.company_name || `${config.profiles?.first_name || 'Unknown'} ${config.profiles?.last_name || 'User'}`}
                      </h3>
                      {getStatusBadge(config)}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {config.subscription_tier || 'Free'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {config.custom_subdomain && (
                        <p>Subdomain: {config.custom_subdomain}.lovable.app</p>
                      )}
                      {config.custom_domain && (
                        <p>Domain: {config.custom_domain}</p>
                      )}
                      <p>Created: {new Date(config.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({ 
                        configId: config.id, 
                        active: !config.is_active 
                      })}
                    >
                      {config.is_active ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                      {config.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedConfig(config)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <div className="space-y-6">
            {/* Approval Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvalStatsLoading ? (
                    <div className="text-2xl font-bold">-</div>
                  ) : (
                    <div className="text-2xl font-bold">{approvalStats?.pendingCount || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Approved (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvalStatsLoading ? (
                    <div className="text-2xl font-bold">-</div>
                  ) : (
                    <div className="text-2xl font-bold text-green-600">{approvalStats?.approvedThisMonth || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Configurations approved</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rejected (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvalStatsLoading ? (
                    <div className="text-2xl font-bold">-</div>
                  ) : (
                    <div className="text-2xl font-bold text-red-600">{approvalStats?.rejectedThisMonth || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Configurations rejected</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Review Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvalStatsLoading ? (
                    <div className="text-2xl font-bold">-</div>
                  ) : (
                    <div className="text-2xl font-bold">{approvalStats?.averageReviewTimeHours || 0}h</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Hours to review</p>
                </CardContent>
              </Card>
            </div>

            {/* Approval Manager Component */}
            <WhiteLabelApprovalsTable />
          </div>
        </TabsContent>

        <TabsContent value="domains" className="space-y-6">
          {/* Domain Management Table */}
          <WhiteLabelDomainsTable />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Management</CardTitle>
              <CardDescription>
                Manage email templates and theme presets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Template management system will be implemented here. This includes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Email template library</li>
                <li>Theme preset management</li>
                <li>Template versioning and approval</li>
                <li>Usage analytics and metrics</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Detail Modal (placeholder) */}
      {selectedConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Configuration Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedConfig(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <p className="font-medium">{selectedConfig.company_name}</p>
                </div>
                <div>
                  <Label>Subscription Tier</Label>
                  <p className="font-medium">{selectedConfig.subscription_tier || 'Free'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConfig)}
                  </div>
                </div>
                {/* Add more configuration details here */}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};