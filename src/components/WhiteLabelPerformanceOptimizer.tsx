import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Image, 
  FileText, 
  Globe, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Settings,
  Smartphone,
  Monitor
} from 'lucide-react';

interface PerformanceOptimizerProps {
  configId: string;
}

const WhiteLabelPerformanceOptimizer = ({ configId }: PerformanceOptimizerProps) => {
  // Mock performance data
  const performanceMetrics = {
    overallScore: 87,
    loadTime: 1.2,
    fcp: 0.8,
    lcp: 1.5,
    cls: 0.02,
    fid: 45,
    imageOptimization: 78,
    codeOptimization: 92,
    cacheOptimization: 85,
  };

  const optimizationRecommendations = [
    {
      id: 1,
      category: 'Images',
      title: 'Optimize image formats',
      description: 'Convert PNG images to WebP format for better compression',
      impact: 'High',
      effort: 'Low',
      savings: '32% size reduction',
      status: 'pending',
    },
    {
      id: 2,
      category: 'Code',
      title: 'Enable code splitting',
      description: 'Split JavaScript bundles to reduce initial load time',
      impact: 'Medium',
      effort: 'Medium',
      savings: '0.3s load time',
      status: 'completed',
    },
    {
      id: 3,
      category: 'Cache',
      title: 'Optimize cache headers',
      description: 'Set longer cache times for static assets',
      impact: 'Medium',
      effort: 'Low',
      savings: '45% faster repeat visits',
      status: 'pending',
    },
    {
      id: 4,
      category: 'Critical CSS',
      title: 'Inline critical CSS',
      description: 'Inline above-the-fold CSS to reduce render blocking',
      impact: 'High',
      effort: 'High',
      savings: '0.4s to first paint',
      status: 'pending',
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const deviceMetrics = [
    { device: 'Desktop', score: 92, loadTime: 1.1, icon: Monitor },
    { device: 'Mobile', score: 78, loadTime: 1.8, icon: Smartphone },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Optimizer</h2>
          <p className="text-muted-foreground">
            Monitor and optimize your white-label site performance
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Run Audit
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(performanceMetrics.overallScore)}`}>
              {performanceMetrics.overallScore}/100
            </div>
            <Progress value={performanceMetrics.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.loadTime}s</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              15% faster than average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Contentful Paint</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.fcp}s</div>
            <p className="text-xs text-green-600">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Good performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Contentful Paint</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.lcp}s</div>
            <p className="text-xs text-yellow-600">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Needs improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Device Performance</CardTitle>
          <CardDescription>
            Performance metrics across different device types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deviceMetrics.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <device.icon className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{device.device}</p>
                    <p className="text-sm text-muted-foreground">
                      {device.loadTime}s load time
                    </p>
                  </div>
                </div>
                <Badge variant={getScoreBadgeVariant(device.score)}>
                  {device.score}/100
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="assets">Asset Optimization</TabsTrigger>
          <TabsTrigger value="caching">Caching Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Actionable suggestions to improve your site performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizationRecommendations.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant={getImpactBadgeVariant(rec.impact)} className="text-xs">
                          {rec.impact} Impact
                        </Badge>
                        {rec.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Category: {rec.category}</span>
                        <span>Effort: {rec.effort}</span>
                        <span className="font-medium text-green-600">{rec.savings}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {rec.status === 'completed' ? (
                        <Badge variant="default">Completed</Badge>
                      ) : (
                        <Button size="sm" variant="outline">
                          Apply Fix
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Image Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compression Rate</span>
                    <Badge variant="outline">{performanceMetrics.imageOptimization}%</Badge>
                  </div>
                  <Progress value={performanceMetrics.imageOptimization} />
                  <p className="text-xs text-muted-foreground">
                    22 images optimized, 3 pending
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Code Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bundle Size</span>
                    <Badge variant="outline">{performanceMetrics.codeOptimization}%</Badge>
                  </div>
                  <Progress value={performanceMetrics.codeOptimization} />
                  <p className="text-xs text-muted-foreground">
                    JavaScript minified and compressed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Caching Strategy
              </CardTitle>
              <CardDescription>
                Configure caching rules for optimal performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Static Assets</p>
                    <p className="text-sm text-muted-foreground">CSS, JS, Images</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">1 year</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Cache duration</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">HTML Pages</p>
                    <p className="text-sm text-muted-foreground">Dynamic content</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">5 minutes</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Cache duration</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">API Responses</p>
                    <p className="text-sm text-muted-foreground">Data endpoints</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">No cache</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Always fresh</p>
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

export default WhiteLabelPerformanceOptimizer;