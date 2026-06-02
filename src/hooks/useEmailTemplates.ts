import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  audience: 'tenant' | 'landlord' | 'all';
  category?: string;
  subject_template: string;
  preheader?: string;
  html_template: string;
  default_cta_text?: string;
  default_cta_url?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useEmailTemplates = (filters?: {
  audience?: string;
  search?: string;
  active_only?: boolean;
}) => {
  return useQuery({
    queryKey: ['email-templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.audience && ['tenant', 'landlord', 'all'].includes(filters.audience)) {
        query = query.eq('audience', filters.audience as 'tenant' | 'landlord' | 'all');
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,subject_template.ilike.%${filters.search}%`);
      }

      if (filters?.active_only !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
};

export const useCreateEmailTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Email template has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create template",
        description: error.message || "An error occurred while creating the template",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateEmailTemplate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "Email template has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update template",
        description: error.message || "An error occurred while updating the template",
        variant: "destructive",
      });
    },
  });
};