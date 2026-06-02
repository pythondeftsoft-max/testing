import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComplianceControl {
  id: string;
  framework: string; // Made more flexible to handle database string values
  control_id: string;
  control_name: string;
  control_description?: string;
  implementation_status: string; // Made more flexible
  responsible_party?: string;
  evidence_urls?: string[];
  last_reviewed_at?: string;
  next_review_due?: string;
  created_at: string;
  updated_at: string;
}

export const useComplianceChecklist = (framework?: string) => {
  return useQuery({
    queryKey: ['compliance-checklist', framework],
    queryFn: async (): Promise<ComplianceControl[]> => {
      let query = supabase
        .from('compliance_checklist')
        .select('*')
        .order('control_id');
      
      if (framework) {
        query = query.eq('framework', framework);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpdateComplianceControl = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      framework,
      controlId,
      implementationStatus,
      evidenceUrls,
      responsibleParty
    }: {
      framework: string;
      controlId: string;
      implementationStatus: string;
      evidenceUrls?: string[];
      responsibleParty?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_compliance_control', {
        p_framework: framework,
        p_control_id: controlId,
        p_implementation_status: implementationStatus,
        p_evidence_urls: evidenceUrls,
        p_responsible_party: responsibleParty
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-security-dashboard'] });
      toast({
        title: "Compliance Control Updated",
        description: "The compliance control has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating compliance control:', error);
      toast({
        title: "Error",
        description: "Failed to update compliance control. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useComplianceStats = () => {
  return useQuery({
    queryKey: ['compliance-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_checklist')
        .select('framework, implementation_status');
      
      if (error) throw error;
      
      const stats = data?.reduce((acc, control) => {
        if (!acc[control.framework]) {
          acc[control.framework] = {
            total: 0,
            implemented: 0,
            in_progress: 0,
            not_implemented: 0,
            verified: 0
          };
        }
        
        acc[control.framework].total++;
        acc[control.framework][control.implementation_status]++;
        
        return acc;
      }, {} as Record<string, any>) || {};
      
      return stats;
    },
  });
};