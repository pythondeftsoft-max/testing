import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, Users, Clock, TrendingDown, Search, Target, 
  Link2, ExternalLink, ArrowUpRight, Globe, BarChart2 
} from 'lucide-react';
import { usePostAnalytics } from '@/hooks/usePostAnalytics';
import { usePostLinkClicks } from '@/hooks/useLinkClickAnalytics';
import { useBlogPostTranslationsAll, useCombinedPostAnalytics } from '@/hooks/useTranslateBlogPost';
import { CircularFlag } from '@/components/ui/circular-flag';
import { getLanguageByCode } from '@/lib/languageConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface BlogPostAnalyticsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    title: string;
    slug: string;
    language?: string;
    seo_keywords?: string[] | null;
  } | null;
}

export const BlogPostAnalyticsSheet = ({ open, onOpenChange, post }: BlogPostAnalyticsSheetProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('current');
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(post?.id);

  // Fetch all translations for this post
  const { data: translations = [] } = useBlogPostTranslationsAll(post?.id);
  
  // Determine which post ID to use for analytics
  const analyticsPostId = selectedLanguage === 'current' || selectedLanguage === 'combined' 
    ? post?.id 
    : selectedPostId;
  
  const { data: analytics, isLoading } = usePostAnalytics(
    selectedLanguage === 'combined' ? undefined : analyticsPostId, 
    30
  );
  const { data: linkClicks, isLoading: linkClicksLoading } = usePostLinkClicks(
    selectedLanguage === 'combined' ? undefined : analyticsPostId
  );
  
  // Fetch combined analytics when "combined" is selected
  const { data: combinedAnalytics } = useCombinedPostAnalytics(
    selectedLanguage === 'combined' ? post?.id : undefined, 
    30
  );

  // Handle language selection change
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    if (value !== 'current' && value !== 'combined') {
      const translation = translations.find(t => t.language === value);
      if (translation) {
        setSelectedPostId(translation.id);
      }
    }
  };

  // Reset selected language when post changes
  React.useEffect(() => {
    setSelectedLanguage('current');
    setSelectedPostId(post?.id);
  }, [post?.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasData = analytics && (analytics.totalViews > 0 || analytics.dailyData.length > 0);
  const hasCombinedData = combinedAnalytics && combinedAnalytics.combined.totalViews > 0;
  const showCombined = selectedLanguage === 'combined' && hasCombinedData;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Post Analytics</SheetTitle>
          <SheetDescription className="line-clamp-2">
            {post?.title || 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {/* Language Selector */}
        {translations.length > 1 && (
          <div className="mt-4 mb-2">
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select language" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg z-50">
                {/* Current language option */}
                <SelectItem value="current">
                  <div className="flex items-center gap-2">
                    <CircularFlag 
                      countryCode={getLanguageByCode(post?.language || 'en')?.countryCode || 'GB'} 
                      size={16} 
                    />
                    <span>{getLanguageByCode(post?.language || 'en')?.nativeName || 'English'}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px]">current</Badge>
                  </div>
                </SelectItem>

                {/* Other translations */}
                {translations
                  .filter(t => t.id !== post?.id)
                  .map((translation) => {
                    const lang = getLanguageByCode(translation.language || 'en');
                    return (
                      <SelectItem key={translation.id} value={translation.language || 'en'}>
                        <div className="flex items-center gap-2">
                          <CircularFlag countryCode={lang?.countryCode || 'GB'} size={16} />
                          <span>{lang?.nativeName || translation.language}</span>
                        </div>
                      </SelectItem>
                    );
                  })}

                {/* Combined Total option */}
                <SelectItem value="combined">
                  <div className="flex items-center gap-2 text-primary">
                    <BarChart2 className="h-4 w-4" />
                    <span className="font-medium">Combined Total</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : showCombined ? (
          /* Combined Analytics View */
          <div className="space-y-6 mt-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Combined Analytics (All Languages)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{combinedAnalytics.combined.totalViews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unique Visitors</p>
                    <p className="text-2xl font-bold">{combinedAnalytics.combined.uniqueVisitors.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Bounce Rate</p>
                    <p className="text-2xl font-bold">{combinedAnalytics.combined.avgBounceRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Organic Traffic</p>
                    <p className="text-2xl font-bold">{combinedAnalytics.combined.organicTraffic.toLocaleString()}</p>
                  </div>
                </div>

                {/* By Language Breakdown */}
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Views by Language</p>
                  <div className="space-y-3">
                    {combinedAnalytics.byLanguage.map((langData) => {
                      const lang = getLanguageByCode(langData.language);
                      return (
                        <div key={langData.language} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <CircularFlag countryCode={lang?.countryCode || 'GB'} size={14} />
                              <span>{lang?.nativeName || langData.language}</span>
                            </div>
                            <span className="font-medium">
                              {langData.totalViews.toLocaleString()} ({langData.percentage}%)
                            </span>
                          </div>
                          <Progress value={langData.percentage} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !hasData ? (
          <div className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Analytics Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Analytics will appear here once visitors start viewing this post. 
              Use the "Generate Test Data" button in the Analytics tab to preview the dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">Views</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Unique Visitors</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics.uniqueVisitors.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs">Bounce Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics.avgBounceRate.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Avg. Session</span>
                  </div>
                  <p className="text-2xl font-bold">{formatTime(analytics.avgSessionDuration)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Search className="h-4 w-4" />
                    <span className="text-xs">Organic Traffic</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics.organicTraffic.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">SEO Score</span>
                  </div>
                  <p className="text-2xl font-bold">{analytics.avgSeoScore.toFixed(0)}/100</p>
                </CardContent>
              </Card>
            </div>

            {/* Views Over Time Chart */}
            {analytics.dailyData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Views Over Time (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="metric_date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))' 
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="page_views"
                          name="Views"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.2)"
                        />
                        <Area
                          type="monotone"
                          dataKey="unique_visitors"
                          name="Visitors"
                          stroke="hsl(var(--secondary))"
                          fill="hsl(var(--secondary) / 0.2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Link Click Analytics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link Click Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkClicksLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : !linkClicks || linkClicks.totalClicks === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No link clicks recorded yet. Clicks will be tracked when visitors interact with links in this post.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-lg font-bold">{linkClicks.totalClicks}</p>
                        <p className="text-xs text-muted-foreground">Total Clicks</p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-lg font-bold">{linkClicks.internalClicks}</p>
                        <p className="text-xs text-muted-foreground">Internal</p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-lg font-bold">{linkClicks.externalClicks}</p>
                        <p className="text-xs text-muted-foreground">External</p>
                      </div>
                    </div>

                    {/* Top Links Table */}
                    {linkClicks.topLinks.length > 0 && (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Link</TableHead>
                              <TableHead className="text-xs text-right w-16">Clicks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linkClicks.topLinks.slice(0, 5).map((link, index) => (
                              <TableRow key={index}>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1 max-w-[250px]">
                                    {link.is_external ? (
                                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ArrowUpRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <span className="text-xs truncate" title={link.link_url}>
                                      {link.link_text || link.link_url}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 text-right text-xs font-medium">
                                  {link.click_count}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO Keywords */}
            {post?.seo_keywords && post.seo_keywords.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">SEO Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {post.seo_keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
