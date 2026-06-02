import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerActivity {
  id: string;
  created_at: string;
  entity_type: 'tenant' | 'property';
  entity_id: string;
  entity_name: string;
  from_stage: string | null;
  to_stage: string;
  points_earned: number;
  is_forward_move: boolean;
}

export const useWorkerActivityTimeline = (
  workerId: string,
  dateRange: { from: Date; to: Date }
) => {
  return useQuery({
    queryKey: ['worker-activity-timeline', workerId, dateRange],
    enabled: !!workerId,
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from('stage_change_events')
        .select('*')
        .eq('changed_by_id', workerId)
        .eq('changed_by_type', 'worker')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich events with entity names
      const enrichedEvents: WorkerActivity[] = await Promise.all(
        (events || []).map(async (event) => {
          let entityName = 'Unknown';

          if (event.entity_type === 'tenant') {
            // Try to get name from metadata first
            const metadata = event.metadata as any;
            if (metadata?.tenant_name) {
              entityName = metadata.tenant_name;
            } else {
              // Fallback to querying profiles
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', event.entity_id)
                .single();

              if (profile) {
                entityName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Unknown';
              }
            }
          } else if (event.entity_type === 'property') {
            // Try to get address from metadata first
            const metadata = event.metadata as any;
            if (metadata?.property_address) {
              entityName = metadata.property_address;
            } else {
              // Fallback to querying property_units and properties
              const { data: unit } = await supabase
                .from('property_units')
                .select(`
                  property:properties(street_address)
                `)
                .eq('id', event.entity_id)
                .single();

              if (unit && (unit as any).property?.street_address) {
                entityName = (unit as any).property.street_address;
              }
            }
          }

          return {
            id: event.id,
            created_at: event.created_at,
            entity_type: event.entity_type as 'tenant' | 'property',
            entity_id: event.entity_id,
            entity_name: entityName,
            from_stage: event.from_stage,
            to_stage: event.to_stage,
            points_earned: event.points_earned || 0,
            is_forward_move: event.is_forward_move ?? true,
          };
        })
      );

      return enrichedEvents;
    },
  });
};
