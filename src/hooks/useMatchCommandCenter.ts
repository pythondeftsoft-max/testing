import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type MatchTier = 'hot_match' | 'decent_match' | 'no_match' | 'excluded';

// Tier labels for UI display
export type TierLabel = 'Strong' | 'Viable' | 'Conditional' | 'Poor';

export const getTierLabel = (score: number): { label: TierLabel; className: string } => {
  if (score >= 80) return { label: 'Strong', className: 'text-green-600' };
  if (score >= 60) return { label: 'Viable', className: 'text-blue-600' };
  if (score >= 40) return { label: 'Conditional', className: 'text-orange-600' };
  return { label: 'Poor', className: 'text-red-600' };
};

// Factor percentage color coding
export const getFactorColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-100 text-green-700';
  if (percentage >= 60) return 'bg-blue-100 text-blue-700';
  if (percentage >= 40) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

export const getFactorTextColor = (percentage: number): string => {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-blue-600';
  if (percentage >= 40) return 'text-orange-600';
  return 'text-red-600';
};

// Match breakdown now stores percentages (0-100) for each factor
export interface MatchBreakdown {
  location: number;  // 0-100 percentage
  budget: number;    // 0-100 percentage
  bedrooms: number;  // 0-100 percentage
  pets: number;      // 0-100 percentage
  move_in: number;   // 0-100 percentage (timing)
}

// Normalize old point-based breakdown to percentage format
// Old format: location max=30, budget max=30, bedrooms max=25, pets max=5, move_in max=10
export const normalizeBreakdown = (b: MatchBreakdown): MatchBreakdown => {
  // Detect old format: in old system, max values were much lower than 100
  // If location <= 30 AND budget <= 30, it's likely old format
  const isOldFormat = b.location <= 30 && b.budget <= 30 && b.bedrooms <= 25;
  
  if (!isOldFormat) return b;
  
  // Convert old points to percentages
  return {
    location: Math.round((b.location / 30) * 100),
    budget: Math.round((b.budget / 30) * 100),
    bedrooms: Math.round((b.bedrooms / 25) * 100),
    pets: Math.round((b.pets / 5) * 100),
    move_in: Math.round((b.move_in / 10) * 100),
  };
};

export type PushStatus = 'push_sent' | 'landlord_review' | 'primary_applicant' | null;

export interface CommandMatch {
  tenant_id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  tenant_budget: number | null;
  tenant_bedrooms: (number | string)[] | null;  // Can be ["2BR"] or [2]
  tenant_city: string | null;
  tenant_state: string | null;
  tenant_voucher: boolean;
  tenant_move_in: string | null;
  tenant_seeking_since: string | null;
  
  unit_id: string;
  property_id: string;
  property_address: string;
  property_unit_number: string | null;
  property_rent: number | null;
  property_bedrooms: number | null;
  property_city: string | null;
  property_state: string | null;
  property_photos: string[];
  property_listed_date: string | null;
  
  score: number;
  tier: MatchTier;
  drive_time_minutes: number | null;
  drive_time_source: 'google' | 'cache' | 'estimated';
  breakdown: MatchBreakdown;
  
  status: 'new' | 'review' | 'pushed' | 'approved' | 'rejected';
  push_id?: string;
  push_status: PushStatus;  // Active push status for this tenant-property pair
  push_date: string | null; // When the push was created
  tenant_has_other_push: boolean;  // True if tenant has active push to DIFFERENT property
  tenant_other_push_unit_id: string | null;  // Unit ID of the other push (for comparison)
  created_at: string;
}

export interface CommandCenterFilters {
  searchQuery: string;
  tenantId: string | null;
  propertyId: string | null;
  state: string | null;
  city: string | null;
  bedrooms: string | null;
  scoreThreshold: number;
  tierFilter: 'all' | 'hot' | 'decent_plus';
  needsReviewOnly: boolean;
  voucherOnly: boolean;
}

