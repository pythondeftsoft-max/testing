import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface WhiteLabelAnalyticsData {
  config_id: string;
  company_name?: string;
  page_views: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_session_duration: number;
  event_counts: Record<string, number>;
  top_pages: Array<{ path: string; views: number }>;
}

export interface PerformanceMetric {
  metric_type: string;
  metric_value: number;
  recorded_at: string;
  config_id: string;
}

export const useWhiteLabelAnalytics = (dateRange: { start: Date; end: Date } = {
  start: subDays(new Date(), 30),
  end: new Date()
}) => {
  return useQuery({
    queryKey: ['white-label-analytics', dateRange],
    retry: false,
    queryFn: async () => {
      console.log('🔍 Fetching white label analytics...', dateRange);
      // Fetch analytics events
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('white_label_analytics')
        .select(`
          config_id,
          event_type,
          page_path,
          session_id,
          user_id,
          created_at
        `)
        .gte('created_at', startOfDay(dateRange.start).toISOString())
        .lte('created_at', endOfDay(dateRange.end).toISOString());

      if (analyticsError) throw analyticsError;

      // Fetch config details
      const { data: configs, error: configsError } = await supabase
        .from('white_label_configs')
        .select('id, company_name, is_active');

      if (configsError) throw configsError;

      // Process analytics by config
      const analyticsMap = new Map<string, WhiteLabelAnalyticsData>();

      configs?.forEach(config => {
        analyticsMap.set(config.id, {
          config_id: config.id,
          company_name: config.company_name || 'Unknown',
          page_views: 0,
          unique_visitors: 0,
          bounce_rate: 0,
          avg_session_duration: 0,
          event_counts: {},
          top_pages: []
        });
      });

      // Aggregate analytics data
      const sessionMap = new Map<string, Set<string>>();
      const pageViewsMap = new Map<string, Map<string, number>>();

      analyticsData?.forEach(event => {
        const configData = analyticsMap.get(event.config_id);
        if (!configData) return;

        // Count page views
        if (event.event_type === 'page_view') {
          configData.page_views++;
          
          // Track page views by path
          if (event.page_path) {
            if (!pageViewsMap.has(event.config_id)) {
              pageViewsMap.set(event.config_id, new Map());
            }
            const paths = pageViewsMap.get(event.config_id)!;
            paths.set(event.page_path, (paths.get(event.page_path) || 0) + 1);
          }
        }

        // Track unique visitors
        if (event.session_id) {
          if (!sessionMap.has(event.config_id)) {
            sessionMap.set(event.config_id, new Set());
          }
          sessionMap.get(event.config_id)!.add(event.session_id);
        }

        // Count event types
        if (event.event_type) {
          configData.event_counts[event.event_type] = 
            (configData.event_counts[event.event_type] || 0) + 1;
        }
      });

      // Calculate unique visitors and top pages
      analyticsMap.forEach((data, configId) => {
        data.unique_visitors = sessionMap.get(configId)?.size || 0;
        
        // Calculate bounce rate (simplified: sessions with only 1 page view)
        if (data.page_views > 0 && data.unique_visitors > 0) {
          data.bounce_rate = Math.round((1 - (data.page_views / data.unique_visitors)) * 100);
        }

        // Get top pages
        const paths = pageViewsMap.get(configId);
        if (paths) {
          data.top_pages = Array.from(paths.entries())
            .map(([path, views]) => ({ path, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);
        }
      });

      const result = Array.from(analyticsMap.values());
      console.log('✅ Analytics fetched:', result.length, 'configs', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useWhiteLabelPerformance = (dateRange: { start: Date; end: Date } = {
  start: subDays(new Date(), 30),
  end: new Date()
}) => {
  return useQuery({
    queryKey: ['white-label-performance', dateRange],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_performance')
        .select('*')
        .gte('recorded_at', startOfDay(dateRange.start).toISOString())
        .lte('recorded_at', endOfDay(dateRange.end).toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PerformanceMetric[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
