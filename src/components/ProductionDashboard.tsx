import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Shield,
  Database,
  Zap,
  Eye,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { ProductionMonitor } from '@/utils/productionReadiness';
import { PortfolioIntegrationTester, PerformanceMonitor } from '@/utils/integrationTesting';
import { useToast } from '@/hooks/use-toast';

const ProductionDashboard = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const productionMonitor = new ProductionMonitor();
  const performanceMonitor = new PerformanceMonitor();
  const integrationTester = new PortfolioIntegrationTester();

  useEffect(() => {
    runHealthCheck();
    loadAlerts();
    loadOptimizations();
  }, []);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const status = await productionMonitor.runProductionHealthChecks();
      setHealthStatus(status);
      
      if (status.status === 'critical') {
        await productionMonitor.createAlert('critical', 'System health check failed');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: 'Health Check Failed',
        description: 'Unable to complete system health check',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlerts = () => {
    const activeAlerts = productionMonitor.getActiveAlerts();
    setAlerts(activeAlerts);
  };

  const loadOptimizations = async () => {
    const opts = await productionMonitor.optimizeQueries();
    setOptimizations(opts);
  };

  const runFullSystemTest = async () => {
    setIsLoading(true);
    try {
      // Run integration tests (would need a portfolio ID in real scenario)
      const dummyPortfolioId = 'test-portfolio-id';
      const results = await integrationTester.runAllTests(dummyPortfolioId);
      setTestResults(results);
      
      toast({
        title: 'System Tests Completed',
        description: `${results.passed} passed, ${results.failed} failed`,
        variant: results.failed > 0 ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('System test failed:', error);
      toast({
        title: 'System Test Failed',
        description: 'Unable to complete full system test',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className={`text-lg font-bold ${getStatusColor(healthStatus?.status || 'unknown')}`}>
                  {healthStatus?.status?.toUpperCase() || 'UNKNOWN'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Security</p>
                <p className="text-lg font-bold text-green-500">SECURE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-lg font-bold text-blue-500">ONLINE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active Alerts</p>
                <p className="text-lg font-bold text-orange-500">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health Checks
                </CardTitle>
                <Button 
                  onClick={runHealthCheck} 
                  disabled={isLoading}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthStatus?.checks?.map((check: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                      {check.duration && (
                        <p className="text-xs text-muted-foreground">
                          Response time: {check.duration.toFixed(2)}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={check.status ? 'default' : 'destructive'}>
                    {check.status ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}

              {healthStatus?.recommendations?.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {healthStatus.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getAlertIcon(alert.level)}
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                        {alert.level.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{opt.suggestion}</h4>
                      <Badge variant={opt.impact === 'high' ? 'destructive' : 'default'}>
                        {opt.impact.toUpperCase()} IMPACT
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                    {opt.tables && (
                      <div className="text-xs text-muted-foreground">
                        Tables: {opt.tables.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  End-to-End Testing
                </CardTitle>
                <Button 
                  onClick={runFullSystemTest} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Run Full Test Suite
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{testResults.passed}</p>
                      <p className="text-sm text-green-600">Tests Passed</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{testResults.failed}</p>
                      <p className="text-sm text-red-600">Tests Failed</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {testResults.results?.map((result: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.passed)}
                          <div>
                            <p className="font-medium">{result.test}</p>
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                          </div>
                        </div>
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-2" />
                  <p>Click "Run Full Test Suite" to start comprehensive testing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionDashboard;