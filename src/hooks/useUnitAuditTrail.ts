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

export const useUnitAuditTrail = (unitId: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['unit-audit-trail', unitId, limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await (supabase as any).rpc('admin_get_unit_audit_trail', {
        p_unit_id: unitId,
        p_limit: limit
      });

      if (error) throw error;
      return (data as AuditLogEntry[]) || [];
    },
    enabled: !!unitId && limit > 0,
    staleTime: 30000, // 30 seconds
  });
};
