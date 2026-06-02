import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SEOPageTemplate {
  id: string;
  name: string;
  base_title: string;
  template_type: string;
  generate_state_pages: boolean;
  generate_city_pages: boolean;
  generate_zipcode_pages: boolean;
  generate_county_pages: boolean;
  meta_description_template: string | null;
  content_template: string | null;
  bedrooms_filter: number[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SEOGeneratedPage {
  id: string;
  template_id: string | null;
  location_level: string;
  slug: string;
  title: string;
  meta_description: string | null;
  content: string | null;
  location_state: string | null;
  location_city: string | null;
  location_zipcode: string | null;
  location_county: string | null;
  property_count: number;
  last_generated_at: string;
  published: boolean;
  created_at: string;
}

export type CreateTemplateInput = Omit<SEOPageTemplate, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTemplateInput = Partial<CreateTemplateInput>;

const TEMPLATES_KEY = ['seo-page-templates'];
const GENERATED_PAGES_KEY = ['seo-generated-pages'];

export function useSEOPageTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_page_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SEOPageTemplate[];
    },
  });
}

export function useSEOGeneratedPages(templateId?: string) {
  return useQuery({
    queryKey: [...GENERATED_PAGES_KEY, templateId],
    queryFn: async () => {
      let query = supabase
        .from('seo_generated_pages')
        .select('*')
        .order('last_generated_at', { ascending: false });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SEOGeneratedPage[];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase
        .from('seo_page_templates')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as SEOPageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTemplateInput & { id: string }) => {
      const { data, error } = await supabase
        .from('seo_page_templates')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SEOPageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seo_page_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}

export function useTogglePagePublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { data, error } = await supabase
        .from('seo_generated_pages')
        .update({ published })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SEOGeneratedPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GENERATED_PAGES_KEY });
      toast.success('Page status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update page: ${error.message}`);
    },
  });
}
