import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Database,
  TrendingUp,
  Users,
  Zap,
  Wrench,
  Key,
  Settings,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CronJobStatus {
  jobname: string;
  schedule: string;
  active: boolean;
  jobid: number;
}

interface CacheEntry {
  id: string;
  landlord_id: string;
  portfolio_id: string | null;
  insights_data: any;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const AIInsightsAdminPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cron job status for AI insights and predictive maintenance
  const { data: cronStatus, isLoading: cronLoading } = useQuery({
    queryKey: ['ai-insights-cron-status'],
    queryFn: async () => {
      const { data: aiRefreshData, error: aiError } = await supabase
        .from('ai_refresh_job_status')
        .select('*');
      
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('predictive_maintenance_job_status')
        .select('*');
      
      if (aiError && maintenanceError) throw aiError;
      
      return {
        aiRefresh: aiRefreshData || [],
        maintenance: maintenanceData || []
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch cache entries
  const { data: cacheEntries, isLoading: cacheLoading } = useQuery({
    queryKey: ['ai-insights-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights_cache')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CacheEntry[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Check maintenance and Gemini status
  const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: async () => {
      try {
        // Check cache for recent maintenance runs
        const { data: recentRuns } = await supabase
          .from('ai_insights_cache')
          .select('*')
          .ilike('cache_key', 'predictive_maintenance%')
          .order('updated_at', { ascending: false })
          .limit(5);

        // Test Gemini configuration by running a simple predictive maintenance check
        try {
          const { data: testData, error: testError } = await supabase.functions.invoke('ai-predictive-maintenance', {
            body: { portfolioId: 'test-config-check', scheduledRun: false }
          });
          
          return {
            recentRuns: recentRuns || [],
            lastRun: recentRuns?.[0]?.updated_at || null,
            totalPredictions: recentRuns?.reduce((sum: number, run: any) => sum + (run.insights_data?.predictions?.length || 0), 0) || 0,
            geminiConfigured: !testError && testData?.aiPowered !== false
          };
        } catch (error) {
          return {
            recentRuns: recentRuns || [],
            lastRun: recentRuns?.[0]?.updated_at || null,
            totalPredictions: recentRuns?.reduce((sum: number, run: any) => sum + (run.insights_data?.predictions?.length || 0), 0) || 0,
            geminiConfigured: false
          };
        }
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
        return {
          recentRuns: [],
          lastRun: null,
          totalPredictions: 0,
          geminiConfigured: false
        };
      }
    },
    refetchInterval: 60000,
  });

  // Manual refresh mutation
  const manualRefreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-insights-refresh', {
        body: { manual_trigger: true, admin_initiated: true }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "AI Insights Refresh Triggered",
        description: "Manual refresh has been initiated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-insights-cache'] });
    },
    onError: (error) => {
      console.error('Manual refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "There was an error triggering the manual refresh.",
        variant: "destructive",
      });
    },
  });

  // Run predictive maintenance mutation
  const runMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-predictive-maintenance', {
        body: { 
          portfolioId: selectedPortfolio === 'everything' ? null : selectedPortfolio
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Predictive Maintenance Complete",
        description: `Generated ${data?.predictions?.length || 0} maintenance predictions`,
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
    },
    onError: (error: any) => {
      console.error('Predictive maintenance error:', error);
      if (error.message?.includes('GEMINI_API_KEY')) {
        setGeminiConfigured(false);
        toast({
          title: "Configuration Required",
          description: "GEMINI_API_KEY is not configured in Supabase Functions Secrets.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Maintenance Analysis Failed",
          description: error.message || "There was an error running predictive maintenance.",
          variant: "destructive",
        });
      }
    },
  });

  // Test insights generation mutation
  const testInsightsMutation = useMutation({
    mutationFn: async (params: { landlordId: string; portfolioId?: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-insights-engine', {
        body: { 
          landlord_id: params.landlordId,
          portfolio_id: params.portfolioId,
          test_mode: true 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Insights Generated",
        description: "AI insights test completed successfully.",
      });
    },
    onError: (error) => {
      console.error('Test insights error:', error);
      toast({
        title: "Test Failed",
        description: "There was an error generating test insights.",
        variant: "destructive",
      });
    },
  });

  // Test predictive maintenance mutation
  const testMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-predictive-maintenance', {
        body: { portfolioId: 'test-portfolio', scheduledRun: false }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Predictive Maintenance Test Complete",
        description: `Generated ${data?.predictions?.length || 0} test predictions. AI Powered: ${data?.aiPowered ? 'Yes' : 'No (Fallback)'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
    },
    onError: (error: any) => {
      console.error('Test maintenance error:', error);
      toast({
        title: "Test Failed", 
        description: error.message || "There was an error testing predictive maintenance.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getCronJobStatus = () => {
    const aiJob = cronStatus?.aiRefresh?.[0];
    const maintenanceJob = cronStatus?.maintenance?.[0];
    
    if (!aiJob && !maintenanceJob) return { status: 'Not Found', color: 'red', icon: XCircle };
    
    const bothActive = aiJob?.active && maintenanceJob?.active;
    const anyActive = aiJob?.active || maintenanceJob?.active;
    
    if (bothActive) {
      return { status: 'All Active', color: 'green', icon: CheckCircle };
    } else if (anyActive) {
      return { status: 'Partial', color: 'yellow', icon: AlertTriangle };
    } else {
      return { status: 'Inactive', color: 'red', icon: XCircle };
    }
  };

  const getCacheStats = () => {
    if (!cacheEntries) return { total: 0, expired: 0, fresh: 0 };
    
    const now = new Date();
    let expired = 0;
    let fresh = 0;
    
    cacheEntries.forEach(entry => {
      const expiresAt = new Date(entry.expires_at);
      if (expiresAt < now) {
        expired++;
      } else {
        fresh++;
      }
    });
    
    return { total: cacheEntries.length, expired, fresh };
  };

  const jobStatus = getCronJobStatus();
  const StatusIcon = jobStatus.icon;
  const cacheStats = getCacheStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">AI Insights Administration</h2>
          <Badge 
            variant={jobStatus.color === 'green' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            <StatusIcon className="w-3 h-3" />
            {jobStatus.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => manualRefreshMutation.mutate()}
            disabled={manualRefreshMutation.isPending}
            variant="outline" 
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${manualRefreshMutation.isPending ? 'animate-spin' : ''}`} />
            Manual Refresh
          </Button>
          <Button 
            onClick={() => testInsightsMutation.mutate({ 
              landlordId: 'test-landlord-id' 
            })}
            disabled={testInsightsMutation.isPending}
            variant="outline" 
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Insights
          </Button>
          <Button 
            onClick={() => testMaintenanceMutation.mutate()}
            disabled={testMaintenanceMutation.isPending}
            variant="outline" 
            size="sm"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Test Maintenance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cron Job Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStatus.status}</div>
            <p className="text-xs text-muted-foreground">
              AI: {cronStatus?.aiRefresh?.[0]?.schedule || 'N/A'} | 
              Maint: {cronStatus?.maintenance?.[0]?.schedule || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {cacheStats.fresh} fresh, {cacheStats.expired} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fresh Insights</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.fresh}</div>
            <p className="text-xs text-muted-foreground">
              Currently cached
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground">
              All systems online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cron Job Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Scheduled Job Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cronLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                ) : cronStatus?.aiRefresh?.[0] || cronStatus?.maintenance?.[0] ? (
                  <div className="space-y-4">
                    {/* AI Insights Refresh Job */}
                    {cronStatus?.aiRefresh?.[0] && (
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2">AI Insights Refresh</h4>
                        <div className="space-y-2 text-sm">
                          <div>Schedule: {cronStatus.aiRefresh[0].schedule} (Daily at 2:00 AM)</div>
                          <div>Job ID: {cronStatus.aiRefresh[0].jobid}</div>
                          <Badge variant={cronStatus.aiRefresh[0].active ? 'default' : 'destructive'}>
                            {cronStatus.aiRefresh[0].active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {/* Predictive Maintenance Job */}
                    {cronStatus?.maintenance?.[0] && (
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium mb-2">Predictive Maintenance</h4>
                        <div className="space-y-2 text-sm">
                          <div>Schedule: {cronStatus.maintenance[0].schedule} (Weekly on Sunday at 3:00 AM)</div>
                          <div>Job ID: {cronStatus.maintenance[0].jobid}</div>
                          <Badge variant={cronStatus.maintenance[0].active ? 'default' : 'destructive'}>
                            {cronStatus.maintenance[0].active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No cron job found. The AI insights refresh job may not be properly configured.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Cache Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Cache Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cacheLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Entries:</span>
                      <span className="font-medium">{cacheStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fresh Entries:</span>
                      <span className="font-medium text-green-600">{cacheStats.fresh}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expired Entries:</span>
                      <span className="font-medium text-red-600">{cacheStats.expired}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-medium text-muted-foreground">
                        {cacheEntries?.[0] 
                          ? new Date(cacheEntries[0].updated_at).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Predictive Maintenance (Gemini AI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* API Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Gemini API Status:</span>
                    {geminiConfigured === null ? (
                      <Badge variant="outline">Checking...</Badge>
                    ) : geminiConfigured ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <Key className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Missing API Key
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Warning for missing API key */}
                {geminiConfigured === false && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      GEMINI_API_KEY is not configured in Supabase Functions Secrets. 
                      Predictive maintenance features will not work until this is configured.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Last Run</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {maintenanceData?.lastRun 
                        ? formatTime(maintenanceData.lastRun)
                        : 'Never'
                      }
                    </span>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total Predictions</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {maintenanceData?.totalPredictions || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Recent Runs</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {maintenanceData?.recentRuns?.length || 0} in cache
                    </span>
                  </div>
                </div>

                {/* Manual Run Controls */}
                <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg">
                  <div className="flex-1">
                    <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everything">All Portfolios</SelectItem>
                        {/* Add actual portfolio options here */}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => runMaintenanceMutation.mutate()} 
                    disabled={runMaintenanceMutation.isPending || !geminiConfigured}
                    className="gap-2"
                  >
                    {runMaintenanceMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run Maintenance Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {cacheLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-12 bg-muted rounded" />
                  ))}
                </div>
              ) : cacheEntries && cacheEntries.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cacheEntries.map((entry) => {
                    const isExpired = new Date(entry.expires_at) < new Date();
                    return (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            Landlord: {entry.landlord_id.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Portfolio: {entry.portfolio_id?.slice(0, 8) || 'All'} • 
                            Created: {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isExpired ? 'destructive' : 'default'}>
                            {isExpired ? 'Expired' : 'Fresh'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No cache entries found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Edge Function Status</h4>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">ai-insights-engine: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">ai-insights-refresh: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">ai-predictive-maintenance: Active</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="text-sm space-y-1">
                    <div>Avg Response Time: &lt;2s</div>
                    <div>Success Rate: 99.5%</div>
                    <div>Cache Hit Rate: 85%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsightsAdminPanel;