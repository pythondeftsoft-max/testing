import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SitePerformanceMonitorProps {
  configId: string;
}

interface PerformanceMetrics {
  page_load_time_ms: number;
  first_contentful_paint_ms: number;
  largest_contentful_paint_ms: number;
  cumulative_layout_shift: number;
  performance_score: number;
  seo_score: number;
  accessibility_score: number;
  best_practices_score: number;
  uptime_percentage: number;
  error_rate_percentage: number;
}

const SitePerformanceMonitor = ({ configId }: SitePerformanceMonitorProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch performance metrics
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['site-performance', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_performance_metrics')
        .select('*')
        .eq('config_id', configId)
        .order('metric_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] as PerformanceMetrics | null;
    },
  });

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      // In a real implementation, this would trigger a performance audit
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate audit
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

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

  // Mock data for demonstration
  const mockMetrics: PerformanceMetrics = {
    page_load_time_ms: 1245,
    first_contentful_paint_ms: 890,
    largest_contentful_paint_ms: 1650,
    cumulative_layout_shift: 0.12,
    performance_score: 87,
    seo_score: 92,
    accessibility_score: 95,
    best_practices_score: 88,
    uptime_percentage: 99.8,
    error_rate_percentage: 0.2
  };

  const currentMetrics = metrics || mockMetrics;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Site Performance
              </CardTitle>
              <CardDescription>
                Real-time performance metrics and Core Web Vitals
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMetrics}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Performance Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(currentMetrics.performance_score)}`}>
                {currentMetrics.performance_score}
              </div>
              <div className="text-sm text-muted-foreground">Performance</div>
              <Progress value={currentMetrics.performance_score} className="mt-2" />
            </div>

            {/* SEO Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(currentMetrics.seo_score)}`}>
                {currentMetrics.seo_score}
              </div>
              <div className="text-sm text-muted-foreground">SEO</div>
              <Progress value={currentMetrics.seo_score} className="mt-2" />
            </div>

            {/* Accessibility Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(currentMetrics.accessibility_score)}`}>
                {currentMetrics.accessibility_score}
              </div>
              <div className="text-sm text-muted-foreground">Accessibility</div>
              <Progress value={currentMetrics.accessibility_score} className="mt-2" />
            </div>

            {/* Best Practices Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(currentMetrics.best_practices_score)}`}>
                {currentMetrics.best_practices_score}
              </div>
              <div className="text-sm text-muted-foreground">Best Practices</div>
              <Progress value={currentMetrics.best_practices_score} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
          <CardDescription>
            Key performance metrics that impact user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First Contentful Paint */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="font-medium">First Contentful Paint</span>
              </div>
              <div className="text-2xl font-bold">
                {(currentMetrics.first_contentful_paint_ms / 1000).toFixed(1)}s
              </div>
              <Badge variant={currentMetrics.first_contentful_paint_ms < 1500 ? 'default' : 'destructive'}>
                {currentMetrics.first_contentful_paint_ms < 1500 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Largest Contentful Paint */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Monitor className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="font-medium">Largest Contentful Paint</span>
              </div>
              <div className="text-2xl font-bold">
                {(currentMetrics.largest_contentful_paint_ms / 1000).toFixed(1)}s
              </div>
              <Badge variant={currentMetrics.largest_contentful_paint_ms < 2500 ? 'default' : 'destructive'}>
                {currentMetrics.largest_contentful_paint_ms < 2500 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>

            {/* Cumulative Layout Shift */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="font-medium">Cumulative Layout Shift</span>
              </div>
              <div className="text-2xl font-bold">
                {currentMetrics.cumulative_layout_shift.toFixed(3)}
              </div>
              <Badge variant={currentMetrics.cumulative_layout_shift < 0.1 ? 'default' : 'destructive'}>
                {currentMetrics.cumulative_layout_shift < 0.1 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime & Reliability */}
      <Card>
        <CardHeader>
          <CardTitle>Uptime & Reliability</CardTitle>
          <CardDescription>
            Site availability and error rates over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Uptime */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Uptime</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {currentMetrics.uptime_percentage}%
                </div>
              </div>
              <Badge variant="default">Excellent</Badge>
            </div>

            {/* Error Rate */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Error Rate</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {currentMetrics.error_rate_percentage}%
                </div>
              </div>
              <Badge variant="secondary">Low</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>
            Suggestions to improve your site performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentMetrics.performance_score < 90 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Optimize images:</strong> Consider using WebP format and lazy loading to improve page load times.
                </AlertDescription>
              </Alert>
            )}
            
            {currentMetrics.largest_contentful_paint_ms > 2500 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Reduce server response time:</strong> Your largest contentful paint could be improved by optimizing server performance.
                </AlertDescription>
              </Alert>
            )}
            
            {currentMetrics.cumulative_layout_shift > 0.1 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Minimize layout shifts:</strong> Ensure images and ads have defined dimensions to prevent content jumping.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SitePerformanceMonitor;