import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BlogPillar {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  url_base: string;
  content_focus: string[];
  cta_type: 'soft_signup' | 'informational' | 'newsletter_only' | 'none';
  rotation_order: number;
  last_published_at: string | null;
  posts_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBlogPillars = () => {
  return useQuery({
    queryKey: ['blog-pillars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_pillars')
        .select('*')
        .order('rotation_order');

      if (error) throw error;
      return data as BlogPillar[];
    },
  });
};

export const useUpdateBlogPillar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPillar> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_pillars')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-pillars'] });
      toast({
        title: 'Success',
        description: 'Pillar updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update pillar',
        variant: 'destructive',
      });
    },
  });
};

export const useGenerateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      pillar_id?: string;
      topic_override?: string;
      location_state?: string;
      location_city?: string;
    }) => {
      // Call the new lightweight trigger function that fires n8n webhook
      const { data, error } = await supabase.functions.invoke('trigger-blog-generation', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Failed to trigger blog generation');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to trigger blog generation');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Generation Started',
        description: 'Blog generation triggered via n8n. Check Logs tab for progress (may take 1-2 minutes for all 13 languages).',
      });
      queryClient.invalidateQueries({ queryKey: ['blog-generation-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
