import { supabase } from '@/integrations/supabase/client';

export interface PropertyOwnerInfo {
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'admin' | 'landlord' | 'property_manager' | 'tenant';
  portfolioName?: string;
  isClientProperty: boolean;
  clientName?: string;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicateType: 'single_family' | 'unit' | null;
  existingProperties?: Array<{
    id: string;
    address: string;
    property_type: string;
  }>;
  existingUnits?: Array<{
    id: string;
    unit_number: string;
    property_id: string;
  }>;
}

export interface EnhancedDuplicateCheckResult extends DuplicateCheckResult {
  crossOwnerDuplicates?: Array<{
    id: string;
    address: string;
    property_type: string;
    owner: PropertyOwnerInfo;
    createdAt: string;
  }>;
}

// Helper functions to normalize text (client-side)
function normalizeAddressText(address: string): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeUnitText(unit: string): string {
  if (!unit) return '';
  return unit
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

// Check for single family duplicates by owner and address
export async function checkSingleFamilyDuplicates(
  ownerId: string,
  address: string,
  excludePropertyId?: string
): Promise<DuplicateCheckResult> {
  const normalizedAddress = normalizeAddressText(address);
  
  const { data, error } = await supabase
    .from('properties')
    .select('id, address, property_type')
    .eq('owner_id', ownerId)
    .eq('property_type', 'house') // Use the correct enum value
    .is('deleted_at', null);

  if (error) {
    console.error('Error checking single family duplicates:', error);
    return { hasDuplicates: false, duplicateType: null };
  }

  // Filter by normalized address on client side (until DB migration completes)
  const filteredData = data?.filter(p => {
    const matches = normalizeAddressText(p.address || '') === normalizedAddress;
    const notExcluded = !excludePropertyId || p.id !== excludePropertyId;
    return matches && notExcluded;
  }) || [];

  return {
    hasDuplicates: filteredData.length > 0,
    duplicateType: 'single_family',
    existingProperties: filteredData.map(p => ({
      id: p.id,
      address: p.address || '',
      property_type: p.property_type || ''
    }))
  };
}

// Check for unit duplicates within a property
export async function checkUnitDuplicates(
  propertyId: string,
  unitNumber: string,
  excludeUnitId?: string
): Promise<DuplicateCheckResult> {
  const normalizedUnit = normalizeUnitText(unitNumber);
  
  const { data, error } = await supabase
    .from('property_units')
    .select('id, unit_number, property_id')
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error checking unit duplicates:', error);
    return { hasDuplicates: false, duplicateType: null };
  }

  // Filter by normalized unit on client side (until DB migration completes)
  const filteredData = data?.filter(u => {
    const matches = normalizeUnitText(u.unit_number || '') === normalizedUnit;
    const notExcluded = !excludeUnitId || u.id !== excludeUnitId;
    return matches && notExcluded;
  }) || [];

  return {
    hasDuplicates: filteredData.length > 0,
    duplicateType: 'unit',
    existingUnits: filteredData.map(u => ({
      id: u.id,
      unit_number: u.unit_number || '',
      property_id: u.property_id
    }))
  };
}

// Check for cross-owner duplicates (used by admin to see if landlords have this property)
export async function checkCrossOwnerDuplicates(
  currentUserId: string,
  address: string,
  excludePropertyId?: string
): Promise<Array<{
  id: string;
  address: string;
  property_type: string;
  owner: PropertyOwnerInfo;
  createdAt: string;
}>> {
  const normalizedAddress = normalizeAddressText(address);
  
  // Get all properties with matching address (excluding current user and admins)
  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      property_type,
      created_at,
      owner_id,
      portfolio_id
    `)
    .is('deleted_at', null)
    .neq('owner_id', currentUserId);

  if (error) {
    console.error('Error checking cross-owner duplicates:', error);
    return [];
  }

  // Filter by normalized address on client side
  const matchingProperties = properties?.filter(p => {
    const matches = normalizeAddressText(p.address || '') === normalizedAddress;
    const notExcluded = !excludePropertyId || p.id !== excludePropertyId;
    return matches && notExcluded;
  }) || [];

  if (matchingProperties.length === 0) {
    return [];
  }

  // Get owner and portfolio info for all matching properties
  const ownerIds = [...new Set(matchingProperties.map(p => p.owner_id))];
  const portfolioIds = [...new Set(matchingProperties.map(p => p.portfolio_id).filter(Boolean))];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, user_type')
    .in('id', ownerIds);

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id, client_name')
    .in('id', portfolioIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const portfolioMap = new Map(portfolios?.map(p => [p.id, p]) || []);

  // Exclude admin-owned client properties from results (landlords shouldn't see these)
  return matchingProperties
    .filter(p => {
      const profile = profileMap.get(p.owner_id);
      return profile?.user_type !== 'admin';
    })
    .map(p => {
      const profile = profileMap.get(p.owner_id);
      const portfolio = portfolioMap.get(p.portfolio_id);

      const userName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : 'Unknown';

      return {
        id: p.id,
        address: p.address || '',
        property_type: p.property_type || '',
        owner: {
          userId: p.owner_id,
          userName,
          userEmail: profile?.email || '',
          userType: (profile?.user_type || 'landlord') as 'admin' | 'landlord' | 'property_manager' | 'tenant',
          portfolioName: portfolio?.client_name || undefined,
          isClientProperty: false,
          clientName: undefined,
        },
        createdAt: p.created_at,
      };
    });
}

// Enhanced single family duplicate check that includes cross-owner duplicates
export async function checkSingleFamilyDuplicatesEnhanced(
  ownerId: string,
  address: string,
  excludePropertyId?: string
): Promise<EnhancedDuplicateCheckResult> {
  // Check same-owner duplicates
  const sameOwnerResult = await checkSingleFamilyDuplicates(ownerId, address, excludePropertyId);
  
  // Check cross-owner duplicates (non-admin properties)
  const crossOwnerDuplicates = await checkCrossOwnerDuplicates(ownerId, address, excludePropertyId);
  
  return {
    ...sameOwnerResult,
    crossOwnerDuplicates,
  };
}

// Get existing duplicates for cleanup (simplified until views are available)
export async function getExistingDuplicates() {
  // For now, return empty arrays since the views aren't available yet
  return {
    singleFamily: [],
    units: []
  };
}