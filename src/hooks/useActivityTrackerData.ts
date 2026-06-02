import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityTrackerFilters {
  dateRange: { from: Date; to: Date };
  workerId?: string;
  territoryId?: string;
  entityType?: 'tenant' | 'property' | 'all';
  stageType?: 'forward' | 'backward' | 'all';
}

export interface ActivityFeedItem {
  id: string;
  created_at: string;
  changed_by_id: string;
  changed_by_type: 'worker' | 'admin' | 'system';
  worker_name: string;
  entity_type: 'tenant' | 'property';
  entity_id: string;
  entity_name: string;
  from_stage: string | null;
  to_stage: string;
  points_earned: number;
  is_forward_move: boolean;
  territory_id?: string;
  territory_name?: string;
  notes?: string;
  metadata?: any;
}

export interface ActivityMetrics {
  total_points: number;
  lease_signed_moves: number;
  paid_housed_moves: number;
  backwards_moves: number;
  conversion_rate: number;
  entities_touched: number;
}

export const useActivityTrackerData = (filters: ActivityTrackerFilters) => {
  return useQuery({
    queryKey: ['activity-tracker', filters],
    queryFn: async () => {
      let query = supabase
        .from('stage_change_events')
        .select(`
          *,
          profiles!stage_change_events_changed_by_id_fkey(
            first_name,
            last_name,
            territory_id,
            territories(territory_name)
          )
        `)
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (filters.workerId) {
        query = query.eq('changed_by_id', filters.workerId);
      }

      if (filters.territoryId) {
        query = query.eq('profiles.territory_id', filters.territoryId);
      }

      if (filters.entityType && filters.entityType !== 'all') {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters.stageType && filters.stageType !== 'all') {
        if (filters.stageType === 'forward') {
          query = query.eq('is_forward_move', true);
        } else if (filters.stageType === 'backward') {
          query = query.eq('is_forward_move', false);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // STEP 1: Collect unique entity IDs
      const tenantIds = new Set<string>();
      const propertyIds = new Set<string>();

      (data || []).forEach((event: any) => {
        if (event.entity_type === 'tenant') {
          tenantIds.add(event.entity_id);
        } else if (event.entity_type === 'property') {
          propertyIds.add(event.entity_id);
        }
      });

      // STEP 2: Batch fetch all tenant names with territory
      const { data: tenants } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, territory_id, territories(territory_name)')
        .in('id', Array.from(tenantIds));

      const tenantMap = new Map(
        (tenants || []).map(t => [
          t.id,
          {
            name: `${t.first_name} ${t.last_name}`,
            territory_id: t.territory_id,
            territory_name: (t.territories as any)?.territory_name
          }
        ])
      );

      // STEP 3: Batch fetch all property addresses with territory
      const { data: properties } = await supabase
        .from('properties')
        .select('id, address, territory_id, territories(territory_name)')
        .in('id', Array.from(propertyIds));

      // STEP 3b: Also fetch property units (some property events reference units)
      const { data: propertyUnits } = await supabase
        .from('property_units')
        .select('id, unit_number, unit_name, property_id, territory_id, territories(territory_name), properties(address)')
        .in('id', Array.from(propertyIds));

      // Merge properties and units into one map
      const propertyMap = new Map<string, { address: string; territory_id?: string; territory_name?: string }>();
      
      // Add regular properties
      (properties || []).forEach(p => {
        propertyMap.set(p.id, {
          address: p.address,
          territory_id: p.territory_id,
          territory_name: (p.territories as any)?.territory_name
        });
      });
      
      // Add property units (with unit identifier in address)
      (propertyUnits || []).forEach((u: any) => {
        propertyMap.set(u.id, {
          address: `${u.properties?.address || 'Unknown'} - Unit ${u.unit_number || u.unit_name || '?'}`,
          territory_id: u.territory_id,
          territory_name: (u.territories as any)?.territory_name
        });
      });

      // STEP 4: Map synchronously using lookup maps
      const enrichedData: ActivityFeedItem[] = (data || []).map((event: any) => {
        let entityName = 'Unknown';
        let entityTerritoryId: string | undefined;
        let entityTerritoryName: string | undefined;
        
        if (event.entity_type === 'tenant') {
          const tenant = tenantMap.get(event.entity_id);
          entityName = tenant?.name || 'Unknown';
          entityTerritoryId = tenant?.territory_id;
          entityTerritoryName = tenant?.territory_name;
        } else if (event.entity_type === 'property') {
          const property = propertyMap.get(event.entity_id);
          entityName = property?.address || 'Unknown';
          entityTerritoryId = property?.territory_id;
          entityTerritoryName = property?.territory_name;
        }

        return {
          id: event.id,
          created_at: event.created_at,
          changed_by_id: event.changed_by_id,
          changed_by_type: event.changed_by_type || 'system',
          worker_name: event.profiles 
            ? `${event.profiles.first_name} ${event.profiles.last_name}`
            : 'Unknown Worker',
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          entity_name: entityName,
          from_stage: event.from_stage,
          to_stage: event.to_stage,
          points_earned: event.points_earned || 0,
          is_forward_move: event.is_forward_move,
          territory_id: entityTerritoryId,
          territory_name: entityTerritoryName,
          notes: event.notes,
          metadata: event.metadata,
        };
      });

      // Calculate metrics
      const metrics: ActivityMetrics = {
        total_points: enrichedData.reduce((sum, item) => sum + item.points_earned, 0),
        lease_signed_moves: enrichedData.filter(
          item => item.to_stage === 'lease_signed' && item.is_forward_move
        ).length,
        paid_housed_moves: enrichedData.filter(
          item => ['paid', 'housed', 'housed_paid'].includes(item.to_stage) && item.is_forward_move
        ).length,
        backwards_moves: enrichedData.filter(item => !item.is_forward_move).length,
        conversion_rate: enrichedData.length > 0
          ? (enrichedData.filter(item => item.is_forward_move).length / enrichedData.length) * 100
          : 0,
        entities_touched: new Set(enrichedData.map(item => item.entity_id)).size,
      };

      return {
        activities: enrichedData,
        metrics,
      };
    },
    enabled: !!(filters.dateRange.from && filters.dateRange.to),
  });
};
