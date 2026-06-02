import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Content section can use either old format (heading/body) or new AI format (type/title/content)
export interface ContentSection {
  type?: 'intro' | 'h2' | 'h3';
  title?: string;
  heading?: string;
  content?: string;
  body?: string;
}

export interface ContentStructure {
  sections?: ContentSection[];
  faqs?: { question: string; answer: string }[];
  conclusion?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: string;
  category_id: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  view_count: number | null;
  meta_tags: any;
  content_structure: ContentStructure | null;
  pillar_id: string | null;
  language: string | null;
  parent_post_id: string | null;
  blog_pillars?: { name: string; slug: string } | null;
  blog_categories?: { name: string; slug: string } | null;
}

// Simplified type for insert/update operations (uses Json from Supabase)
export type BlogPostInput = Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'content_structure' | 'blog_pillars' | 'blog_categories'> & {
  content_structure?: any;
  language?: string | null;
  parent_post_id?: string | null;
  featured_image_alt?: string | null;
};

export const useBlogPosts = (languageFilter?: string) => {
  return useQuery({
    queryKey: ['blog-posts', languageFilter],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories(name, slug)
        `)
        .order('created_at', { ascending: false });

      // If language filter specified, apply it; otherwise show English posts by default for admin
      if (languageFilter) {
        query = query.eq('language', languageFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

export const useBlogPost = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_pillars(name, slug),
          blog_categories(name, slug)
        `)
        .eq('slug', slug!)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      return data as BlogPost | null;
    },
    enabled: !!slug,
  });
};

// Get translation count for a post
export const useBlogPostTranslations = (postId: string | undefined, parentPostId: string | null | undefined) => {
  return useQuery({
    queryKey: ['blog-post-translations', postId, parentPostId],
    queryFn: async () => {
      if (!postId && !parentPostId) return [];

      // If this is an English original, count its children
      if (postId && !parentPostId) {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('parent_post_id', postId)
          .eq('status', 'published');

        if (error) throw error;
        return data || [];
      }

      // If this is a translation, get sibling count
      if (parentPostId) {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('parent_post_id', parentPostId)
          .eq('status', 'published');

        if (error) throw error;
        return data || [];
      }

      return [];
    },
    enabled: !!postId || !!parentPostId,
  });
};

export const useRelatedPosts = (pillarId: string | null | undefined, currentSlug: string | undefined) => {
  return useQuery({
    queryKey: ['related-posts', pillarId, currentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, created_at, pillar_id')
        .eq('pillar_id', pillarId!)
        .eq('status', 'published')
        .neq('slug', currentSlug!)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!pillarId && !!currentSlug,
  });
};

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (post: BlogPostInput) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert(post as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts-with-translations'] });
      toast({
        title: 'Success',
        description: 'Blog post created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create blog post',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPostInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts-with-translations'] });
      toast({
        title: 'Success',
        description: 'Blog post updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update blog post',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First check if this is a parent post with translations
      const { data: post } = await supabase
        .from('blog_posts')
        .select('id, language, parent_post_id')
        .eq('id', id)
        .single();

      // If this is an English parent, delete all translations first (cascade)
      if (post && (post.language === 'en' || post.language === null) && !post.parent_post_id) {
        const { error: cascadeError } = await supabase
          .from('blog_posts')
          .delete()
          .eq('parent_post_id', id);

        if (cascadeError) {
          console.error('Failed to delete translations:', cascadeError);
          throw new Error('Failed to delete translations');
        }
      }

      // Now delete the post itself
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Verify deletion actually occurred
      const { data: checkPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (checkPost) {
        throw new Error('Delete was blocked - post still exists');
      }

      return { deletedId: id, wasParent: post?.language === 'en' || post?.language === null };
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries to force UI refresh
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts-with-translations'] });
      queryClient.invalidateQueries({ queryKey: ['blog-post-translations'] });
      
      toast({
        title: 'Deleted Successfully',
        description: result?.wasParent 
          ? 'Post and all translations deleted'
          : 'Blog post deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete blog post',
        variant: 'destructive',
      });
    },
  });
};