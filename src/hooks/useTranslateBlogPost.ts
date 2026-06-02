import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TranslationResult {
  language: string;
  success: boolean;
  slug?: string;
  error?: string;
}

interface TranslationResponse {
  success: boolean;
  message: string;
  results: TranslationResult[];
}

export const useTranslateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, targetLanguages }: { postId: string; targetLanguages: string[] }) => {
      const { data, error } = await supabase.functions.invoke('translate-blog-post', {
        body: {
          post_id: postId,
          target_languages: targetLanguages,
        },
      });

      if (error) throw error;
      return data as TranslationResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-post-translations'] });
      
      const successCount = data.results.filter(r => r.success && !r.error?.includes('already exists')).length;
      const failCount = data.results.filter(r => !r.success).length;
      
      if (failCount > 0) {
        toast({
          title: 'Translations Completed with Errors',
          description: `${successCount} succeeded, ${failCount} failed. Check console for details.`,
          variant: 'destructive',
        });
      } else if (successCount > 0) {
        toast({
          title: 'Translations Created',
          description: `Successfully created ${successCount} translation(s)`,
        });
      } else {
        toast({
          title: 'No New Translations',
          description: 'All requested translations already exist',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Translation Failed',
        description: error.message || 'Failed to translate blog post',
        variant: 'destructive',
      });
    },
  });
};

// Hook to fetch all translations for a post
export const useBlogPostTranslationsAll = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['blog-post-translations-all', postId],
    queryFn: async () => {
      if (!postId) return [];

      // First check if this post is an English original or a translation
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .select('id, language, parent_post_id')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Determine the parent ID to search for translations
      const parentId = post.parent_post_id || postId;

      // Fetch all translations including the parent
      const { data: translations, error } = await supabase
        .from('blog_posts')
        .select('id, language, slug, status, title')
        .or(`id.eq.${parentId},parent_post_id.eq.${parentId}`)
        .order('language');

      if (error) throw error;

      return translations || [];
    },
    enabled: !!postId,
  });
};

// Hook to fetch combined analytics for all translations
export const useCombinedPostAnalytics = (postId: string | undefined, days: number = 30) => {
  const { data: translations } = useBlogPostTranslationsAll(postId);

  return useQuery({
    queryKey: ['combined-post-analytics', postId, days],
    queryFn: async () => {
      if (!translations || translations.length === 0) {
        return null;
      }

      const postIds = translations.map(t => t.id);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('blog_seo_analytics')
        .select('post_id, metric_date, page_views, unique_visitors, bounce_rate, avg_session_duration, organic_traffic')
        .in('post_id', postIds)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;

      // Aggregate by language
      const byLanguage: Record<string, {
        language: string;
        totalViews: number;
        uniqueVisitors: number;
        bounceRateSum: number;
        sessionSum: number;
        organicTraffic: number;
        count: number;
      }> = {};

      const languageMap = new Map(translations.map(t => [t.id, t.language]));

      for (const record of data || []) {
        const lang = languageMap.get(record.post_id) || 'en';
        if (!byLanguage[lang]) {
          byLanguage[lang] = {
            language: lang,
            totalViews: 0,
            uniqueVisitors: 0,
            bounceRateSum: 0,
            sessionSum: 0,
            organicTraffic: 0,
            count: 0,
          };
        }
        byLanguage[lang].totalViews += record.page_views || 0;
        byLanguage[lang].uniqueVisitors += record.unique_visitors || 0;
        byLanguage[lang].bounceRateSum += record.bounce_rate || 0;
        byLanguage[lang].sessionSum += record.avg_session_duration || 0;
        byLanguage[lang].organicTraffic += record.organic_traffic || 0;
        byLanguage[lang].count += 1;
      }

      // Calculate totals
      const combined = Object.values(byLanguage);
      const totalViews = combined.reduce((sum, l) => sum + l.totalViews, 0);
      const totalVisitors = combined.reduce((sum, l) => sum + l.uniqueVisitors, 0);
      const totalOrganic = combined.reduce((sum, l) => sum + l.organicTraffic, 0);
      const totalCount = combined.reduce((sum, l) => sum + l.count, 0);
      const avgBounceRate = totalCount > 0 
        ? combined.reduce((sum, l) => sum + l.bounceRateSum, 0) / totalCount 
        : 0;
      const avgSession = totalCount > 0
        ? combined.reduce((sum, l) => sum + l.sessionSum, 0) / totalCount
        : 0;

      return {
        combined: {
          totalViews,
          uniqueVisitors: totalVisitors,
          avgBounceRate,
          avgSessionDuration: avgSession,
          organicTraffic: totalOrganic,
        },
        byLanguage: combined.map(l => ({
          language: l.language,
          totalViews: l.totalViews,
          percentage: totalViews > 0 ? Math.round((l.totalViews / totalViews) * 100) : 0,
        })),
        translations,
      };
    },
    enabled: !!translations && translations.length > 0,
  });
};
