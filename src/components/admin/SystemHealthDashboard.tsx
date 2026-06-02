
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { SystemMonitor, EdgeFunctionMonitor, UserActivityTracker } from '@/utils/systemMonitoring';
import { Activity, Database, Wifi, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import SystemMetricsCards from './SystemMetricsCards';
import SystemAlertsPanel from './SystemAlertsPanel';
import SystemPerformanceCharts from './SystemPerformanceCharts';
import SystemLogsViewer from './SystemLogsViewer';
import AIInsightsAdminPanel from './AIInsightsAdminPanel';

const SystemHealthDashboard = () => {
  const [systemMonitor] = useState(() => new SystemMonitor());
  const [edgeFunctionMonitor] = useState(() => new EdgeFunctionMonitor());
  const [activityTracker] = useState(() => new UserActivityTracker());
  const { logSecurityAccess } = useAdminAudit();

  // Log system health dashboard access
  useEffect(() => {
    logSecurityAccess('system_health_view');
  }, []);

  // Fetch system health data
  const { data: systemHealth, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemMonitor.monitorSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get edge function stats
  const { data: edgeFunctionStats } = useQuery({
    queryKey: ['edge-function-stats'],
    queryFn: () => edgeFunctionMonitor.getAllStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Get user activity summary
  const { data: activitySummary } = useQuery({
    queryKey: ['user-activity-summary'],
    queryFn: () => activityTracker.getActivitySummary(),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const handleManualRefresh = () => {
    refetch();
    logSecurityAccess('system_health_manual_refresh');
  };

  const getOverallHealthStatus = () => {
    if (!systemHealth) return { status: 'unknown', color: 'gray' };
    
    switch (systemHealth.status) {
      case 'healthy':
        return { status: 'Healthy', color: 'green', icon: CheckCircle };
      case 'degraded':
        return { status: 'Degraded', color: 'yellow', icon: AlertTriangle };
      case 'critical':
        return { status: 'Critical', color: 'red', icon: XCircle };
      default:
        return { status: 'Unknown', color: 'gray', icon: Activity };
    }
  };

  const healthStatus = getOverallHealthStatus();
  const StatusIcon = healthStatus.icon;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            System Health Dashboard
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6" />
          <h2 className="text-2xl font-bold">System Health Dashboard</h2>
          <Badge 
            variant={healthStatus.color === 'green' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            <StatusIcon className="w-3 h-3" />
            {healthStatus.status}
          </Badge>
        </div>
        <Button onClick={handleManualRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Active Alerts:</strong> {systemHealth.alerts.length} system alert(s) require attention.
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SystemMetricsCards 
            systemHealth={systemHealth}
            edgeFunctionStats={edgeFunctionStats}
            activitySummary={activitySummary}
          />
        </TabsContent>

        <TabsContent value="metrics">
          <SystemMetricsCards 
            systemHealth={systemHealth}
            edgeFunctionStats={edgeFunctionStats}
            activitySummary={activitySummary}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <SystemAlertsPanel 
            alerts={systemHealth?.alerts || []}
            systemMonitor={systemMonitor}
          />
        </TabsContent>

        <TabsContent value="performance">
          <SystemPerformanceCharts 
            systemHealth={systemHealth}
            edgeFunctionStats={edgeFunctionStats}
          />
        </TabsContent>

        <TabsContent value="ai-insights">
          <AIInsightsAdminPanel />
        </TabsContent>

        <TabsContent value="logs">
          <SystemLogsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthDashboard;
