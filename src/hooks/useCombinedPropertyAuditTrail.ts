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
  unit_id?: string;
  unit_number?: string;
  unit_name?: string;
  source_type: 'property' | 'unit';
}

export const useCombinedPropertyAuditTrail = (propertyId: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['combined-property-audit-trail', propertyId, limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      // Fetch property-level audits
      const { data: propertyAudits, error: propertyError } = await (supabase as any).rpc('admin_get_property_audit_trail', {
        p_property_id: propertyId,
        p_limit: limit
      });

      if (propertyError) throw propertyError;

      // Fetch unit-level audits for all units in this property
      const { data: unitAudits, error: unitError } = await (supabase as any).rpc('admin_get_property_units_audit_trail', {
        p_property_id: propertyId,
        p_limit: limit
      });

      if (unitError) throw unitError;

      // Format property audits
      const formattedPropertyAudits = (Array.isArray(propertyAudits) ? propertyAudits : []).map((audit: any) => ({
        ...audit,
        source_type: 'property' as const
      }));

      // Format unit audits with unit info
      const formattedUnitAudits = (Array.isArray(unitAudits) ? unitAudits : []).map((audit: any) => ({
        ...audit,
        source_type: 'unit' as const
      }));

      // Combine and sort by created_at
      const allAudits = [...formattedPropertyAudits, ...formattedUnitAudits].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allAudits;
    },
    enabled: !!propertyId && limit > 0,
    staleTime: 30000, // 30 seconds
  });
};
