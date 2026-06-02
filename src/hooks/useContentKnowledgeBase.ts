import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContentKnowledgeFact {
  id: string;
  pillar_id: string | null;
  topic_category: string;
  fact_title: string;
  fact_content: string;
  source_url: string | null;
  source_name: string | null;
  last_verified_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  pillar?: {
    name: string;
    slug: string;
  };
}

export const useContentKnowledgeBase = (pillarId?: string) => {
  return useQuery({
    queryKey: ['content-knowledge-base', pillarId],
    queryFn: async () => {
      let query = supabase
        .from('content_knowledge_base')
        .select(`
          *,
          pillar:blog_pillars(name, slug)
        `)
        .eq('is_active', true)
        .order('topic_category')
        .order('fact_title');

      if (pillarId) {
        query = query.eq('pillar_id', pillarId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContentKnowledgeFact[];
    },
  });
};

export const useCreateKnowledgeFact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fact: Omit<ContentKnowledgeFact, 'id' | 'created_at' | 'updated_at' | 'pillar'>) => {
      const { data, error } = await supabase
        .from('content_knowledge_base')
        .insert(fact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-knowledge-base'] });
      toast({
        title: 'Success',
        description: 'Knowledge fact added successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add knowledge fact',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateKnowledgeFact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentKnowledgeFact> & { id: string }) => {
      const { data, error } = await supabase
        .from('content_knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-knowledge-base'] });
      toast({
        title: 'Success',
        description: 'Knowledge fact updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update knowledge fact',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteKnowledgeFact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_knowledge_base')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-knowledge-base'] });
      toast({
        title: 'Success',
        description: 'Knowledge fact removed',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove knowledge fact',
        variant: 'destructive',
      });
    },
  });
};
