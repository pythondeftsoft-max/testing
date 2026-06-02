import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: string; // Made more flexible to handle database string values
  title: string;
  description?: string;
  affected_user_id?: string;
  detection_method: string;
  status: string; // Made more flexible
  assigned_to?: string;
  metadata: any; // More flexible to handle Json from database
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export const useSecurityIncidents = () => {
  return useQuery({
    queryKey: ['security-incidents'],
    queryFn: async (): Promise<SecurityIncident[]> => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
};

export const useCreateSecurityIncident = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incident: {
      incident_type: string;
      severity: string;
      title: string;
      description?: string;
      affected_user_id?: string;
      detection_method?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('create_security_incident', {
        p_incident_type: incident.incident_type,
        p_severity: incident.severity,
        p_title: incident.title,
        p_description: incident.description,
        p_affected_user_id: incident.affected_user_id,
        p_detection_method: incident.detection_method || 'manual',
        p_metadata: incident.metadata || {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-security-dashboard'] });
      toast({
        title: "Security Incident Created",
        description: "The security incident has been logged successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating security incident:', error);
      toast({
        title: "Error",
        description: "Failed to create security incident. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSecurityIncidentStatus = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      status, 
      assignedTo 
    }: { 
      incidentId: string; 
      status: string;
      assignedTo?: string;
    }) => {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (assignedTo !== undefined) {
        updateData.assigned_to = assignedTo;
      }
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('security_incidents')
        .update(updateData)
        .eq('id', incidentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-security-dashboard'] });
      toast({
        title: "Incident Updated",
        description: "Security incident status has been updated.",
      });
    },
    onError: (error) => {
      console.error('Error updating security incident:', error);
      toast({
        title: "Error",
        description: "Failed to update security incident. Please try again.",
        variant: "destructive",
      });
    },
  });
};