interface TenantProfile {
  user_id: string;
  voucher_holder: boolean | null;
  voucher_amount: number | null;
  rent_range_max: number | null;
  bedrooms_approved: (number | string)[] | null;
  city: string | null;
  state: string | null;
  move_in_window: string | null;
  created_at: string | null;
}

export const useMatchCommandCenter = () => {
  const queryClient = useQueryClient();
  
  // Filter state
  const [filters, setFilters] = useState<CommandCenterFilters>({
    searchQuery: '',
    tenantId: null,
    propertyId: null,
    state: null,
    city: null,
    bedrooms: null,
    scoreThreshold: 0,
    tierFilter: 'all',
    needsReviewOnly: false,
    voucherOnly: false,
  });
  
  // Drawer state
  const [selectedMatch, setSelectedMatch] = useState<CommandMatch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Fetch matches from computed_matches table (instant, no edge function)
  const { data: batchData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['match-command-center', 'cached', 'v2'],
    queryFn: async () => {
      // Step 1: Fetch computed_matches with valid FK joins only (no tenant_profiles FK exists)
      // Use !inner join on property_units to exclude occupied/off-market units
      const { data: cachedMatches, error: cacheError } = await supabase
        .from('computed_matches')
        .select(`
          id,
          tenant_id,
          unit_id,
          score,
          tier,
          breakdown,
          drive_time_minutes,
          drive_time_source,
          computed_at,
          tenant:profiles!tenant_id(
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          unit:property_units!unit_id!inner(
            id,
            unit_number,
            monthly_rent,
            bedrooms,
            property_id,
            listed_date,
            status,
            on_market,
            properties(
              id,
              address,
              city,
              state,
              photos,
              on_market
            )
          )
        `)
        .gte('score', 0)
        .neq('unit.status', 'occupied')
        // Removed strict AND filters for on_market - will filter client-side with OR logic
        .order('score', { ascending: false })
        .limit(4000);

      if (cacheError) {
        console.error('[useMatchCommandCenter] Cache read error:', cacheError);
        throw cacheError;
      }

      // Apply client-side OR filter: unit.on_market OR property.on_market
      // This aligns with Pipeline visibility logic
      const visibleMatches = (cachedMatches || []).filter((row: any) => {
        const unitOnMarket = row.unit?.on_market === true;
        const propertyOnMarket = row.unit?.properties?.on_market === true;
        return unitOnMarket || propertyOnMarket;
      });

      if (!visibleMatches.length) {
        console.log('[useMatchCommandCenter] Cache empty, awaiting manual seed');
        return {
          success: true,
          matches: [],
          computed_at: null,
          total_count: 0,
          needs_seed: true,
        };
      }

      // Step 2: Fetch denied pushes to filter out (tenant denied OR landlord rejected)
      const { data: deniedPushes } = await supabase
        .from('property_pushes')
        .select('tenant_id, unit_id')
        .eq('status', 'denied');

      // Create O(1) lookup for denied pairs
      const deniedPairs = new Set(
        (deniedPushes || []).map(p => `${p.tenant_id}-${p.unit_id}`)
      );

      // Filter out denied pairs before further processing
      const filteredVisible = visibleMatches.filter((row: any) => 
        !deniedPairs.has(`${row.tenant_id}-${row.unit_id}`)
      );

      // Step 3: Fetch active (non-denied) pushes for status display
      const { data: activePushes } = await supabase
        .from('property_pushes')
        .select('tenant_id, unit_id, status, pushed_at')
        .neq('status', 'denied')
        .gte('expires_at', new Date().toISOString());

      // Create lookup map for push status (tenant-unit pair)
      const pushStatusMap = new Map<string, { status: string; pushed_at: string }>(
        (activePushes || []).map(p => [
          `${p.tenant_id}-${p.unit_id}`,
          { status: p.status, pushed_at: p.pushed_at }
        ])
      );

      // Build propertyPushCounts: unitId -> count of active pushes for that property
      const propertyPushCounts = new Map<string, number>();
      (activePushes || []).forEach(p => {
        const count = propertyPushCounts.get(p.unit_id) || 0;
        propertyPushCounts.set(p.unit_id, count + 1);
      });

      // Build tenantActivePush: tenantId -> { unit_id, status } of their one active push
      // (Due to 1-to-1 constraint, only one active push per tenant)
      const tenantActivePush = new Map<string, { unit_id: string; status: string }>();
      (activePushes || []).forEach(p => {
        if (!tenantActivePush.has(p.tenant_id)) {
          tenantActivePush.set(p.tenant_id, { unit_id: p.unit_id, status: p.status });
        }
      });

      // Step 4: Get unique tenant IDs from filtered matches
      const tenantIds = [...new Set(filteredVisible.map((m: any) => m.tenant_id))];
      
      // Step 5: Fetch tenant_profiles separately (no FK constraint needed)
      const { data: tenantProfiles } = await supabase
        .from('tenant_profiles')
        .select('user_id, voucher_holder, voucher_amount, rent_range_max, bedrooms_approved, city, state, move_in_window, created_at')
        .in('user_id', tenantIds);
      
      // Step 6: Create lookup map for O(1) access
      const profileMap = new Map<string, TenantProfile>(
        (tenantProfiles || []).map(tp => [tp.user_id, tp])
      );

      // Step 7: Transform with merged data
      const matches: CommandMatch[] = filteredVisible.map((row: any) => {
        const tp = profileMap.get(row.tenant_id) || {} as Partial<TenantProfile>;
        const tenantName = `${row.tenant?.first_name || ''} ${row.tenant?.last_name || ''}`.trim();
        
        // Get push status for this tenant-property pair
        const pushKey = `${row.tenant_id}-${row.unit_id}`;
        const pushInfo = pushStatusMap.get(pushKey);
        
        // Check if tenant has an active push to a DIFFERENT property
        const tenantPush = tenantActivePush.get(row.tenant_id);
        const tenantHasOtherPush = tenantPush ? tenantPush.unit_id !== row.unit_id : false;
        
        return {
          tenant_id: row.tenant_id,
          tenant_name: tenantName || 'Unknown',
          tenant_email: row.tenant?.email || null,
          tenant_phone: row.tenant?.phone || null,
          tenant_budget: tp.rent_range_max || tp.voucher_amount || null,
          tenant_bedrooms: tp.bedrooms_approved || null,
          tenant_city: tp.city || null,
          tenant_state: tp.state || null,
          tenant_voucher: tp.voucher_holder || false,
          tenant_move_in: tp.move_in_window || null,
          tenant_seeking_since: tp.created_at || null,
          
          unit_id: row.unit_id,
          property_id: row.unit?.property_id || row.unit?.properties?.id || '',
          property_address: row.unit?.properties?.address || 'Unknown',
          property_unit_number: row.unit?.unit_number || null,
          property_rent: row.unit?.monthly_rent || null,
          property_bedrooms: row.unit?.bedrooms || null,
          property_city: row.unit?.properties?.city || null,
          property_state: row.unit?.properties?.state || null,
          property_photos: row.unit?.properties?.photos || [],
          property_listed_date: row.unit?.listed_date || row.unit?.created_at || null,
          
          score: row.score,
          tier: row.tier as MatchTier,
          drive_time_minutes: row.drive_time_minutes,
          drive_time_source: (row.drive_time_source || 'estimated') as 'google' | 'cache' | 'estimated',
          breakdown: row.breakdown as MatchBreakdown,
          
          status: 'new' as const,
          push_status: (pushInfo?.status as PushStatus) || null,
          push_date: pushInfo?.pushed_at || null,
          tenant_has_other_push: tenantHasOtherPush,
          tenant_other_push_unit_id: tenantHasOtherPush ? tenantPush!.unit_id : null,
          created_at: row.computed_at,
        };
      });
      
      // Attach propertyPushCounts to return for propertyGroups calculation
      return {
        success: true,
        matches,
        computed_at: cachedMatches[0]?.computed_at || new Date().toISOString(),
        total_count: matches.length,
        propertyPushCounts: Object.fromEntries(propertyPushCounts),
      };

    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
    meta: {
      errorMessage: 'Failed to load matches'
    }
  });

  // Seed mutation - manually triggers full match computation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agent-matchmaker-api', {
        body: { 
          path: 'seed', 
          method: 'POST',
          skip_drive_time_filter: true 
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Seed failed');
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Seeded ${data.seeded_count || data.total_computed || 0} matches successfully`);
      queryClient.invalidateQueries({ queryKey: ['match-command-center'] });
    },
    onError: (err: any) => {
      toast.error(`Seed failed: ${err.message}`);
    },
  });

  // Subscribe to realtime updates on computed_matches
  useEffect(() => {
    const channel = supabase
      .channel('computed-matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'computed_matches'
        },
        () => {
          // Invalidate cache when matches are updated
          queryClient.invalidateQueries({ queryKey: ['match-command-center'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Apply client-side filters
  const filteredMatches = useMemo(() => {
    if (!batchData?.matches) return [];
    
    let matches = [...batchData.matches];
    
    // Search query filter
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      matches = matches.filter(m =>
        m.property_address.toLowerCase().includes(q) ||
        m.tenant_name.toLowerCase().includes(q)
      );
    }
    
    // Entity filters
    if (filters.tenantId) {
      matches = matches.filter(m => m.tenant_id === filters.tenantId);
    }
    if (filters.propertyId) {
      matches = matches.filter(m => m.unit_id === filters.propertyId || m.property_id === filters.propertyId);
    }
    
    // Location filters
    if (filters.state) {
      matches = matches.filter(m => 
        m.property_state?.toLowerCase() === filters.state?.toLowerCase() ||
        m.tenant_state?.toLowerCase() === filters.state?.toLowerCase()
      );
    }
    if (filters.city) {
      matches = matches.filter(m => 
        m.property_city?.toLowerCase().includes(filters.city?.toLowerCase() || '') ||
        m.tenant_city?.toLowerCase().includes(filters.city?.toLowerCase() || '')
      );
    }
    
    // Bedroom filter
    if (filters.bedrooms) {
      const br = parseInt(filters.bedrooms);
      matches = matches.filter(m => m.property_bedrooms === br);
    }
    
    // Score threshold — but keep pushed matches
    if (filters.scoreThreshold > 0) {
      matches = matches.filter(m => m.score >= filters.scoreThreshold || m.push_status);
    }
    
    // Tier filter — but keep pushed matches
    if (filters.tierFilter === 'hot') {
      matches = matches.filter(m => m.tier === 'hot_match' || m.push_status);
    } else if (filters.tierFilter === 'decent_plus') {
      matches = matches.filter(m => m.tier === 'hot_match' || m.tier === 'decent_match' || m.push_status);
    }
    
    // Voucher filter
    if (filters.voucherOnly) {
      matches = matches.filter(m => m.tenant_voucher);
    }
    
    // Needs review filter
    if (filters.needsReviewOnly) {
      matches = matches.filter(m => m.status === 'review' || m.status === 'new');
    }
    
    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }, [batchData?.matches, filters]);
  
  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    if (!batchData?.matches) return { states: [], cities: [], bedrooms: [], tenants: [], properties: [] };
    
    const states = [...new Set(batchData.matches.map(m => m.property_state).filter(Boolean))] as string[];
    const cities = [...new Set(batchData.matches.map(m => m.property_city).filter(Boolean))] as string[];
    const bedrooms = [...new Set(batchData.matches.map(m => m.property_bedrooms).filter(Boolean))] as number[];
    
    // Unique tenants
    const tenantsMap = new Map<string, { id: string; name: string }>();
    batchData.matches.forEach(m => {
      if (!tenantsMap.has(m.tenant_id)) {
        tenantsMap.set(m.tenant_id, { id: m.tenant_id, name: m.tenant_name });
      }
    });
    
    // Unique properties
    const propertiesMap = new Map<string, { id: string; address: string }>();
    batchData.matches.forEach(m => {
      const key = m.unit_id;
      if (!propertiesMap.has(key)) {
        const addr = m.property_unit_number 
          ? `${m.property_address} #${m.property_unit_number}`
          : m.property_address;
        propertiesMap.set(key, { id: key, address: addr });
      }
    });
    
    return {
      states: states.sort(),
      cities: cities.sort(),
      bedrooms: bedrooms.sort((a, b) => a - b),
      tenants: Array.from(tenantsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      properties: Array.from(propertiesMap.values()).sort((a, b) => a.address.localeCompare(b.address)),
    };
  }, [batchData?.matches]);
  
  // Update filter helper
  const updateFilter = useCallback(<K extends keyof CommandCenterFilters>(
    key: K, 
    value: CommandCenterFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      tenantId: null,
      propertyId: null,
      state: null,
      city: null,
      bedrooms: null,
      scoreThreshold: 0,
      tierFilter: 'all',
      needsReviewOnly: false,
      voucherOnly: false,
    });
  }, []);
  
  // Drawer handlers
  const openDrawer = useCallback((match: CommandMatch) => {
    setSelectedMatch(match);
    setDrawerOpen(true);
  }, []);
  
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedMatch(null);
  }, []);
  
  // Approve match action
  const approveMutation = useMutation({
    mutationFn: async (match: CommandMatch) => {
      // Create application via API
      const { data, error } = await supabase.functions.invoke('agent-matchmaker-api', {
        body: {
          path: 'push',
          method: 'POST',
          tenant_id: match.tenant_id,
          property_id: match.property_id,
          unit_id: match.unit_id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Match approved successfully');
      queryClient.invalidateQueries({ queryKey: ['match-command-center'] });
    },
    onError: (err: any) => {
      toast.error(`Failed to approve: ${err.message}`);
    },
  });
  
  // Reject match action
  const rejectMutation = useMutation({
    mutationFn: async ({ match, reason }: { match: CommandMatch; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('agent-matchmaker-api', {
        body: {
          path: 'push',
          method: 'POST',
          tenant_id: match.tenant_id,
          unit_id: match.unit_id,
          status: 'rejected',
          reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Match rejected');
      queryClient.invalidateQueries({ queryKey: ['match-command-center'] });
    },
    onError: (err: any) => {
      toast.error(`Failed to reject: ${err.message}`);
    },
  });
  
  // Export to CSV
  const exportToCsv = useCallback(() => {
    if (!filteredMatches.length) {
      toast.error('No matches to export');
      return;
    }
    
    const headers = ['Score', 'Tier', 'Tenant', 'Budget', 'Property', 'Rent', 'Beds', 'Drive Time', 'Status'];
    const rows = filteredMatches.map(m => [
      m.score,
      m.tier,
      m.tenant_name,
      m.tenant_budget || 'N/A',
      m.property_address,
      m.property_rent || 'N/A',
      m.property_bedrooms || 'N/A',
      m.drive_time_minutes ? `${m.drive_time_minutes}m` : 'N/A',
      m.status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  }, [filteredMatches]);
  
  // Group matches by tenant for tenant-centric view
  const tenantGroups = useMemo(() => {
    if (!filteredMatches.length) return [];
    
    const grouped = new Map<string, CommandMatch[]>();
    for (const match of filteredMatches) {
      if (!grouped.has(match.tenant_id)) {
        grouped.set(match.tenant_id, []);
      }
      grouped.get(match.tenant_id)!.push(match);
    }
    
    return Array.from(grouped.entries()).map(([tenantId, matches]) => ({
      tenantId,
      tenantName: matches[0].tenant_name,
      tenantEmail: matches[0].tenant_email,
      tenantPhone: matches[0].tenant_phone,
      tenantBudget: matches[0].tenant_budget,
      tenantBedrooms: matches[0].tenant_bedrooms,
      tenantCity: matches[0].tenant_city,
      tenantState: matches[0].tenant_state,
      tenantVoucher: matches[0].tenant_voucher,
      bestScore: Math.max(...matches.map(m => m.score)),
      allMatches: matches.sort((a, b) => b.score - a.score),
      totalMatches: matches.length,
    })).sort((a, b) => b.bestScore - a.bestScore);
  }, [filteredMatches]);
  
  // Group matches by property address for property-centric view
  // Multi-unit buildings collapse into a single row with unit count badge
  const propertyGroups = useMemo(() => {
    if (!filteredMatches.length) return [];
    
    // Get property push counts from batchData
    const pushCounts = (batchData?.propertyPushCounts || {}) as Record<string, number>;
    
    // Group by property_id (not unit_id) to collapse multi-unit buildings
    const grouped = new Map<string, CommandMatch[]>();
    for (const match of filteredMatches) {
      const key = match.property_id;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(match);
    }
    
    return Array.from(grouped.entries()).map(([propId, matches]) => {
      const listedDate = matches[0].property_listed_date;
      const daysOnMarket = listedDate 
        ? Math.floor((Date.now() - new Date(listedDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      // Collect unique unit IDs for this property
      const unitIds = [...new Set(matches.map(m => m.unit_id))];
      const unitCount = unitIds.length;
      
      // Sum active pushes across all units
      const totalPushCount = unitIds.reduce((sum, uid) => sum + (pushCounts[uid] || 0), 0);
      
      // Deduplicate tenant matches: for each tenant, keep only the best-scoring unit match
      const bestPerTenant = new Map<string, CommandMatch>();
      for (const m of matches) {
        const existing = bestPerTenant.get(m.tenant_id);
        if (!existing || m.score > existing.score) {
          bestPerTenant.set(m.tenant_id, m);
        }
      }
      const deduped = Array.from(bestPerTenant.values()).sort((a, b) => {
        // Pin active pushes to top
        const aPushed = a.push_status ? 1 : 0;
        const bPushed = b.push_status ? 1 : 0;
        if (aPushed !== bPushed) return bPushed - aPushed;
        return b.score - a.score;
      });
      
      // For display, show rent range if multiple rent values
      const rents = [...new Set(matches.map(m => m.property_rent).filter(Boolean))] as number[];
      const displayRent = rents.length > 1 ? Math.min(...rents) : matches[0].property_rent;
      
      // Show bedroom range
      const beds = [...new Set(matches.map(m => m.property_bedrooms).filter(Boolean))] as number[];
      const displayBeds = beds.length > 1 ? `${Math.min(...beds)}-${Math.max(...beds)}` : matches[0].property_bedrooms;
      
      return {
        unitId: unitIds[0], // Primary unit ID for compatibility
        propertyId: propId,
        propertyAddress: matches[0].property_address,
        propertyUnitNumber: unitCount > 1 ? null : matches[0].property_unit_number, // Hide unit number for multi-unit
        propertyRent: displayRent,
        propertyBedrooms: typeof displayBeds === 'string' ? parseInt(displayBeds) : displayBeds,
        propertyBedroomsDisplay: displayBeds,
        propertyCity: matches[0].property_city,
        propertyState: matches[0].property_state,
        propertyPhotos: matches[0].property_photos,
        listedDate,
        daysOnMarket,
        bestScore: Math.max(...deduped.map(m => m.score)),
        allMatches: deduped,
        totalMatches: deduped.length,
        activePushCount: totalPushCount,
        unitCount, // NEW: number of units in this building
      };
    }).sort((a, b) => b.bestScore - a.bestScore);
  }, [filteredMatches, batchData?.propertyPushCounts]);
  
  return {
    // Data
    allMatches: batchData?.matches || [],
    filteredMatches,
    tenantGroups,
    propertyGroups,
    filterOptions,
    computedAt: batchData?.computed_at,
    totalCount: batchData?.total_count || 0,
    needsSeed: batchData?.needs_seed || false,
    
    // Loading state
    isLoading,
    isFetching,
    
    // Filters
    filters,
    updateFilter,
    clearFilters,
    
    // Drawer
    selectedMatch,
    drawerOpen,
    openDrawer,
    closeDrawer,
    
    // Actions
    refetch,
    seedMutation,
    approveMutation,
    rejectMutation,
    exportToCsv,
  };
};
