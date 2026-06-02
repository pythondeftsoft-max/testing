import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogGenerationLog {
  id: string;
  pillar_id: string | null;
  topic_seed: string | null;
  location_state: string | null;
  location_city: string | null;
  triggered_at: string;
  completed_at: string | null;
  status: 'pending' | 'researching' | 'generating' | 'success' | 'failed' | 'rate_limited';
  research_sources: any[];
  knowledge_facts_used: any[];
  tokens_used: number | null;
  model_used: string | null;
  error_message: string | null;
  generated_post_id: string | null;
  created_at: string;
  // Joined fields
  pillar?: {
    name: string;
    slug: string;
  };
  post?: {
    title: string;
    slug: string;
  };
}

export const useBlogGenerationLogs = (limit = 20) => {
  return useQuery({
    queryKey: ['blog-generation-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_generation_logs')
        .select(`
          *,
          pillar:blog_pillars(name, slug),
          post:blog_posts(title, slug)
        `)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as BlogGenerationLog[];
    },
  });
};

export const useBlogGenerationStats = () => {
  return useQuery({
    queryKey: ['blog-generation-stats'],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get counts by status
      const { data: logs, error } = await supabase
        .from('blog_generation_logs')
        .select('status, triggered_at')
        .gte('triggered_at', monthAgo.toISOString());

      if (error) throw error;

      const stats = {
        thisWeek: {
          total: 0,
          success: 0,
          failed: 0,
        },
        thisMonth: {
          total: 0,
          success: 0,
          failed: 0,
        },
      };

      for (const log of logs || []) {
        const logDate = new Date(log.triggered_at);
        
        // This month
        stats.thisMonth.total++;
        if (log.status === 'success') stats.thisMonth.success++;
        if (log.status === 'failed' || log.status === 'rate_limited') stats.thisMonth.failed++;

        // This week
        if (logDate >= weekAgo) {
          stats.thisWeek.total++;
          if (log.status === 'success') stats.thisWeek.success++;
          if (log.status === 'failed' || log.status === 'rate_limited') stats.thisWeek.failed++;
        }
      }

      return stats;
    },
  });
};
