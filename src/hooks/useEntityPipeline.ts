import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'tenant' | 'property';

export interface TenantPipelineStats {
  unassigned: number;
  assigned: number;
  lease_signed: number;
  paid_housed: number;
}

export interface PropertyPipelineStats {
  unassigned: number;
  assigned: number;
  in_process: number;
  lease_signed: number;
  paid_housed: number;
}

export const useEntityPipeline = (entityType: EntityType) => {
  return useQuery({
    queryKey: ['entity-pipeline-v2', entityType],
    queryFn: async () => {
      if (entityType === 'tenant') {
        // Fetch tenants with their placement fee status
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            assigned_worker_id,
            housing_status,
            territory_id,
            pipeline_stage,
            tenant_profiles (
              rent_range_min,
              rent_range_max,
              max_rent,
              bedrooms_approved,
              voucher_holder,
              voucher_amount,
              has_pets,
              pet_type,
              preferred_move_date
            ),
            landlord_placement_fees!landlord_placement_fees_tenant_id_fkey (
              payment_status
            )
          `)
          .eq('user_type', 'tenant');

        if (error) throw error;

        const stats: TenantPipelineStats = {
          unassigned: data?.filter(t => !t.assigned_worker_id).length || 0,
          assigned: data?.filter((t: any) => 
            t.assigned_worker_id && t.housing_status === 'seeking' && t.pipeline_stage === 'assigned'
          ).length || 0,
          lease_signed: data?.filter((t: any) => t.housing_status === 'approved').length || 0,
          paid_housed: data?.filter(t => {
            // Moved to 'housed' only when payment is received
            return t.housing_status === 'housed';
          }).length || 0,
        };

        return stats;
      } else {
        // Fetch property units (not properties) with their placement fee status
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
          .is('properties.deleted_at', null);

        if (error) throw error;

        // Fetch all units first
        const allUnits = data || [];
        
        // Fetch application counts - correctly handle single-family vs multi-unit
        const unitIds = allUnits.map((u: any) => u.id);
        const propertyIds = [...new Set(allUnits.map((u: any) => u.properties.id))];
        
        let appCountMap: Record<string, number> = {};
        if (unitIds.length > 0) {
          // 1. Count property_applications by unit_id (for multi-unit)
          const { data: appsByUnitId } = await supabase
            .from('property_applications')
            .select('unit_id')
            .in('unit_id', unitIds)
            .not('unit_id', 'is', null);
          
          const unitIdCounts: Record<string, number> = {};
          (appsByUnitId || []).forEach(app => {
            unitIdCounts[app.unit_id] = (unitIdCounts[app.unit_id] || 0) + 1;
          });
          
          // 2. Count property_applications by property_id (for single-family)
          const { data: appsByPropertyId } = await supabase
            .from('property_applications')
            .select('property_id')
            .in('property_id', propertyIds)
            .not('property_id', 'is', null);
          
          const propertyIdCounts: Record<string, number> = {};
          (appsByPropertyId || []).forEach(app => {
            propertyIdCounts[app.property_id] = (propertyIdCounts[app.property_id] || 0) + 1;
          });
          
          // 3. Count marketplace_applications by unit_id (for multi-unit)
          const { data: marketplaceAppsByUnit } = await supabase
            .from('marketplace_applications')
            .select('unit_id')
            .in('unit_id', unitIds)
            .not('unit_id', 'is', null)
            .not('status', 'in', '("rejected","withdrawn")');
          
          const marketplaceUnitCounts: Record<string, number> = {};
          (marketplaceAppsByUnit || []).forEach(app => {
            marketplaceUnitCounts[app.unit_id] = (marketplaceUnitCounts[app.unit_id] || 0) + 1;
          });
          
          // Merge counts based on property type
          allUnits.forEach((unit: any) => {
            const isMultiUnit = unit.properties?.unit_count > 1;
            
            if (isMultiUnit) {
              const propertyAppCount = unitIdCounts[unit.id] || 0;
              const marketplaceAppCount = marketplaceUnitCounts[unit.id] || 0;
              appCountMap[unit.id] = propertyAppCount + marketplaceAppCount;
            } else {
              appCountMap[unit.id] = propertyIdCounts[unit.properties.id] || 0;
            }
          });
        }
        
        // Smart filter: Show units that are on_market OR paused (6+ apps) OR in later pipeline stages
        const pipelineUnits = allUnits.filter((unit: any) => {
          const isMultiUnit = unit.properties?.unit_count > 1;
          const isOnMarket = isMultiUnit ? unit.on_market === true : unit.properties?.on_market === true;
          const appCount = appCountMap[unit.id] || 0;
          const isPausedAtLimit = appCount >= 6;
          const isInLaterStage = ['in_process', 'lease_signed', 'paid_housed', 'filled_awaiting_payment'].includes(unit.pipeline_stage);
          
          return isOnMarket || isPausedAtLimit || isInLaterStage;
        });

        const stats: PropertyPipelineStats = {
          unassigned: pipelineUnits.filter(u => !u.assigned_worker_id).length || 0,
          assigned: pipelineUnits.filter(u => 
            u.assigned_worker_id && (u.status === 'vacant' || u.status === 'available') && !u.lease_signed_date && 
            (u.pipeline_stage === 'available' || u.pipeline_stage === 'assigned')
          ).length || 0,
          in_process: pipelineUnits.filter(u => 
            u.pipeline_stage === 'in_process'
          ).length || 0,
          lease_signed: pipelineUnits.filter(u => 
            u.pipeline_stage === 'lease_signed' || u.pipeline_stage === 'filled_awaiting_payment'
          ).length || 0,
          paid_housed: pipelineUnits.filter(u => 
            u.pipeline_stage === 'paid_housed'
          ).length || 0,
        };

        return stats;
      }
    },
    staleTime: 0, // Consider data always stale for immediate updates
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 30000, // Safety net: refresh every 30 seconds
  });
};

export const useUnassignedEntities = (entityType: EntityType) => {
  return useQuery({
    queryKey: ['unassigned-entities', entityType],
    queryFn: async () => {
      if (entityType === 'tenant') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_type', 'tenant')
          .is('assigned_worker_id', null)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return (data || []).map((t: any) => ({
          id: t.id,
          full_name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Unknown',
          email: t.email,
          max_budget: t.max_budget,
          desired_bedrooms: t.desired_bedrooms,
          created_at: t.created_at,
        }));
      } else {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active')
          .is('assigned_worker_id', null)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return (data || []).map((p: any) => ({
          id: p.id,
          title: p.address || 'Unknown Property',
          address: p.address,
          price: p.monthly_rent,
          bedrooms: p.bedrooms,
          created_at: p.created_at,
        }));
      }
    },
  });
};
