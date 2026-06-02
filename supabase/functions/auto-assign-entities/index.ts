import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignmentResult {
  tenantsAssigned: number;
  propertiesAssigned: number;
  workersUsed: string[];
  errors: string[];
  skippedTenants: Array<{id: string; reason: string}>;
  skippedProperties: Array<{id: string; reason: string}>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { entityType = 'both', dryRun = false } = await req.json()

    console.log('Starting auto-assignment', { entityType, dryRun });

    const result: AssignmentResult = {
      tenantsAssigned: 0,
      propertiesAssigned: 0,
      workersUsed: [],
      errors: [],
      skippedTenants: [],
      skippedProperties: []
    }

    // 1. Fetch all active admin users (workers) with their territories
    // Step 1: Fetch active system admins with profiles
    const { data: adminRoles, error: adminError } = await supabase
      .from('system_admins')
      .select(`
        user_id, 
        profiles!inner(first_name, last_name)
      `)
      .eq('is_active', true)
      .in('role_name', ['super_admin', 'operations_admin', 'matchmaker'])

    if (adminError) {
      console.error('Error fetching admins:', adminError);
      throw adminError;
    }

    // Step 2: Fetch all territory assignments
    const { data: territoryAssignments, error: territoryError } = await supabase
      .from('territory_workers')
      .select('worker_id, territory_id, is_primary')

    if (territoryError) {
      console.error('Error fetching territory assignments:', territoryError);
      throw territoryError;
    }

    // Step 3: Merge the data in code
    const workers = adminRoles.map((admin: any) => {
      // Find all territories for this worker
      const workerTerritories = territoryAssignments?.filter(
        (ta: any) => ta.worker_id === admin.user_id
      ) || []
      
      return {
        id: admin.user_id,
        first_name: admin.profiles.first_name,
        last_name: admin.profiles.last_name,
        territories: workerTerritories.map((t: any) => ({
          territory_id: t.territory_id,
          is_primary: t.is_primary
        }))
      }
    })

    console.log(`Found ${workers.length} active workers with territory assignments`);

    if (workers.length === 0) {
      return new Response(JSON.stringify({ 
        ...result, 
        errors: ['No active workers found'] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 2. Calculate current workload for each worker
    const workerWorkloads = new Map()
    for (const worker of workers) {
      const { count: tenantCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_worker_id', worker.id)
        .eq('user_type', 'tenant')
        .neq('housing_status', 'housed')

      const { count: propertyCount } = await supabase
        .from('property_units')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_worker_id', worker.id)
        .neq('status', 'occupied')

      workerWorkloads.set(worker.id, {
        worker,
        currentLoad: (tenantCount || 0) + (propertyCount || 0)
      })
      
      console.log(`Worker ${worker.first_name} ${worker.last_name}: ${(tenantCount || 0) + (propertyCount || 0)} entities`);
    }

    // 3. Assign Tenants (if requested)
    if (entityType === 'tenant' || entityType === 'both') {
      const { data: unassignedTenants, error: tenantsError } = await supabase
        .from('profiles')
        .select('id, territory_id')
        .eq('user_type', 'tenant')
        .eq('housing_status', 'seeking')
        .is('assigned_worker_id', null)
        .is('pipeline_stage', null)

      if (tenantsError) {
        console.error('Error fetching unassigned tenants:', tenantsError);
        result.errors.push(`Failed to fetch tenants: ${tenantsError.message}`);
      } else {
        console.log('Found unassigned tenants:', unassignedTenants?.length || 0);

        for (const tenant of unassignedTenants || []) {
          let eligibleWorkers = Array.from(workerWorkloads.values())
          
          // CRITICAL: Skip tenants without territory assignment
          if (!tenant.territory_id) {
            console.log(`⚠️ Tenant ${tenant.id} has no territory assignment - leaving in queue`);
            result.skippedTenants.push({
              id: tenant.id,
              reason: 'No territory assigned'
            });
            continue;
          }

          // Territory-based filtering
          const territoryMatches = eligibleWorkers.filter(w => 
            w.worker.territories.some((t: any) => t.territory_id === tenant.territory_id)
          )
          
          // CRITICAL: If no workers assigned to this territory, skip this tenant
          if (territoryMatches.length === 0) {
            console.log(`⚠️ No workers assigned to territory ${tenant.territory_id} for tenant ${tenant.id} - leaving in queue`);
            result.skippedTenants.push({
              id: tenant.id,
              reason: 'No workers assigned to territory'
            });
            continue; // Skip to next tenant
          }
          
          // Prioritize primary workers
          const primaryMatches = territoryMatches.filter(w =>
            w.worker.territories.some((t: any) => 
              t.territory_id === tenant.territory_id && t.is_primary
            )
          )
          
          eligibleWorkers = primaryMatches.length > 0 ? primaryMatches : territoryMatches
          
          console.log(`✓ Territory match for tenant ${tenant.id}: ${eligibleWorkers.length} workers (${primaryMatches.length} primary)`);

          if (eligibleWorkers.length === 0) {
            console.log(`⚠️ No eligible workers for tenant ${tenant.id} - leaving in queue`);
            result.skippedTenants.push({
              id: tenant.id,
              reason: 'No eligible workers after filtering'
            });
            continue
          }

          // Sort by workload and pick the least busy
          eligibleWorkers.sort((a, b) => a.currentLoad - b.currentLoad)
          const bestWorker = eligibleWorkers[0]

          console.log(`Assigning tenant ${tenant.id} to worker ${bestWorker.worker.first_name} ${bestWorker.worker.last_name}`);

          // Assign tenant
          if (!dryRun) {
            const { error } = await supabase
              .from('profiles')
              .update({
                assigned_worker_id: bestWorker.worker.id,
                worker_assigned_at: new Date().toISOString(),
                pipeline_stage: 'assigned',
                housing_status: 'seeking'
              })
              .eq('id', tenant.id)

            if (error) {
              const errorMsg = `Failed to assign tenant ${tenant.id}: ${(error instanceof Error ? error.message : String(error))}`;
              console.error(errorMsg);
              result.errors.push(errorMsg);
              continue
            }
          }

          // Update workload tracking
          bestWorker.currentLoad++
          result.tenantsAssigned++
          if (!result.workersUsed.includes(bestWorker.worker.id)) {
            result.workersUsed.push(bestWorker.worker.id)
          }
        }
      }
    }

    // 4. Assign Properties (if requested)
    if (entityType === 'property' || entityType === 'both') {
      // Query units with their parent property to check on_market status
      // Query units: EITHER pipeline_stage IS NULL OR (pipeline_stage = 'available' AND no worker assigned)
      // This catches both fresh units AND orphaned units that were set to 'available' without assignment
      const { data: rawUnits, error: unitsError } = await supabase
        .from('property_units')
        .select(`
          id, 
          territory_id, 
          on_market,
          pipeline_stage,
          assigned_worker_id,
          properties!inner(on_market, deleted_at)
        `)
        .is('properties.deleted_at', null)
        .or('pipeline_stage.is.null,and(pipeline_stage.eq.available,assigned_worker_id.is.null)')

      // Filter to match UI queue logic: 
      // 1. unit.on_market OR property.on_market
      // 2. assigned_worker_id must be null (double-check since we use OR in query)
      const unassignedUnits = (rawUnits || []).filter((unit: any) => 
        (unit.on_market === true || unit.properties.on_market === true) &&
        unit.assigned_worker_id === null
      )

      if (unitsError) {
        console.error('Error fetching unassigned properties:', unitsError);
        result.errors.push(`Failed to fetch properties: ${unitsError.message}`);
      } else {
        console.log('Found unassigned property units:', unassignedUnits?.length || 0);

        for (const unit of unassignedUnits || []) {
          let eligibleWorkers = Array.from(workerWorkloads.values())
          
          // CRITICAL: Skip properties without territory assignment
          if (!unit.territory_id) {
            console.log(`⚠️ Property ${unit.id} has no territory assignment - leaving in queue`);
            result.skippedProperties.push({
              id: unit.id,
              reason: 'No territory assigned'
            });
            continue;
          }

          // Territory-based filtering
          const territoryMatches = eligibleWorkers.filter(w => 
            w.worker.territories.some((t: any) => t.territory_id === unit.territory_id)
          )
          
          // CRITICAL: If no workers assigned to this territory, skip this property
          if (territoryMatches.length === 0) {
            console.log(`⚠️ No workers assigned to territory ${unit.territory_id} for property ${unit.id} - leaving in queue`);
            result.skippedProperties.push({
              id: unit.id,
              reason: 'No workers assigned to territory'
            });
            continue; // Skip to next property
          }
          
          // Prioritize primary workers
          const primaryMatches = territoryMatches.filter(w =>
            w.worker.territories.some((t: any) => 
              t.territory_id === unit.territory_id && t.is_primary
            )
          )
          
          eligibleWorkers = primaryMatches.length > 0 ? primaryMatches : territoryMatches
          
          console.log(`✓ Territory match for property ${unit.id}: ${eligibleWorkers.length} workers (${primaryMatches.length} primary)`);

          if (eligibleWorkers.length === 0) {
            console.log(`⚠️ No eligible workers for property ${unit.id} - leaving in queue`);
            result.skippedProperties.push({
              id: unit.id,
              reason: 'No eligible workers after filtering'
            });
            continue
          }

          eligibleWorkers.sort((a, b) => a.currentLoad - b.currentLoad)
          const bestWorker = eligibleWorkers[0]

          console.log(`Assigning property ${unit.id} to worker ${bestWorker.worker.first_name} ${bestWorker.worker.last_name}`);

          if (!dryRun) {
            const { error } = await supabase
              .from('property_units')
              .update({
                assigned_worker_id: bestWorker.worker.id,
                pipeline_stage: 'available'
              })
              .eq('id', unit.id)

            if (error) {
              const errorMsg = `Failed to assign property ${unit.id}: ${(error instanceof Error ? error.message : String(error))}`;
              console.error(errorMsg);
              result.errors.push(errorMsg);
              continue
            }
          }

          bestWorker.currentLoad++
          result.propertiesAssigned++
          if (!result.workersUsed.includes(bestWorker.worker.id)) {
            result.workersUsed.push(bestWorker.worker.id)
          }
        }
      }
    }

    console.log('Assignment complete:', result);
    console.log(`⚠️ Skipped: ${result.skippedTenants.length} tenants, ${result.skippedProperties.length} properties`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('Auto-assign error:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
