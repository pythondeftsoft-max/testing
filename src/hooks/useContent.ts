import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContentItem {
  id: string;
  content_type: string;
  template: string | null;
  title: string;
  slug: string;
  status: string;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  featured_image: string | null;
  featured_image_alt: string | null;
  state: string | null;
  city: string | null;
  canonical_url: string | null;
  schema_type: string | null;
  schema_data: Record<string, any> | null;
  internal_links: string[];
  language: string;
  parent_post_id: string | null;
  pillar_id: string | null;
  excerpt: string | null;
  seo_keywords: string[];
  publish_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  content_structure: any;
  meta_tags: any;
  view_count: number | null;
  scheduled_publish_at: string | null;
  location_targeting: any;
}

export type ContentInsert = Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>;

export const CONTENT_TYPES = [
  'page',
  'blog_post',
  'landing',
  'section8_city',
  'section8_state',
  'landlord_city',
  'property_management_city',
  'software_comparison',
  'rent_data_city',
] as const;

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  page: 'Page',
  blog_post: 'Blog Post',
  landing: 'Landing Page',
  section8_city: 'Section 8 (City)',
  section8_state: 'Section 8 (State)',
  landlord_city: 'Landlord (City)',
  property_management_city: 'Property Mgmt (City)',
  software_comparison: 'Software Comparison',
  rent_data_city: 'Rent Data (City)',
};

export const TEMPLATES = [
  'blog',
  'city-landing',
  'section8',
  'comparison',
  'landlord',
  'rent-data',
] as const;

// Fetch single content by slug
export function useContentBySlug(slug: string | undefined, preview?: boolean, userId?: string | null) {
  return useQuery({
    queryKey: ['content', slug, preview, userId ?? 'anon'],
    queryFn: async () => {
      if (!slug) return null;
      if (preview) {
        const { data, error } = await supabase
          .rpc('get_content_by_slug_preview', { slug_param: slug });
        if (error) throw error;
        const rows = data as unknown as ContentItem[];
        return rows?.[0] || null;
      }
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as unknown as ContentItem;
    },
    enabled: !!slug && (!preview || userId !== undefined),
  });
}

// Fetch all content (admin)
export function useContentList(filters?: {
  contentType?: string;
  template?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['content-list', filters],
    queryFn: async () => {
      let query = supabase
        .from('content')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.contentType && filters.contentType !== 'all') query = query.eq('content_type', filters.contentType);
      if (filters?.template) query = query.eq('template', filters.template);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ContentItem[];
    },
  });
}

// Create content
export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<ContentInsert>) => {
      const { data, error } = await supabase
        .from('content')
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ContentItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
      toast.success('Content created');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Update content
export function useUpdateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('content')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ContentItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
      toast.success('Content updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Delete content
export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Cascade delete translations first
      await supabase.from('content').delete().eq('parent_post_id', id);
      const { error } = await supabase.from('content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
      toast.success('Content deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Bulk update status
export function useBulkUpdateContentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from('content')
        .update({ status } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] });
      toast.success('Content updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}
