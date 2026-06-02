import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StructuredPage {
  id: string;
  page_type: string;
  state: string | null;
  city: string | null;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  h1: string | null;
  body_content: string | null;
  cta_block: string | null;
  internal_links: string[];
  featured_image: string | null;
  schema_type: string | null;
  schema_data: Record<string, any> | null;
  status: string;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type StructuredPageInsert = Omit<StructuredPage, 'id' | 'created_at' | 'updated_at'>;

const PAGE_TYPES = [
  'section8_city',
  'section8_state', 
  'landlord_city',
  'property_management_city',
  'software_comparison',
  'rent_data_city',
] as const;

export { PAGE_TYPES };

// Generate slug from page type + state + city
export function generateSlug(pageType: string, state?: string, city?: string): string {
  const typePrefix: Record<string, string> = {
    section8_city: 'section-8',
    section8_state: 'section-8',
    landlord_city: 'landlords',
    property_management_city: 'property-management',
    software_comparison: 'compare',
    rent_data_city: 'rent-data',
  };
  
  const prefix = typePrefix[pageType] || pageType;
  const parts = [prefix];
  if (state) parts.push(state.toLowerCase().replace(/\s+/g, '-'));
  if (city) parts.push(city.toLowerCase().replace(/\s+/g, '-'));
  return parts.join('/');
}

// Fetch single page by slug
export function useStructuredPage(slug: string | undefined) {
  return useQuery({
    queryKey: ['structured-page', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('structured_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as unknown as StructuredPage;
    },
    enabled: !!slug,
  });
}

// Fetch all structured pages (admin)
export function useStructuredPages(filters?: {
  pageType?: string;
  state?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['structured-pages', filters],
    queryFn: async () => {
      let query = supabase
        .from('structured_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.pageType) query = query.eq('page_type', filters.pageType as any);
      if (filters?.state) query = query.ilike('state', filters.state);
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as StructuredPage[];
    },
  });
}

// Create page
export function useCreateStructuredPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (page: Partial<StructuredPageInsert>) => {
      const { data, error } = await supabase
        .from('structured_pages')
        .insert(page as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as StructuredPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-pages'] });
      toast.success('Page created');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Update page
export function useUpdateStructuredPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StructuredPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('structured_pages')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as StructuredPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-pages'] });
      toast.success('Page updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Delete page
export function useDeleteStructuredPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('structured_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-pages'] });
      toast.success('Page deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

// Bulk update status
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from('structured_pages')
        .update({ status } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-pages'] });
      toast.success('Pages updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}
