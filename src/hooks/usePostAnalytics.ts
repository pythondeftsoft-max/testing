import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PostAnalyticsData {
  metric_date: string;
  page_views: number | null;
  unique_visitors: number | null;
  bounce_rate: number | null;
  avg_session_duration: number | null;
  organic_traffic: number | null;
  seo_score: number | null;
}

export interface PostAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  avgBounceRate: number;
  avgSessionDuration: number;
  avgSeoScore: number;
  organicTraffic: number;
  dailyData: PostAnalyticsData[];
}

export const usePostAnalytics = (postId: string | undefined, days: number = 30) => {
  return useQuery({
    queryKey: ['post-analytics', postId, days],
    queryFn: async (): Promise<PostAnalyticsSummary> => {
      if (!postId) {
        return getEmptySummary();
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('blog_seo_analytics')
        .select('metric_date, page_views, unique_visitors, bounce_rate, avg_session_duration, organic_traffic, seo_score')
        .eq('post_id', postId)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return getEmptySummary();
      }

      const totalViews = data.reduce((sum, d) => sum + (d.page_views || 0), 0);
      const uniqueVisitors = data.reduce((sum, d) => sum + (d.unique_visitors || 0), 0);
      const organicTraffic = data.reduce((sum, d) => sum + (d.organic_traffic || 0), 0);
      
      const avgBounceRate = data.length > 0
        ? data.reduce((sum, d) => sum + (d.bounce_rate || 0), 0) / data.length
        : 0;
      const avgSessionDuration = data.length > 0
        ? data.reduce((sum, d) => sum + (d.avg_session_duration || 0), 0) / data.length
        : 0;
      const avgSeoScore = data.length > 0
        ? data.reduce((sum, d) => sum + (d.seo_score || 0), 0) / data.length
        : 0;

      return {
        totalViews,
        uniqueVisitors,
        avgBounceRate,
        avgSessionDuration,
        avgSeoScore,
        organicTraffic,
        dailyData: data,
      };
    },
    enabled: !!postId,
  });
};

function getEmptySummary(): PostAnalyticsSummary {
  return {
    totalViews: 0,
    uniqueVisitors: 0,
    avgBounceRate: 0,
    avgSessionDuration: 0,
    avgSeoScore: 0,
    organicTraffic: 0,
    dailyData: [],
  };
}
