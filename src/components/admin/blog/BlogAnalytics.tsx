import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, Eye, TrendingUp, Users, Clock, FileText, Search, Target, 
  CheckCircle, AlertTriangle, Loader2, Sparkles
} from 'lucide-react';
import { useBlogAnalytics, useGenerateTestAnalytics } from '@/hooks/useBlogAnalytics';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const BlogAnalytics = () => {
  const [timeRange, setTimeRange] = useState<number>(30);
  const { data: analytics, isLoading } = useBlogAnalytics(timeRange);
  const generateTestData = useGenerateTestAnalytics();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  const hasTrafficData = analytics && analytics.dailyData.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Analytics</h2>
          <p className="text-muted-foreground">Track your blog's performance and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateTestData.mutate()}
            disabled={generateTestData.isPending}
          >
            {generateTestData.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Test Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricDisplay
          label="Total Posts"
          value={analytics?.totalPosts || 0}
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricDisplay
          label="Published"
          value={analytics?.publishedPosts || 0}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <MetricDisplay
          label={`Views (${timeRange}d)`}
          value={analytics?.totalViews || 0}
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricDisplay
          label={`Visitors (${timeRange}d)`}
          value={analytics?.uniqueVisitors || 0}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Traffic Overview Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Traffic Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasTrafficData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Page Views"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Unique Visitors"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary) / 0.2)"
                    stackId="2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No traffic data yet</p>
                <p className="text-sm">Use "Generate Test Data" to preview the chart</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Avg. Bounce Rate</span>
              </div>
              <span className="font-medium">{analytics?.avgBounceRate?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Avg. Session Duration</span>
              </div>
              <span className="font-medium">{formatTime(analytics?.avgSessionDuration || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Organic Traffic</span>
              </div>
              <span className="font-medium">{analytics?.organicTraffic?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Avg. Views per Post</span>
              </div>
              <span className="font-medium">
                {analytics?.publishedPosts && analytics.publishedPosts > 0 
                  ? Math.round((analytics?.totalViews || 0) / analytics.publishedPosts)
                  : 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SEO Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              SEO Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Overall Score</span>
                <Badge variant={analytics?.seoHealth.score >= 80 ? 'default' : 'secondary'}>
                  {analytics?.seoHealth.score || 0}%
                </Badge>
              </div>
              <Progress value={analytics?.seoHealth.score || 0} className="h-2" />
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {analytics?.seoHealth.missingTitles === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Meta Titles</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics?.seoHealth.missingTitles === 0 
                    ? 'All set' 
                    : `${analytics?.seoHealth.missingTitles} missing`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {analytics?.seoHealth.missingDescriptions === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Meta Descriptions</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics?.seoHealth.missingDescriptions === 0 
                    ? 'All set' 
                    : `${analytics?.seoHealth.missingDescriptions} missing`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {analytics?.seoHealth.missingAltText === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Image Alt Text</span>
                </div>
                <span className="text-muted-foreground">
                  {analytics?.seoHealth.missingAltText === 0 
                    ? 'All set' 
                    : `${analytics?.seoHealth.missingAltText} missing`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Top Performing Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.topPosts && analytics.topPosts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topPosts.map((post, index) => (
                <div key={post.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-md">{post.title}</p>
                      <p className="text-xs text-muted-foreground">/{post.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{post.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No published posts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
