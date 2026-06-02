import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyAnalytics {
  date: string;
  views: number;
  visitors: number;
}

export interface SEOHealthData {
  score: number;
  missingTitles: number;
  missingDescriptions: number;
  missingAltText: number;
  totalPosts: number;
}

export interface BlogAnalyticsSummary {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  uniqueVisitors: number;
  avgBounceRate: number;
  avgSessionDuration: number;
  organicTraffic: number;
  dailyData: DailyAnalytics[];
  seoHealth: SEOHealthData;
  topPosts: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
  }>;
}

export const useBlogAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: ['blog-analytics-enhanced', days],
    queryFn: async (): Promise<BlogAnalyticsSummary> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch posts
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, status, view_count, seo_title, seo_description, featured_image_alt');

      if (postsError) throw postsError;

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('blog_seo_analytics')
        .select('metric_date, page_views, unique_visitors, bounce_rate, avg_session_duration, organic_traffic')
        .gte('metric_date', startDateStr)
        .order('metric_date', { ascending: true });

      if (analyticsError) throw analyticsError;

      // Calculate basic post stats
      const totalPosts = posts?.length || 0;
      const publishedPosts = posts?.filter(p => p.status === 'published').length || 0;
      const draftPosts = posts?.filter(p => p.status === 'draft').length || 0;

      // Calculate SEO health
      const missingTitles = posts?.filter(p => !p.seo_title).length || 0;
      const missingDescriptions = posts?.filter(p => !p.seo_description).length || 0;
      const missingAltText = posts?.filter(p => !p.featured_image_alt).length || 0;
      const seoScore = totalPosts > 0 
        ? Math.round(((totalPosts - missingTitles - missingDescriptions - missingAltText) / (totalPosts * 3)) * 100)
        : 100;

      // Calculate analytics aggregates
      const totalViews = analyticsData?.reduce((sum, d) => sum + (d.page_views || 0), 0) || 0;
      const uniqueVisitors = analyticsData?.reduce((sum, d) => sum + (d.unique_visitors || 0), 0) || 0;
      const organicTraffic = analyticsData?.reduce((sum, d) => sum + (d.organic_traffic || 0), 0) || 0;
      
      const avgBounceRate = analyticsData && analyticsData.length > 0
        ? analyticsData.reduce((sum, d) => sum + (d.bounce_rate || 0), 0) / analyticsData.length
        : 0;
      const avgSessionDuration = analyticsData && analyticsData.length > 0
        ? analyticsData.reduce((sum, d) => sum + (d.avg_session_duration || 0), 0) / analyticsData.length
        : 0;

      // Group by date for daily data
      const dailyMap = new Map<string, DailyAnalytics>();
      analyticsData?.forEach(d => {
        const date = d.metric_date;
        const existing = dailyMap.get(date) || { date, views: 0, visitors: 0 };
        existing.views += d.page_views || 0;
        existing.visitors += d.unique_visitors || 0;
        dailyMap.set(date, existing);
      });
      const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // Top posts by view count
      const topPosts = (posts || [])
        .filter(p => p.status === 'published')
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          views: p.view_count || 0,
        }));

      return {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalViews,
        uniqueVisitors,
        avgBounceRate,
        avgSessionDuration,
        organicTraffic,
        dailyData,
        seoHealth: {
          score: seoScore,
          missingTitles,
          missingDescriptions,
          missingAltText,
          totalPosts,
        },
        topPosts,
      };
    },
  });
};

export const useGenerateTestAnalytics = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Get all published posts
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('status', 'published');

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) {
        throw new Error('No published posts found');
      }

      // Generate 30 days of test data for each post
      const records: any[] = [];
      const now = new Date();

      for (const post of posts) {
        for (let i = 0; i < 30; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Generate realistic random data with some variance
          const baseViews = Math.floor(Math.random() * 50) + 10;

          records.push({
            post_id: post.id,
            metric_date: dateStr,
            page_views: baseViews,
            unique_visitors: Math.floor(baseViews * (0.7 + Math.random() * 0.2)),
            bounce_rate: 30 + Math.random() * 30,
            avg_session_duration: 120 + Math.random() * 180,
            organic_traffic: Math.floor(baseViews * (0.5 + Math.random() * 0.3)),
            seo_score: 60 + Math.floor(Math.random() * 40),
          });
        }
      }

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from('blog_seo_analytics')
          .upsert(batch, { onConflict: 'post_id,metric_date' });

        if (error) throw error;
      }

      return { inserted: records.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog-analytics-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['post-analytics'] });
      toast({
        title: 'Test Data Generated',
        description: `Created ${data.inserted} analytics records for visualization.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate test data',
        variant: 'destructive',
      });
    },
  });
};
