import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Translation {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: string;
  view_count: number | null;
  created_at: string;
  scheduled_publish_at?: string | null;
}

export interface PostWithTranslations {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: string;
  view_count: number | null;
  created_at: string;
  updated_at: string;
  excerpt: string | null;
  featured_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
  content_structure: any;
  translations: Translation[];
  totalViews: number;
}

export const useBlogPostsWithTranslations = () => {
  return useQuery({
    queryKey: ['blog-posts-with-translations'],
    queryFn: async () => {
      // Fetch all English (parent) posts
      const { data: englishPosts, error: englishError } = await supabase
        .from('blog_posts')
        .select('*')
        .or('language.eq.en,language.is.null')
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (englishError) throw englishError;

      // Fetch all translations in one query
      const postIds = englishPosts?.map(p => p.id) || [];
      
      let allTranslations: any[] = [];
      if (postIds.length > 0) {
        const { data, error: translationsError } = await supabase
          .from('blog_posts')
          .select('id, title, slug, language, status, view_count, created_at, parent_post_id, scheduled_publish_at')
          .in('parent_post_id', postIds);

        if (translationsError) throw translationsError;
        allTranslations = data || [];
      }

      // Also fetch any orphaned translations (non-English with null parent_post_id)
      // These are data integrity issues that should be displayed for admin awareness
      const { data: orphanedPosts, error: orphanedError } = await supabase
        .from('blog_posts')
        .select('*')
        .not('language', 'in', '("en")') // not English
        .not('language', 'is', null)      // has a language set
        .is('parent_post_id', null)       // but no parent
        .order('created_at', { ascending: false });

      if (orphanedError) throw orphanedError;

      // Group translations by parent_post_id
      const translationsByParent = (allTranslations || []).reduce((acc, t) => {
        if (!acc[t.parent_post_id!]) {
          acc[t.parent_post_id!] = [];
        }
        acc[t.parent_post_id!].push({
          id: t.id,
          title: t.title,
          slug: t.slug,
          language: t.language || 'en',
          status: t.status,
          view_count: t.view_count,
          created_at: t.created_at,
          scheduled_publish_at: t.scheduled_publish_at,
        });
        return acc;
      }, {} as Record<string, Translation[]>);

      // Combine posts with their translations
      const postsWithTranslations: PostWithTranslations[] = (englishPosts || []).map(post => {
        const translations = translationsByParent[post.id] || [];
        const totalViews = (post.view_count || 0) + 
          translations.reduce((sum, t) => sum + (t.view_count || 0), 0);

        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          language: post.language || 'en',
          status: post.status,
          view_count: post.view_count,
          created_at: post.created_at,
          updated_at: post.updated_at,
          excerpt: post.excerpt,
          featured_image_url: post.featured_image_url,
          seo_title: post.seo_title,
          seo_description: post.seo_description,
          content: post.content,
          content_structure: post.content_structure,
          translations,
          totalViews,
        };
      });

      // Add orphaned translations as standalone entries (marked for cleanup)
      const orphanedWithTranslations: PostWithTranslations[] = (orphanedPosts || []).map(post => ({
        id: post.id,
        title: `⚠️ ${post.title}`,
        slug: post.slug,
        language: post.language || 'unknown',
        status: post.status,
        view_count: post.view_count,
        created_at: post.created_at,
        updated_at: post.updated_at,
        excerpt: post.excerpt,
        featured_image_url: post.featured_image_url,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        content: post.content,
        content_structure: post.content_structure,
        translations: [],
        totalViews: post.view_count || 0,
      }));

      return [...postsWithTranslations, ...orphanedWithTranslations];
    },
  });
};
