import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  log_id: string;
  user_id: string;
  action: string;
  allowed: boolean;
  metadata: any;
  created_at: string;
  user_name: string;
  user_email: string;
}

export const usePropertyAuditTrail = (propertyId: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['property-audit-trail', propertyId, limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase.rpc('admin_get_property_audit_trail', {
        p_property_id: propertyId,
        p_limit: limit
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!propertyId,
    staleTime: 30000, // 30 seconds
  });
};