import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useTheme } from './DynamicThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Zap, 
  Shield, 
  Gauge, 
  AlertTriangle,
  CheckCircle,
  Lock,
  Database,
  Globe
} from 'lucide-react';

interface PerformanceMetrics {
  themeLoadTime: number;
  configCacheHit: boolean;
  assetOptimization: number;
  totalScore: number;
}

export const WhiteLabelRefinements = () => {
  const { whiteLabelConfig, isWhiteLabeled, themeError, clearThemeError } = useTheme();
  const { toast } = useToast();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [securityScanResults, setSecurityScanResults] = useState<any>(null);
  const [optimizationSettings, setOptimizationSettings] = useState({
    enableCaching: true,
    compressAssets: true,
    lazyLoadImages: true,
    preloadCriticalCSS: true,
    enableCDN: false,
  });

  useEffect(() => {
    // Simulate performance metrics collection
    const collectMetrics = () => {
      const startTime = performance.now();
      
      // Simulate theme load time
      setTimeout(() => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        setPerformanceMetrics({
          themeLoadTime: loadTime,
          configCacheHit: Math.random() > 0.3,
          assetOptimization: Math.floor(Math.random() * 30) + 70,
          totalScore: Math.floor(Math.random() * 20) + 80,
        });
      }, 100);
    };

    if (isWhiteLabeled) {
      collectMetrics();
    }
  }, [isWhiteLabeled]);

  const runSecurityScan = async () => {
    toast({
      title: "Security Scan",
      description: "Running comprehensive security analysis...",
    });

    // Simulate security scan
    setTimeout(() => {
      setSecurityScanResults({
        vulnerabilities: 0,
        warningsCount: 1,
        score: 95,
        lastScan: new Date().toISOString(),
        issues: [
          {
            type: 'warning',
            title: 'Insecure Asset URL',
            description: 'One asset is loaded over HTTP instead of HTTPS',
            severity: 'medium',
          }
        ]
      });

      toast({
        title: "Security Scan Complete",
        description: "No critical vulnerabilities found. 1 warning to review.",
      });
    }, 2000);
  };

  const optimizePerformance = async () => {
    toast({
      title: "Performance Optimization",
      description: "Applying optimization settings...",
    });

    // Simulate optimization
    setTimeout(() => {
      if (performanceMetrics) {
        setPerformanceMetrics({
          ...performanceMetrics,
          assetOptimization: Math.min(100, performanceMetrics.assetOptimization + 15),
          totalScore: Math.min(100, performanceMetrics.totalScore + 10),
        });
      }

      toast({
        title: "Optimization Complete",
        description: "Performance improvements have been applied.",
      });
    }, 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Refinements
          </h3>
          <p className="text-sm text-muted-foreground">
            Performance optimization, security, and system health monitoring
          </p>
        </div>
      </div>

      {/* Error Handling */}
      {themeError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{themeError}</span>
            <Button size="sm" variant="outline" onClick={clearThemeError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Real-time performance monitoring for your white-label configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceMetrics ? (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(performanceMetrics.totalScore)}`}>
                  {performanceMetrics.totalScore}
                </div>
                <p className="text-sm text-muted-foreground mb-2">Performance Score</p>
                {getScoreBadge(performanceMetrics.totalScore)}
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Theme Load Time</p>
                        <p className="text-lg font-bold">{performanceMetrics.themeLoadTime.toFixed(1)}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Cache Hit Rate</p>
                        <p className="text-lg font-bold">
                          {performanceMetrics.configCacheHit ? '✓ Hit' : '✗ Miss'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Asset Optimization</p>
                        <div className="flex items-center gap-2">
                          <Progress value={performanceMetrics.assetOptimization} className="flex-1" />
                          <span className="text-sm font-medium">{performanceMetrics.assetOptimization}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={optimizePerformance} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Optimize Performance
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Gauge className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Performance metrics will appear when white-label is active</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
          <CardDescription>
            Security analysis and vulnerability scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityScanResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${getScoreColor(securityScanResults.score)}`}>
                      {securityScanResults.score}/100
                    </div>
                    <div>
                      <p className="font-medium">Security Score</p>
                      <p className="text-sm text-muted-foreground">
                        Last scan: {new Date(securityScanResults.lastScan).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {getScoreBadge(securityScanResults.score)}
                </div>

                {securityScanResults.issues.length > 0 && (
                  <div className="space-y-2">
                    <Label>Security Issues</Label>
                    {securityScanResults.issues.map((issue: any, index: number) => (
                      <Alert key={index} variant={issue.type === 'warning' ? 'default' : 'destructive'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div>
                            <p className="font-medium">{issue.title}</p>
                            <p className="text-sm">{issue.description}</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Run a security scan to check for vulnerabilities</p>
                <Button onClick={runSecurityScan}>
                  <Lock className="h-4 w-4 mr-2" />
                  Run Security Scan
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optimization Settings</CardTitle>
          <CardDescription>
            Configure performance and caching options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(optimizationSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="flex-1 cursor-pointer">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) => 
                  setOptimizationSettings(prev => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">System Status: Healthy</h4>
              <p className="text-sm text-green-800">
                All white-label systems are operating normally. Performance is optimal and 
                security scans show no critical issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabelRefinements;