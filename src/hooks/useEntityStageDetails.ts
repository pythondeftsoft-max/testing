import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'tenant' | 'property';
export type TenantStage = 'unassigned' | 'assigned' | 'lease_signed' | 'paid_housed';
export type PropertyStage = 'unassigned' | 'assigned' | 'in_process' | 'lease_signed' | 'paid_housed';

interface TenantDetail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  housing_status: string | null;
  assigned_worker_id: string | null;
  territory_id: string | null;
  created_at: string;
  max_budget: number | null;
  desired_bedrooms: number | null;
  rent_range_min: number | null;
  rent_range_max: number | null;
  max_rent: number | null;
  bedrooms_approved: number[] | null;
  voucher_holder: boolean | null;
  voucher_amount: number | null;
  has_pets: boolean | null;
  pet_type: string | null;
  preferred_move_date: string | null;
  move_in_window: string | null;
  signup_notes: string | null;
  city: string | null;
  state: string | null;
  applications_count?: number;
  pushes_count?: number;
  assigned_worker?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  territory?: {
    id: string;
    territory_name: string;
    region_code: string | null;
  } | null;
  unit_application?: {
    id: string;
    status: string;
    priority_payment_made: boolean;
    lease_signed_date: string | null;
    move_in_date: string | null;
    payment_due_date: string | null;
    payment_received_date: string | null;
  } | null;
  matched_unit?: {
    application_id: string;
    priority_payment_amount: number | null;
    unit_id: string;
    unit_number: string | null;
    unit_name: string | null;
    property_id: string;
    property_address: string;
    property_city: string | null;
    property_state: string | null;
    property_territory_id: string | null;
    property_territory?: {
      id: string;
      territory_name: string;
      region_code: string | null;
    } | null;
    monthly_rent: number | null;
    lease_start_date: string | null;
    unit_assigned_worker_id: string | null;
    unit_assigned_worker?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  payment_link?: {
    id: string;
    created_at: string;
    expires_at: string;
    accessed_count: number | null;
    last_accessed_at: string | null;
  } | null;
}

interface PropertyDetail {
  id: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  vacancy_status: string | null;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  assigned_worker_id: string | null;
  territory_id: string | null;
  on_market: boolean | null;
  created_at: string;
  assigned_at?: string;
  owner_id: string;
  lease_signed_date: string | null;
  move_in_date: string | null;
  payment_due_date: string | null;
  payment_received_date: string | null;
  applications_count?: number;
  pushes_count?: number;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
  listed_date?: string | null;
  unit_number?: string | null;
  assigned_worker?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  territory?: {
    id: string;
    territory_name: string;
    region_code: string | null;
  } | null;
  portfolio_client_email?: string | null;
  properties?: {
    id: string;
    address: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    owner_id: string;
    on_market: boolean | null;
    unit_count: number | null;
    monthly_rent: number | null;
    portfolio_id?: string | null;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
    };
    portfolios?: {
      client_email: string | null;
    } | null;
  };
  matched_tenant?: {
    application_id: string;
    tenant_id: string;
    tenant_first_name: string | null;
    tenant_last_name: string | null;
    tenant_email: string;
    tenant_phone: string | null;
    tenant_assigned_worker_id: string | null;
    tenant_assigned_worker?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    tenant_territory_id: string | null;
    tenant_territory?: {
      id: string;
      territory_name: string;
      region_code: string | null;
    } | null;
    tenant_housing_status: string | null;
    move_in_window: string | null;
    rent_range_min: number | null;
    rent_range_max: number | null;
    voucher_holder: boolean | null;
  } | null;
  primary_applicant?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  payment_link?: {
    id: string;
    created_at: string;
    expires_at: string;
    accessed_count: number | null;
    last_accessed_at: string | null;
  } | null;
}

export const useEntityStageDetails = (
  entityType: EntityType,
  stage: TenantStage | PropertyStage,
  workerId?: string
) => {
  return useQuery({
    queryKey: ['entity-stage-details', entityType, stage, workerId],
    queryFn: async () => {
      if (entityType === 'tenant') {
        return fetchTenantStageDetails(stage as TenantStage, workerId);
      } else {
        return fetchPropertyStageDetails(stage as PropertyStage, workerId);
      }
    },
    staleTime: 0, // Consider data always stale for immediate updates
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 30000, // Poll every 30 seconds for pipeline updates
    enabled: !!entityType && !!stage,
  });
};

async function fetchTenantStageDetails(stage: TenantStage, workerId?: string): Promise<TenantDetail[]> {
  let query = supabase
    .from('profiles')
    .select(`
      id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      housing_status, 
      assigned_worker_id,
      territory_id,
      created_at,
      tenant_profiles (
        rent_range_min,
        rent_range_max,
        max_rent,
        bedrooms_approved,
        voucher_holder,
        voucher_amount,
        has_pets,
        pet_type,
        preferred_move_date,
        move_in_window,
        signup_notes,
        city,
        state,
        monthly_income,
        employment_status,
        credit_score_range,
        has_eviction,
        eviction_details,
        has_felonies,
        felony_details
      ),
      territory:territories(
        id,
        territory_name,
        region_code
      )
    `)
    .eq('user_type', 'tenant');

  switch (stage) {
    case 'unassigned':
      query = query.is('assigned_worker_id', null);
      break;
    case 'assigned':
      query = query.not('assigned_worker_id', 'is', null).eq('housing_status', 'seeking').eq('pipeline_stage', 'assigned');
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
    case 'lease_signed':
      query = query.eq('housing_status', 'approved');
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
    case 'paid_housed':
      query = query.eq('housing_status', 'housed');
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Get unique worker IDs
  const workerIds = [...new Set(
    (data || [])
      .map((t: any) => t.assigned_worker_id)
      .filter(Boolean)
  )];

  // Fetch worker details if there are any
  let workers: Record<string, any> = {};
  if (workerIds.length > 0) {
    const { data: workerData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', workerIds);
    
    workers = (workerData || []).reduce((acc, worker) => {
      acc[worker.id] = worker;
      return acc;
    }, {} as Record<string, any>);
  }

  // Get tenant IDs for counting
  const tenantIds = (data || []).map((t: any) => t.id);

  // Fetch applications count per tenant
  let appCountMap: Record<string, number> = {};
  if (tenantIds.length > 0) {
    const { data: appCounts } = await supabase
      .from('property_applications')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    appCountMap = (appCounts || []).reduce((acc, app) => {
      acc[app.tenant_id] = (acc[app.tenant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Fetch pushes count per tenant
  let pushCountMap: Record<string, number> = {};
  if (tenantIds.length > 0) {
    const { data: pushCounts } = await supabase
      .from('property_pushes')
      .select('tenant_id')
      .in('tenant_id', tenantIds);

    pushCountMap = (pushCounts || []).reduce((acc, push) => {
      acc[push.tenant_id] = (acc[push.tenant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Payment link data is now only relevant in property pipeline (lease_signed stage removed from tenant pipeline)
  const paymentLinksMap: Record<string, any> = {};

  // Fetch matched unit details for tenants who have been matched (approved or housed)
  // This ensures payment dialogs always have property/unit data regardless of active tab
  let matchedUnitsMap: Record<string, any> = {};
  const matchedTenantIds = (data || [])
    .filter((t: any) => t.housing_status === 'approved' || t.housing_status === 'housed')
    .map((t: any) => t.id);
  
  if (matchedTenantIds.length > 0) {
    // First, check unit_applications
    const { data: unitApps } = await supabase
      .from('unit_applications')
      .select(`
        id,
        tenant_id,
        unit_id,
        priority_payment_amount,
        lease_signed_date,
        property_units!inner(
          id,
          unit_number,
          unit_name,
          property_id,
          assigned_worker_id,
          monthly_rent,
          lease_start_date,
          properties!inner(
            id,
            street_address,
            city,
            state,
            territory_id,
            territories(
              id,
              territory_name,
              region_code
            )
          )
        )
      `)
      .eq('status', 'approved')
      .in('tenant_id', matchedTenantIds);

    // Get unit worker IDs
    const unitWorkerIds = [...new Set(
      (unitApps || [])
        .map((app: any) => app.property_units?.assigned_worker_id)
        .filter(Boolean)
    )];

    // Fetch unit worker details
    let unitWorkers: Record<string, any> = {};
    if (unitWorkerIds.length > 0) {
      const { data: unitWorkerData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', unitWorkerIds);
      
      unitWorkers = (unitWorkerData || []).reduce((acc, worker) => {
        acc[worker.id] = worker;
        return acc;
      }, {} as Record<string, any>);
    }

    matchedUnitsMap = (unitApps || []).reduce((acc, app) => {
      const unit = app.property_units;
      const property = unit?.properties;
      acc[app.tenant_id] = {
        application_id: app.id,
        priority_payment_amount: app.priority_payment_amount,
        unit_id: app.unit_id,
        unit_number: unit?.unit_number,
        unit_name: unit?.unit_name,
        property_id: unit?.property_id,
        property_address: property?.street_address,
        property_city: property?.city,
        property_state: property?.state,
        property_territory_id: property?.territory_id,
        property_territory: property?.territories || null,
        monthly_rent: unit?.monthly_rent,
        lease_start_date: unit?.lease_start_date,
        unit_assigned_worker_id: unit?.assigned_worker_id,
        unit_assigned_worker: unit?.assigned_worker_id ? unitWorkers[unit.assigned_worker_id] : null,
      };
      return acc;
    }, {} as Record<string, any>);

    // Also check marketplace_applications for tenants that don't have unit_applications
    const tenantsWithoutUnitApps = matchedTenantIds.filter(id => !matchedUnitsMap[id]);
    
    if (tenantsWithoutUnitApps.length > 0) {
      const { data: marketplaceApps } = await supabase
        .from('marketplace_applications')
        .select(`
          id,
          user_id,
          unit_id,
          property_units!inner(
            id,
            unit_number,
            unit_name,
            property_id,
            assigned_worker_id,
            monthly_rent,
            lease_start_date,
            properties!inner(
              id,
              street_address,
              city,
              state,
              territory_id,
              territories(
                id,
                territory_name,
                region_code
              )
            )
          )
        `)
        .in('status', ['lease_signed', 'approved'])
        .in('user_id', tenantsWithoutUnitApps);

      // Get marketplace unit worker IDs
      const marketplaceWorkerIds = [...new Set(
        (marketplaceApps || [])
          .map((app: any) => app.property_units?.assigned_worker_id)
          .filter(Boolean)
      )];

      // Fetch marketplace unit worker details
      let marketplaceWorkers: Record<string, any> = {};
      if (marketplaceWorkerIds.length > 0) {
        const { data: marketplaceWorkerData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', marketplaceWorkerIds);
        
        marketplaceWorkers = (marketplaceWorkerData || []).reduce((acc, worker) => {
          acc[worker.id] = worker;
          return acc;
        }, {} as Record<string, any>);
      }

      // Merge marketplace data into matchedUnitsMap
      const marketplaceList = marketplaceApps || [];
      for (const app of marketplaceList) {
        if (!matchedUnitsMap[app.user_id]) {
          const unit = app.property_units;
          const property = unit?.properties;
          matchedUnitsMap[app.user_id] = {
            application_id: app.id,
            priority_payment_amount: null,
            unit_id: app.unit_id,
            unit_number: unit?.unit_number,
            unit_name: unit?.unit_name,
            property_id: unit?.property_id,
            property_address: property?.street_address,
            property_city: property?.city,
            property_state: property?.state,
            property_territory_id: property?.territory_id,
            property_territory: property?.territories || null,
            monthly_rent: unit?.monthly_rent,
            lease_start_date: unit?.lease_start_date,
            unit_assigned_worker_id: unit?.assigned_worker_id,
            unit_assigned_worker: unit?.assigned_worker_id ? marketplaceWorkers[unit.assigned_worker_id] : null,
          };
        }
      }
    }
  }

  // Combine the data with flattened tenant_profiles
  return (data || []).map((t: any) => ({
    ...t,
    max_budget: null,
    desired_bedrooms: null,
    rent_range_min: t.tenant_profiles?.rent_range_min,
    rent_range_max: t.tenant_profiles?.rent_range_max,
    max_rent: t.tenant_profiles?.max_rent,
    bedrooms_approved: t.tenant_profiles?.bedrooms_approved,
    voucher_holder: t.tenant_profiles?.voucher_holder,
    voucher_amount: t.tenant_profiles?.voucher_amount,
    has_pets: t.tenant_profiles?.has_pets,
    pet_type: t.tenant_profiles?.pet_type,
    preferred_move_date: t.tenant_profiles?.preferred_move_date,
    move_in_window: t.tenant_profiles?.move_in_window,
    signup_notes: t.tenant_profiles?.signup_notes,
    city: t.tenant_profiles?.city,
    state: t.tenant_profiles?.state,
    monthly_income: t.tenant_profiles?.monthly_income,
    employment_status: t.tenant_profiles?.employment_status,
    credit_score_range: t.tenant_profiles?.credit_score_range,
    has_eviction: t.tenant_profiles?.has_eviction,
    eviction_details: t.tenant_profiles?.eviction_details,
    has_felonies: t.tenant_profiles?.has_felonies,
    felony_details: t.tenant_profiles?.felony_details,
    applications_count: appCountMap[t.id] || 0,
    pushes_count: pushCountMap[t.id] || 0,
    assigned_worker: t.assigned_worker_id ? workers[t.assigned_worker_id] : null,
    matched_unit: matchedUnitsMap[t.id] || null,
    payment_link: paymentLinksMap[t.id] || null
  }));
}

async function fetchPropertyStageDetails(stage: PropertyStage, workerId?: string): Promise<PropertyDetail[]> {
  let query = supabase
    .from('property_units')
    .select(`
      id,
      unit_number,
      unit_name,
      status,
      monthly_rent,
      bedrooms,
      bathrooms,
      assigned_worker_id,
      territory_id,
      on_market,
      created_at,
      assigned_at,
      current_tenant_id,
      lease_signed_date,
      move_in_date,
      payment_due_date,
      payment_received_date,
      pipeline_stage,
      listed_date,
      assigned_worker:profiles!property_units_assigned_worker_id_fkey(
        first_name,
        last_name
      ),
      territory:territories(
        id,
        territory_name,
        region_code
      ),
      properties!inner (
        id,
        address,
        street_address,
        city,
        state,
        owner_id,
        deleted_at,
        on_market,
        unit_count,
        monthly_rent,
        portfolio_id,
        profiles!fk_properties_owner(first_name, last_name),
        portfolios(client_email)
      )
    `)
    .is('properties.deleted_at', null);

  switch (stage) {
    case 'unassigned':
      query = query.is('assigned_worker_id', null);
      break;
    case 'assigned':
      query = query
        .not('assigned_worker_id', 'is', null)
        .in('status', ['vacant', 'available'])
        .is('lease_signed_date', null)
        .in('pipeline_stage', ['available', 'assigned']);
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
    case 'in_process':
      query = query.eq('pipeline_stage', 'in_process');
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
    case 'lease_signed':
      query = query.in('pipeline_stage', ['lease_signed', 'filled_awaiting_payment']);
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
    case 'paid_housed':
      query = query.eq('pipeline_stage', 'paid_housed');
      if (workerId) {
        query = query.eq('assigned_worker_id', workerId);
      }
      break;
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  
  // Fetch all units first (before filtering)
  let allUnits = data || [];
  
  // Fetch application counts per unit - correctly handle single-family vs multi-unit
  const unitIds = allUnits.map((unit: any) => unit.id);
  const unitPropertyIds = [...new Set(allUnits.map((unit: any) => unit.properties.id))];
  
  let appCountMap: Record<string, number> = {};
  if (unitIds.length > 0) {
    // 1. Count property_applications by unit_id (for multi-unit properties)
    const { data: appsByUnitId } = await supabase
      .from('property_applications')
      .select('unit_id')
      .in('unit_id', unitIds)
      .not('unit_id', 'is', null);
    
    const unitIdCounts: Record<string, number> = {};
    (appsByUnitId || []).forEach(app => {
      unitIdCounts[app.unit_id] = (unitIdCounts[app.unit_id] || 0) + 1;
    });
    
    // 2. Count property_applications by property_id (for single-family properties)
    const { data: appsByPropertyId } = await supabase
      .from('property_applications')
      .select('property_id')
      .in('property_id', unitPropertyIds)
      .not('property_id', 'is', null);
    
    const propertyIdCounts: Record<string, number> = {};
    (appsByPropertyId || []).forEach(app => {
      propertyIdCounts[app.property_id] = (propertyIdCounts[app.property_id] || 0) + 1;
    });
    
    // 3. Count marketplace_applications by unit_id (for multi-unit properties)
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
        // Multi-unit: count by unit_id from both tables
        const propertyAppCount = unitIdCounts[unit.id] || 0;
        const marketplaceAppCount = marketplaceUnitCounts[unit.id] || 0;
        appCountMap[unit.id] = propertyAppCount + marketplaceAppCount;
      } else {
        // Single-family: count by property_id
        appCountMap[unit.id] = propertyIdCounts[unit.properties.id] || 0;
      }
    });
  }
  
  // Smart filter: Show units that are on_market OR paused (6+ apps) OR in later pipeline stages
  const filteredData = allUnits.filter((unit: any) => {
    const isMultiUnit = unit.properties?.unit_count > 1;
    const isOnMarket = isMultiUnit ? unit.on_market === true : unit.properties?.on_market === true;
    const appCount = appCountMap[unit.id] || 0;
    const isPausedAtLimit = appCount >= 6;
    const isInLaterStage = ['in_process', 'lease_signed', 'paid_housed', 'filled_awaiting_payment'].includes(unit.pipeline_stage);
    
    // Show if: on_market OR paused at limit OR already progressed in pipeline
    return isOnMarket || isPausedAtLimit || isInLaterStage;
  });
  
  // Fetch push counts per property
  const propertyIds = [...new Set(filteredData.map((unit: any) => unit.properties.id))];
  let pushCountMap: Record<string, number> = {};
  if (propertyIds.length > 0) {
    const { data: pushCounts } = await supabase
      .from('property_pushes')
      .select('property_id')
      .in('property_id', propertyIds);
    
    pushCountMap = (pushCounts || []).reduce((acc, push) => {
      acc[push.property_id] = (acc[push.property_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  // Fetch payment link data for lease_signed stage (for properties)
  let propertyPaymentLinksMap: Record<string, any> = {};
  if (stage === 'lease_signed' && unitIds.length > 0) {
    const { data: paymentLinks } = await supabase
      .from('landlord_placement_fees')
      .select(`
        id,
        unit_id,
        placement_fee_payment_links!inner(
          id,
          created_at,
          expires_at,
          accessed_count,
          last_accessed_at
        )
      `)
      .eq('payment_status', 'pending')
      .in('unit_id', unitIds);

    propertyPaymentLinksMap = (paymentLinks || []).reduce((acc, fee) => {
      const links = Array.isArray(fee.placement_fee_payment_links) 
        ? fee.placement_fee_payment_links 
        : [fee.placement_fee_payment_links];
      
      // Get the most recent link
      if (links.length > 0) {
        const mostRecentLink = links.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        acc[fee.unit_id] = {
          id: mostRecentLink.id,
          placement_fee_id: (fee as any).id,
          created_at: mostRecentLink.created_at,
          expires_at: mostRecentLink.expires_at,
          accessed_count: mostRecentLink.accessed_count,
          last_accessed_at: mostRecentLink.last_accessed_at,
        };
      }
      return acc;
    }, {} as Record<string, any>);
  }

  // Fetch matched tenant information for lease_signed and paid_housed stages
  let matchedTenantsMap: Record<string, any> = {};
  if (stage === 'lease_signed' || stage === 'paid_housed') {
    const unitsWithTenants = filteredData.filter((unit: any) => unit.current_tenant_id);
    
    console.log('🔍 STEP 1: Units with current_tenant_id:', {
      stage,
      totalUnits: filteredData.length,
      unitsWithCurrentTenantId: unitsWithTenants.length,
      unitDetails: unitsWithTenants.map((u: any) => ({
        unitId: u.id,
        tenantId: u.current_tenant_id,
        address: u.properties?.street_address
      }))
    });
    
    if (unitsWithTenants.length > 0) {
      const tenantIds = unitsWithTenants.map((unit: any) => unit.current_tenant_id).filter(Boolean);
      const unitIds = unitsWithTenants.map((unit: any) => unit.id).filter(Boolean);
      
      console.log('🔍 STEP 2: Fetching tenant data for IDs:', tenantIds);
      
      // STEP 2B: Fetch application IDs for units with tenants
      const { data: applicationData, error: appError } = await supabase
        .from('property_applications')
        .select('id, unit_id, tenant_id')
        .in('unit_id', unitIds)
        .in('tenant_id', tenantIds);
      
      if (appError) {
        console.error('🔍 STEP 2B: ERROR fetching application data:', appError);
      } else {
        console.log('🔍 STEP 2B: Fetched application data successfully:', applicationData);
      }
      
      // Create map of unit_id+tenant_id -> application_id
      const applicationMap: Record<string, string> = {};
      (applicationData || []).forEach((app: any) => {
        const key = `${app.unit_id}_${app.tenant_id}`;
        applicationMap[key] = app.id;
      });
      
      console.log('🔍 STEP 2C: Application map created:', applicationMap);
      
      // STEP 2D: Also check marketplace_applications for any missing application IDs
      const { data: marketplaceAppData, error: marketplaceAppError } = await supabase
        .from('marketplace_applications')
        .select('id, unit_id, user_id')
        .in('unit_id', unitIds)
        .in('user_id', tenantIds)
        .in('status', ['lease_signed', 'approved', 'lease_sent']);
      
      if (marketplaceAppError) {
        console.error('🔍 STEP 2D: ERROR fetching marketplace application data:', marketplaceAppError);
      } else {
        console.log('🔍 STEP 2D: Fetched marketplace application data successfully:', marketplaceAppData);
      }
      
      // Merge into applicationMap (marketplace applications take precedence if not already present)
      (marketplaceAppData || []).forEach((app: any) => {
        const key = `${app.unit_id}_${app.user_id}`;
        if (!applicationMap[key]) {
          applicationMap[key] = app.id;
        }
      });
      
      console.log('🔍 STEP 2E: Application map after marketplace merge:', applicationMap);
      
      // STEP 2F: Also check property_pushes for admin-driven matches
      const { data: pushData, error: pushError } = await supabase
        .from('property_pushes')
        .select('id, unit_id, tenant_id')
        .in('unit_id', unitIds)
        .in('tenant_id', tenantIds)
        .in('status', ['lease_signed', 'primary_applicant', 'lease_sent']);
      
      if (pushError) {
        console.error('🔍 STEP 2F: ERROR fetching property push data:', pushError);
      } else {
        console.log('🔍 STEP 2F: Fetched property push data successfully:', pushData);
      }
      
      // Merge into applicationMap (pushes take precedence for admin-driven matches)
      (pushData || []).forEach((push: any) => {
        const key = `${push.unit_id}_${push.tenant_id}`;
        if (!applicationMap[key]) {
          applicationMap[key] = push.id;
        }
      });
      
      console.log('🔍 STEP 2G: Final application map after push merge:', applicationMap);
      
      // STEP 3A: Fetch tenant basic data (without assigned_worker foreign key)
      const { data: tenantData, error: tenantError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          housing_status,
          assigned_worker_id,
          territory_id,
          territory:territories(
            id,
            territory_name,
            region_code
          ),
          tenant_profiles(
            move_in_window,
            rent_range_min,
            rent_range_max,
            voucher_holder
          )
        `)
        .in('id', tenantIds);
      
      if (tenantError) {
        console.error('🔍 STEP 3A: ERROR fetching tenant data:', tenantError);
      } else {
        console.log('🔍 STEP 3A: Fetched tenant data successfully:', {
          tenantCount: tenantData?.length || 0,
          tenants: tenantData?.map((t: any) => ({
            id: t.id,
            name: `${t.first_name} ${t.last_name}`,
            email: t.email,
            assigned_worker_id: t.assigned_worker_id,
            tenant_profiles: t.tenant_profiles
          }))
        });
      }
      
      // STEP 3B: Fetch assigned worker data separately
      const workerIds = [...new Set(
        (tenantData || [])
          .map((t: any) => t.assigned_worker_id)
          .filter(Boolean)
      )];
      
      console.log('🔍 STEP 3B: Fetching worker data for IDs:', workerIds);
      
      let workerDataMap: Record<string, any> = {};
      if (workerIds.length > 0) {
        const { data: workerData, error: workerError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', workerIds);
        
        if (workerError) {
          console.error('🔍 STEP 3B: ERROR fetching worker data:', workerError);
        } else {
          console.log('🔍 STEP 3B: Fetched worker data successfully:', workerData);
          // Map by ID for easy lookup
          workerDataMap = (workerData || []).reduce((acc, worker) => {
            acc[worker.id] = worker;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // STEP 4: Map tenant data by unit (with manually joined worker data)
      matchedTenantsMap = unitsWithTenants.reduce((acc, unit) => {
        const tenant = (tenantData || []).find((t: any) => t.id === unit.current_tenant_id);
        
        console.log('🔍 STEP 4: Mapping unit to tenant:', {
          unitId: unit.id,
          unitTenantId: unit.current_tenant_id,
          tenantFound: !!tenant,
          tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'NOT FOUND'
        });
        
        if (tenant) {
          // Handle tenant_profiles as either object or array
          const tenantProfile = Array.isArray(tenant.tenant_profiles) 
            ? tenant.tenant_profiles[0] 
            : tenant.tenant_profiles;
          
          // Get application_id from the map
          const appKey = `${unit.id}_${tenant.id}`;
          const applicationId = applicationMap[appKey];
          
          console.log('🔍 STEP 4B: Looking up application_id:', {
            appKey,
            applicationId,
            applicationMap
          });
          
          const mappedData = {
            application_id: applicationId,
            tenant_id: tenant.id,
            tenant_first_name: tenant.first_name,
            tenant_last_name: tenant.last_name,
            tenant_email: tenant.email,
            tenant_phone: tenant.phone,
            tenant_housing_status: tenant.housing_status,
            tenant_assigned_worker_id: tenant.assigned_worker_id,
            tenant_assigned_worker: tenant.assigned_worker_id 
              ? workerDataMap[tenant.assigned_worker_id] 
              : null,
            tenant_territory_id: tenant.territory_id,
            tenant_territory: tenant.territory,
            move_in_window: tenantProfile?.move_in_window,
            rent_range_min: tenantProfile?.rent_range_min,
            rent_range_max: tenantProfile?.rent_range_max,
            voucher_holder: tenantProfile?.voucher_holder,
          };
          
          console.log('🔍 STEP 5: Created mapped tenant data:', {
            unitId: unit.id,
            mappedData
          });
          
          acc[unit.id] = mappedData;
        }
        return acc;
      }, {} as Record<string, any>);
      
      console.log('🔍 STEP 6: Final matchedTenantsMap:', {
        unitsCount: Object.keys(matchedTenantsMap).length,
        matchedTenantsMap
      });
    }
  }
  
  // Fetch primary applicant for each unit (from property_applications and marketplace_applications)
  let primaryApplicantsMap: Record<string, any> = {};
  if (unitIds.length > 0) {
    // Check property_applications first
    const { data: propAppPrimaries } = await supabase
      .from('property_applications')
      .select(`
        unit_id,
        property_id,
        tenant_id,
        application_data,
        profiles!property_applications_tenant_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('is_primary_applicant', true)
      .in('unit_id', unitIds);

    // Also check by property_id for single-family homes (where unit_id might be null)
    const propertyIds = [...new Set(filteredData.map((unit: any) => unit.properties.id))];
    const { data: propAppPrimariesByProperty } = await supabase
      .from('property_applications')
      .select(`
        unit_id,
        property_id,
        tenant_id,
        application_data,
        profiles!property_applications_tenant_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('is_primary_applicant', true)
      .is('unit_id', null)
      .in('property_id', propertyIds);

    // Build a map of property_id -> unit_id for single-family homes
    const singleFamilyPropertyToUnit: Record<string, string> = {};
    filteredData.forEach((unit: any) => {
      if (unit.properties?.unit_count === 1) {
        singleFamilyPropertyToUnit[unit.properties.id] = unit.id;
      }
    });

    // Process property_applications primaries
    (propAppPrimaries || []).forEach((app: any) => {
      // Use unit_id directly if present, or get original_unit_id from application_data
      const effectiveUnitId = app.unit_id || app.application_data?.original_unit_id;
      if (effectiveUnitId && app.profiles) {
        primaryApplicantsMap[effectiveUnitId] = {
          id: app.profiles.id,
          first_name: app.profiles.first_name,
          last_name: app.profiles.last_name,
        };
      }
    });

    // Process property-level applications - check original_unit_id from application_data first, then fallback to single-family mapping
    (propAppPrimariesByProperty || []).forEach((app: any) => {
      // First check if application_data has original_unit_id that matches one of our units
      const originalUnitId = app.application_data?.original_unit_id;
      const unitId = (originalUnitId && unitIds.includes(originalUnitId)) 
        ? originalUnitId 
        : singleFamilyPropertyToUnit[app.property_id];
      if (unitId && app.profiles && !primaryApplicantsMap[unitId]) {
        primaryApplicantsMap[unitId] = {
          id: app.profiles.id,
          first_name: app.profiles.first_name,
          last_name: app.profiles.last_name,
        };
      }
    });

    // Also check marketplace_applications
    const { data: marketplacePrimaries } = await supabase
      .from('marketplace_applications')
      .select(`
        unit_id,
        user_id,
        profiles!marketplace_applications_user_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('is_primary_applicant', true)
      .in('unit_id', unitIds);

    // Merge marketplace primaries (don't overwrite if already have one from property_applications)
    (marketplacePrimaries || []).forEach((app: any) => {
      if (app.unit_id && app.profiles && !primaryApplicantsMap[app.unit_id]) {
        primaryApplicantsMap[app.unit_id] = {
          id: app.profiles.id,
          first_name: app.profiles.first_name,
          last_name: app.profiles.last_name,
        };
      }
    });
  }
  
  // Transform unit data to PropertyDetail format
  const allPropertyDetails = filteredData.map((unit: any) => {
    // Use base address only - unit number is displayed separately in the UI subtitle
    const baseAddress = unit.properties.address || unit.properties.street_address || 'Unknown Address';

      const matchedTenant = matchedTenantsMap[unit.id] || null;
      const primaryApplicant = primaryApplicantsMap[unit.id] || null;
      
      console.log('🔍 STEP 7: Building return object for unit:', {
        unitId: unit.id,
        address: baseAddress,
        hasMatchedTenant: !!matchedTenant,
        matchedTenant,
        primaryApplicant
      });
      
      return {
        id: unit.id,
        unit_number: unit.unit_number,
        street_address: baseAddress,
        city: unit.properties.city,
        state: unit.properties.state,
        vacancy_status: unit.status,
        monthly_rent: unit.monthly_rent ?? unit.properties.monthly_rent,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        assigned_worker_id: unit.assigned_worker_id,
        territory_id: unit.territory_id,
        assigned_worker: unit.assigned_worker,
        territory: unit.territory,
        assigned_at: unit.assigned_at,
        on_market: unit.on_market,
        listed_date: unit.listed_date,
        created_at: unit.created_at,
        owner_id: unit.properties.owner_id,
        lease_signed_date: unit.lease_signed_date,
        move_in_date: unit.move_in_date,
        payment_due_date: unit.payment_due_date,
        payment_received_date: unit.payment_received_date,
        applications_count: appCountMap[unit.id] || 0,
        pushes_count: pushCountMap[unit.properties.id] || 0,
        profiles: unit.properties.profiles,
        properties: unit.properties,
        portfolio_client_email: unit.properties.portfolios?.client_email || null,
        matched_tenant: matchedTenant,
        primary_applicant: primaryApplicant,
      payment_link: propertyPaymentLinksMap[unit.id] || null,
    };
  });

  // Post-process: Group units by property_id for multi-unit buildings
  const propertyGroups: Record<string, any[]> = {};
  allPropertyDetails.forEach((detail: any) => {
    const pid = detail.properties?.id;
    if (!pid) return;
    if (!propertyGroups[pid]) propertyGroups[pid] = [];
    propertyGroups[pid].push(detail);
  });

  const result: any[] = [];
  Object.entries(propertyGroups).forEach(([propertyId, units]) => {
    if (units.length <= 1) {
      // Single unit property — pass through unchanged
      result.push(...units);
    } else {
      // Multi-unit building — create a grouped header row
      const first = units[0];
      const rents = units.map(u => u.monthly_rent).filter(Boolean);
      const minRent = rents.length > 0 ? Math.min(...rents) : null;
      const maxRent = rents.length > 0 ? Math.max(...rents) : null;
      const bedroomsSet = new Set(units.map(u => u.bedrooms).filter(Boolean));
      const bathroomsSet = new Set(units.map(u => u.bathrooms).filter(Boolean));

      result.push({
        ...first,
        // Mark as grouped building
        isGroupedBuilding: true,
        groupedUnits: units,
        groupedUnitCount: units.length,
        groupedPropertyId: propertyId,
        // Aggregated display values
        monthly_rent: minRent === maxRent ? minRent : minRent,
        rent_range: minRent !== maxRent ? `$${minRent?.toLocaleString()} - $${maxRent?.toLocaleString()}` : null,
        bedrooms: bedroomsSet.size === 1 ? first.bedrooms : null,
        bathrooms: bathroomsSet.size === 1 ? first.bathrooms : null,
        bedrooms_range: bedroomsSet.size > 1 ? `${Math.min(...bedroomsSet)}-${Math.max(...bedroomsSet)}` : null,
        bathrooms_range: bathroomsSet.size > 1 ? `${Math.min(...bathroomsSet)}-${Math.max(...bathroomsSet)}` : null,
        // Don't show unit_number for grouped row
        unit_number: null,
      });
    }
  });

  return result;
}
