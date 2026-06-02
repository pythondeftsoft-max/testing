import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MATCHMAKER_KEYS } from '@/lib/queryKeys';

export type EntityType = 'tenant' | 'property';

export interface TenantPipelineStats {
  unassigned: number;
  assigned: number;
  lease_signed: number;
  moved_in_awaiting_payment: number;
  paid_housed: number;
}

export interface PropertyPipelineStats {
  unassigned: number;
  assigned: number;
  in_process: number;
  lease_signed: number;
  moved_in_awaiting_payment: number;
  paid_housed: number;
}

export const useWorkerPipeline = (entityType: EntityType, workerId: string) => {
  return useQuery({
    queryKey: MATCHMAKER_KEYS.workerPipeline(entityType, workerId),
    queryFn: async () => {
      if (entityType === 'tenant') {
        // Fetch tenants assigned to this worker with their placement fee status
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            assigned_worker_id,
            housing_status,
            territory_id,
            pipeline_stage,
            landlord_placement_fees!landlord_placement_fees_tenant_id_fkey (
              payment_status
            )
          `)
          .eq('user_type', 'tenant')
          .eq('assigned_worker_id', workerId);

        if (error) throw error;

        const stats: TenantPipelineStats = {
          unassigned: 0, // Workers don't have unassigned items in their view
          assigned: data?.filter((t: any) => 
            t.housing_status === 'seeking' && t.pipeline_stage === 'assigned'
          ).length || 0,
          lease_signed: data?.filter((t: any) =>
            t.housing_status === 'approved'
          ).length || 0,
          moved_in_awaiting_payment: data?.filter(t => {
            if (t.housing_status !== 'housed') return false;
            const fees = t.landlord_placement_fees as any[];
            if (!fees || fees.length === 0) return true; // No fees recorded yet = awaiting
            return !fees.some(f => f.payment_status === 'paid' || f.payment_status === 'waived');
          }).length || 0,
          paid_housed: data?.filter(t => {
            if (t.housing_status !== 'housed') return false;
            const fees = t.landlord_placement_fees as any[];
            if (!fees || fees.length === 0) return false;
            return fees.some(f => f.payment_status === 'paid' || f.payment_status === 'waived');
          }).length || 0,
        };

        return stats;
      } else {
        // Fetch property units assigned to this worker
        const { data, error } = await supabase
          .from('property_units')
          .select(`
            id,
            assigned_worker_id,
            status,
            on_market,
            territory_id,
            pipeline_stage,
            lease_signed_date,
            move_in_date,
            payment_due_date,
            payment_received_date,
            properties!inner (
              id,
              status,
              deleted_at,
              on_market,
              unit_count
            )
          `)
          .eq('assigned_worker_id', workerId)
          .is('properties.deleted_at', null);

        if (error) throw error;

        // Filter to only units that are on market (matches marketplace logic)
        const onMarketUnits = (data || []).filter((unit: any) => {
          const isMultiUnit = unit.properties?.unit_count > 1;
          
          if (isMultiUnit) {
            // Multi-unit: Only show units explicitly on market
            return unit.on_market === true;
          } else {
            // Single-family: Use property-level setting
            return unit.properties?.on_market === true;
          }
        });

        const stats: PropertyPipelineStats = {
          unassigned: 0, // Workers don't have unassigned items in their view
          assigned: onMarketUnits.filter(u => 
            u.assigned_worker_id && (u.status === 'vacant' || u.status === 'available') && !u.lease_signed_date && u.pipeline_stage === 'available'
          ).length || 0,
          in_process: onMarketUnits.filter(u => 
            u.pipeline_stage === 'in_process'
          ).length || 0,
          lease_signed: onMarketUnits.filter(u => 
            u.lease_signed_date && !u.move_in_date
          ).length || 0,
          moved_in_awaiting_payment: onMarketUnits.filter(u => 
            u.move_in_date && !u.payment_received_date
          ).length || 0,
          paid_housed: onMarketUnits.filter(u => u.payment_received_date).length || 0,
        };

        return stats;
      }
    },
    staleTime: 0, // Consider data always stale for immediate updates
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 30000, // Safety net: refresh every 30 seconds
    enabled: !!workerId,
  });
};
