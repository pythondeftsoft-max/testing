import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaseTemplate {
  id: string;
  template_name: string;
  template_content: string;
  template_variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useLeaseRenewalTemplates = (landlordId: string) => {
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lease_renewal_templates')
        .select('*')
        .eq('landlord_id', landlordId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch lease renewal templates",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: {
    template_name: string;
    template_content: string;
  }) => {
    try {
      setLoading(true);
      
      const extractVariables = (content: string) => {
        const variables: Record<string, string> = {};
        const regex = /\{\{(\w+)\}\}/g;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          variables[match[1]] = `{{${match[1]}}}`;
        }
        
        return variables;
      };

      const { error } = await supabase
        .from('lease_renewal_templates')
        .insert({
          landlord_id: landlordId,
          template_name: templateData.template_name.trim(),
          template_content: templateData.template_content.trim(),
          template_variables: extractVariables(templateData.template_content),
          is_active: true
        });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });

      fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create template",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateId: string, templateData: {
    template_name: string;
    template_content: string;
  }) => {
    try {
      setLoading(true);
      
      const extractVariables = (content: string) => {
        const variables: Record<string, string> = {};
        const regex = /\{\{(\w+)\}\}/g;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          variables[match[1]] = `{{${match[1]}}}`;
        }
        
        return variables;
      };

      const { error } = await supabase
        .from('lease_renewal_templates')
        .update({
          template_name: templateData.template_name.trim(),
          template_content: templateData.template_content.trim(),
          template_variables: extractVariables(templateData.template_content),
        })
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });

      fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update template",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('lease_renewal_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete template",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (landlordId) {
      fetchTemplates();
    }
  }, [landlordId]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
};