import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, getWeekOfMonth } from 'date-fns';

interface PaymentOverviewFilters {
  dateFrom?: string;  // undefined = all time (no lower bound)
  dateTo?: string;    // undefined = today
  portfolioId?: string;
}

interface DailyCollection {
  date: string;
  amount: number;
  hapAmount: number;
  tenantAmount: number;
}

interface PaymentSource {
  name: string;
  value: number;
  color: string;
}

interface LateUnit {
  propertyId: string;
  propertyAddress: string;
  unitId: string | null;
  unitNumber: string | null;
  tenantName: string;
  tenantId: string;
  dueDate: string;
  amountOwed: number;
  daysLate: number;
  status: 'grace' | 'late' | 'overdue';
}

interface AllStar {
  propertyAddress: string;
  unitNumber: string | null;
  tenantName: string;
  streakMonths: number;
  badge: string;
}

export interface CollectionActivity {
  id: string;
  amount: number;
  date: string;
  source: 'stripe' | 'hap_tracked' | 'tenant_tracked' | 'manual';
  propertyAddress?: string;
  unitNumber?: string;
  tenantName?: string;
}

interface PaymentOverviewData {
  totalCollected: number;
  totalExpected: number;
  collectionRate: number;
  unitsPaid: number;
  totalUnits: number;
  viaOpenKey: number;
  hapPortion: number;
  tenantPortion: number;
  expectedHap: number;
  expectedStripeTenant: number;
  expectedExternalTenant: number;
  propertiesAccountedFor: number;
  totalProperties: number;
  amountAccountedFor: number;
  lateCount: number;
  lateAmount: number;
  gracePeriodCount: number;
  onTimeCount: number;
  pendingCount: number;
  rentHealthScore: number;
  dailyCollections: DailyCollection[];
  paymentSources: PaymentSource[];
  lateUnits: LateUnit[];
  allStars: AllStar[];
  recentPayments: CollectionActivity[];
  loading: boolean;
  error: string | null;
}

const calculateRentHealthScore = (data: {
  lateUnits: number;
  gracePeriodUnits: number;
  unpaidUnits: number;
  collectionRate: number;
  onTimeRate: number;
}): number => {
  let score = 100;
  
  score -= data.lateUnits * 10;
  score -= data.gracePeriodUnits * 5;
  score -= data.unpaidUnits * 15;
  
  if (data.collectionRate >= 95) score += 5;
  if (data.onTimeRate >= 90) score += 5;
  
  return Math.max(0, Math.min(100, score));
};

export const usePaymentOverview = (
  landlordId: string,
  filters: PaymentOverviewFilters
): PaymentOverviewData => {
  const dateFrom = filters.dateFrom || '2000-01-01'; // All time default
  const dateTo = filters.dateTo || format(new Date(), 'yyyy-MM-dd');

  // Fetch rent payments for the period
  const { data: rentPayments, isLoading: rentLoading, error: rentError } = useQuery({
    queryKey: ['payment-overview-rent', landlordId, filters.portfolioId, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('rent_payments')
        .select(`
          id,
          amount,
          payment_date,
          status,
          payment_method,
          property_id,
          unit_id,
          tenant_id,
          properties!inner(id, address, owner_id, portfolio_id),
          property_units(id, unit_number, unit_name),
          profiles(id, first_name, last_name, full_name)
        `)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .eq('properties.owner_id', landlordId);

      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', filters.portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!landlordId,
  });

  // Fetch HAP payments - SPLIT into two separate queries to avoid .or() syntax issues
  const { data: hapPayments, isLoading: hapLoading, error: hapError } = useQuery({
    queryKey: ['payment-overview-hap', landlordId, filters.portfolioId, dateFrom, dateTo],
    queryFn: async () => {
      // First get all property IDs owned by this landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);
      
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', filters.portfolioId);
      }
      
      const { data: properties, error: propError } = await propertiesQuery;
      if (propError) throw propError;
      
      const propertyIds = (properties || []).map(p => p.id);
      if (propertyIds.length === 0) return [];
      
      // Get all unit IDs for those properties
      const { data: units, error: unitError } = await supabase
        .from('property_units')
        .select('id')
        .in('property_id', propertyIds);
      
      if (unitError) throw unitError;
      const unitIds = (units || []).map(u => u.id);
      
      // Query 1: HAP payments by property_id
      const { data: hapByProperty, error: hapPropError } = await supabase
        .from('hap_payments')
        .select(`
          id,
          actual_amount,
          payment_date,
          payment_status,
          property_id,
          unit_id,
          properties(id, address, owner_id, portfolio_id),
          property_units(id, unit_number, unit_name, property_id)
        `)
        .in('property_id', propertyIds)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo);
      
      if (hapPropError) throw hapPropError;
      
      // Query 2: HAP payments by unit_id (for unit-level HAP with null property_id)
      // Use nested join through property_units to get property info when property_id is NULL
      let hapByUnit: any[] = [];
      if (unitIds.length > 0) {
        const { data: unitHap, error: hapUnitError } = await supabase
          .from('hap_payments')
          .select(`
            id,
            actual_amount,
            payment_date,
            payment_status,
            property_id,
            unit_id,
            property_units(id, unit_number, unit_name, property_id, properties(id, address, owner_id, portfolio_id))
          `)
          .in('unit_id', unitIds)
          .gte('payment_date', dateFrom)
          .lte('payment_date', dateTo);
        
        if (hapUnitError) throw hapUnitError;
        hapByUnit = unitHap || [];
      }
      
      // Merge and deduplicate by id
      const allHap = [...(hapByProperty || []), ...hapByUnit];
      const uniqueHap = Array.from(new Map(allHap.map(h => [h.id, h])).values());
      
      // Fetch Plaid transaction descriptions via landlord_payment_splits
      const hapUnitIds = uniqueHap.map(h => h.unit_id).filter(Boolean);
      let hapDescriptionMap = new Map<string, string>();
      
      if (hapUnitIds.length > 0) {
        const { data: hapSplitsWithTxns } = await supabase
          .from('landlord_payment_splits')
          .select(`
            unit_id,
            tag_type,
            landlord_plaid_transactions!inner(display_name, description, merchant_name)
          `)
          .in('unit_id', hapUnitIds)
          .eq('tag_type', 'hap_voucher');
        
        // Build lookup: unit_id -> transaction description (prioritize display_name)
        hapSplitsWithTxns?.forEach((split: any) => {
          const desc = split.landlord_plaid_transactions?.display_name ||
                       split.landlord_plaid_transactions?.description || 
                       split.landlord_plaid_transactions?.merchant_name;
          if (split.unit_id && desc) {
            hapDescriptionMap.set(split.unit_id, desc);
          }
        });
      }
      
      // Attach description to each HAP payment
      return uniqueHap.map(h => ({
        ...h,
        _plaidDescription: hapDescriptionMap.get(h.unit_id) || null
      }));
    },
    enabled: !!landlordId,
  });

  // Fetch total units for collection rate - use two-step pattern for reliable filtering
  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['payment-overview-units', landlordId, filters.portfolioId],
    queryFn: async () => {
      // Step 1: Get property IDs owned by this landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);
      
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', filters.portfolioId);
      }
      
      const { data: properties, error: propError } = await propertiesQuery;
      if (propError) throw propError;
      
      const propertyIds = (properties || []).map(p => p.id);
      if (propertyIds.length === 0) return [];
      
      // Step 2: Get occupied units for those properties
      const { data, error } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_number,
          unit_name,
          monthly_rent,
          status,
          property_id,
          properties(id, address, owner_id, portfolio_id)
        `)
        .in('property_id', propertyIds)
        .eq('status', 'occupied');

      if (error) throw error;
      return data || [];
    },
    enabled: !!landlordId,
  });

  // Fetch tenant balances for late payments - separate query without FK join
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['payment-overview-balances', landlordId, filters.portfolioId],
    queryFn: async () => {
      // First get properties owned by this landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id, address, owner_id, portfolio_id, rent_due_day')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);
      
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', filters.portfolioId);
      }
      
      const { data: properties, error: propError } = await propertiesQuery;
      if (propError) throw propError;
      
      const propertyIds = (properties || []).map(p => p.id);
      if (propertyIds.length === 0) return [];
      
      // Get balances for those properties
      const { data: balances, error: balError } = await supabase
        .from('tenant_balances')
        .select(`
          id,
          tenant_id,
          property_id,
          balance_amount,
          profiles!inner(id, first_name, last_name, full_name)
        `)
        .in('property_id', propertyIds)
        .gt('balance_amount', 0);
      
      if (balError) throw balError;
      
      // Map property data to balances
      const propertyMap = new Map((properties || []).map(p => [p.id, p]));
      return (balances || []).map(b => ({
        ...b,
        properties: propertyMap.get(b.property_id) || null
      }));
    },
    enabled: !!landlordId,
  });

  // Fetch rent_splits for expected HAP/Tenant portions
  const { data: rentSplitsData, isLoading: splitsLoading } = useQuery({
    queryKey: ['payment-overview-splits', landlordId, filters.portfolioId],
    queryFn: async () => {
      // Get property IDs owned by landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);
      
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', filters.portfolioId);
      }
      
      const { data: properties } = await propertiesQuery;
      const propertyIds = (properties || []).map(p => p.id);
      if (propertyIds.length === 0) return [];
      
      // Get unit IDs for those properties
      const { data: units } = await supabase
        .from('property_units')
        .select('id')
        .in('property_id', propertyIds);
      const unitIds = (units || []).map(u => u.id);
      
      // Get active rent_splits by property_id
      const { data: splitsByProperty } = await supabase
        .from('rent_splits')
        .select('id, pha_portion, tenant_portion, tenant_collection_method, property_id, unit_id')
        .in('property_id', propertyIds)
        .eq('is_active', true);
      
      // Get active rent_splits by unit_id
      let splitsByUnit: any[] = [];
      if (unitIds.length > 0) {
        const { data } = await supabase
          .from('rent_splits')
          .select('id, pha_portion, tenant_portion, tenant_collection_method, property_id, unit_id')
          .in('unit_id', unitIds)
          .eq('is_active', true);
        splitsByUnit = data || [];
      }
      
      // Merge and deduplicate by id
      const allSplits = [...(splitsByProperty || []), ...splitsByUnit];
      return Array.from(new Map(allSplits.map(s => [s.id, s])).values());
    },
    enabled: !!landlordId,
  });

  // Fetch tagged Plaid transactions to determine which units have tagged payments
  const { data: taggedTransactions, isLoading: taggedLoading } = useQuery({
    queryKey: ['payment-overview-tagged', landlordId, filters.portfolioId],
    queryFn: async () => {
      // Get property IDs owned by landlord
      let propertiesQuery = supabase
        .from('properties')
        .select('id')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);
      
      if (filters.portfolioId && filters.portfolioId !== 'everything') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', filters.portfolioId);
      }
      
      const { data: properties } = await propertiesQuery;
      const propertyIds = (properties || []).map(p => p.id);
      if (propertyIds.length === 0) return [];
      
      // Get unit IDs for those properties
      const { data: units } = await supabase
        .from('property_units')
        .select('id')
        .in('property_id', propertyIds);
      const unitIds = (units || []).map(u => u.id);
      
      // Get tagged transactions by property_id
      const { data: taggedByProperty } = await supabase
        .from('landlord_plaid_transactions')
        .select('id, property_id, unit_id, amount, tag_type')
        .in('property_id', propertyIds)
        .eq('is_tagged', true);
      
      // Get tagged transactions by unit_id
      let taggedByUnit: any[] = [];
      if (unitIds.length > 0) {
        const { data } = await supabase
          .from('landlord_plaid_transactions')
          .select('id, property_id, unit_id, amount, tag_type')
          .in('unit_id', unitIds)
          .eq('is_tagged', true);
        taggedByUnit = data || [];
      }
      
      // Merge and deduplicate
      const allTagged = [...(taggedByProperty || []), ...taggedByUnit];
      return Array.from(new Map(allTagged.map(t => [t.id, t])).values());
    },
    enabled: !!landlordId,
  });

  // Calculate aggregated data
  const loading = rentLoading || hapLoading || unitsLoading || balanceLoading || splitsLoading || taggedLoading;
  const error = rentError || hapError ? 'Failed to load payment data' : null;

  // Calculate totals
  const completedRent = (rentPayments || []).filter((p: any) => 
    p.status === 'completed' || p.status === 'paid'
  );
  const completedHap = (hapPayments || []).filter((p: any) => 
    p.payment_status === 'completed' || p.payment_status === 'paid' || p.payment_status === 'received'
  );

  const totalRentCollected = completedRent.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalHapCollected = completedHap.reduce((sum: number, p: any) => sum + (p.actual_amount || 0), 0);
  const totalCollected = totalRentCollected + totalHapCollected;

  // Deduplicate rent_splits by unit - prioritize unit-level splits over property-level
  const deduplicatedSplits = (() => {
    const unitSplitsMap = new Map<string, any>(); // unit_id -> rent_split
    
    // First pass: collect unit-level splits (these take priority)
    (rentSplitsData || []).forEach((split: any) => {
      if (split.unit_id) {
        // Only keep the first unit-level split for each unit
        if (!unitSplitsMap.has(split.unit_id)) {
          unitSplitsMap.set(split.unit_id, split);
        }
      }
    });
    
    // Second pass: apply property-level splits to units without unit-level splits
    (rentSplitsData || []).forEach((split: any) => {
      if (split.property_id && !split.unit_id) {
        // Find all units for this property that don't have unit-level splits
        const propertyUnits = (unitsData || []).filter(
          (u: any) => u.properties?.id === split.property_id
        );
        propertyUnits.forEach((unit: any) => {
          if (!unitSplitsMap.has(unit.id)) {
            unitSplitsMap.set(unit.id, { ...split, unit_id: unit.id });
          }
        });
      }
    });
    
    return Array.from(unitSplitsMap.values());
  })();

  // NEW: Total expected rent = sum of ALL occupied units' monthly_rent (the real denominator)
  const totalExpectedRent = (unitsData || [])
    .reduce((sum: number, u: any) => sum + (Number(u.monthly_rent) || 0), 0);
  
  // Total occupied units count
  const totalOccupiedUnits = (unitsData || []).length;

  // Calculate expected HAP from DEDUPLICATED rent_splits (for reference)
  const expectedHap = deduplicatedSplits.reduce(
    (sum, s: any) => sum + (Number(s.pha_portion) || 0), 0
  );
  
  // expectedStripeTenant and expectedExternalTenant calculated AFTER payment tracking sets (below)

  // Total expected = total monthly rent from all occupied units
  const totalExpected = totalExpectedRent;
  const totalUnits = totalOccupiedUnits;

  // Units "accounted for" = has ACTUAL payment records (rent_payments, hap_payments, or tagged Plaid)
  // NOT just configured for Stripe - must have actual tracked payments
  
  // Build sets of unit_ids that have actual payments
  const unitsWithRentPayments = new Set(
    completedRent.map((p: any) => p.unit_id).filter(Boolean)
  );
  const unitsWithHapPayments = new Set(
    completedHap.map((p: any) => p.unit_id).filter(Boolean)
  );
  
  // Also check property-level payments for units without unit-level tracking
  const propertiesWithRentPayments = new Set(
    completedRent.map((p: any) => p.property_id).filter(Boolean)
  );
  const propertiesWithHapPayments = new Set(
    completedHap.map((p: any) => p.property_id).filter(Boolean)
  );
  
  // Tagged Plaid transactions
  const taggedUnitIds = new Set(
    (taggedTransactions || []).map((t: any) => t.unit_id).filter(Boolean)
  );
  const taggedPropertyIds = new Set(
    (taggedTransactions || []).map((t: any) => t.property_id).filter(Boolean)
  );
  
  // Filter splits to only those with actual tracked payments (for Via OpenKey calculation)
  const trackedSplits = deduplicatedSplits.filter((split: any) => {
    const unitId = split.unit_id;
    const propertyId = split.property_id;
    
    // Check for unit-level payments
    if (unitId && (unitsWithRentPayments.has(unitId) || unitsWithHapPayments.has(unitId) || taggedUnitIds.has(unitId))) {
      return true;
    }
    
    // Check for property-level payments
    if (propertyId && (propertiesWithRentPayments.has(propertyId) || propertiesWithHapPayments.has(propertyId) || taggedPropertyIds.has(propertyId))) {
      return true;
    }
    
    return false;
  });
  
  // Expected Stripe tenant = only from units with actual tracked payments
  const expectedStripeTenant = trackedSplits
    .filter((s: any) => s.tenant_collection_method === 'stripe')
    .reduce((sum: number, s: any) => sum + (Number(s.tenant_portion) || 0), 0);
  
  // Expected external tenant = from tracked units with external collection method
  const expectedExternalTenant = trackedSplits
    .filter((s: any) => s.tenant_collection_method === 'external' || !s.tenant_collection_method)
    .reduce((sum: number, s: any) => sum + (Number(s.tenant_portion) || 0), 0);
  
  // "Fully Accounted For" logic:
  // A unit is fully accounted when:
  // - If unit has HAP portion configured → must have actual HAP payment tracked
  // - Tenant portion: Stripe-configured = auto-OK, external needs actual payment
  const fullyAccountedUnits = (unitsData || []).filter((unit: any) => {
    const unitId = unit.id;
    const propertyId = unit.properties?.id;
    
    // Find this unit's rent_split
    const unitSplit = deduplicatedSplits.find((s: any) => s.unit_id === unitId);
    
    if (!unitSplit) return false; // No rent configured = not accounted
    
    const hapPortion = Number(unitSplit.pha_portion) || 0;
    const tenantPortion = Number(unitSplit.tenant_portion) || 0;
    const isStripe = unitSplit.tenant_collection_method === 'stripe';
    
    // Check HAP: if configured, must have actual payment
    let hapAccountedFor = hapPortion === 0; // No HAP = automatically OK
    if (hapPortion > 0) {
      hapAccountedFor = unitsWithHapPayments.has(unitId) || 
                        propertiesWithHapPayments.has(propertyId) ||
                        taggedUnitIds.has(unitId);
    }
    
    // Check Tenant: Stripe = auto-OK, external needs actual payment
    let tenantAccountedFor = tenantPortion === 0; // No tenant portion = OK
    if (tenantPortion > 0) {
      if (isStripe) {
        tenantAccountedFor = true; // Stripe auto-collects
      } else {
        tenantAccountedFor = unitsWithRentPayments.has(unitId) ||
                            propertiesWithRentPayments.has(propertyId) ||
                            taggedUnitIds.has(unitId);
      }
    }
    
    return hapAccountedFor && tenantAccountedFor;
  });
  
  const propertiesAccountedFor = fullyAccountedUnits.length;
  
  // Amount accounted for = sum of monthly_rent for fully accounted units
  const amountAccountedForCalc = fullyAccountedUnits.reduce(
    (sum: number, u: any) => sum + (Number(u.monthly_rent) || 0), 0
  );

  // Calculate OpenKey (Stripe) payments
  const viaOpenKey = completedRent
    .filter((p: any) => p.payment_method === 'stripe' || p.payment_method === 'card' || p.payment_method === 'ach')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Collected external tenant (rent minus Stripe)
  const collectedExternalTenant = Math.max(0, totalRentCollected - viaOpenKey);

  // Calculate collection rate
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  // Calculate units paid (unique units with payments this period)
  const paidUnitIds = new Set([
    ...completedRent.map((p: any) => p.unit_id).filter(Boolean),
    ...completedHap.map((p: any) => p.unit_id).filter(Boolean),
  ]);
  const unitsPaid = paidUnitIds.size;

  // Calculate late/grace/pending
  const today = new Date();
  const currentDay = today.getDate();
  
  const lateUnits: LateUnit[] = (balanceData || []).map((d: any) => {
    const rentDueDay = d.properties?.rent_due_day || 1;
    const daysLate = currentDay > rentDueDay ? currentDay - rentDueDay : 0;
    const tenantName = d.profiles?.full_name || 
      `${d.profiles?.first_name || ''} ${d.profiles?.last_name || ''}`.trim() || 
      'Unknown';
    
    let status: 'grace' | 'late' | 'overdue' = 'grace';
    if (daysLate > 15) status = 'overdue';
    else if (daysLate > 5) status = 'late';

    return {
      propertyId: d.property_id,
      propertyAddress: d.properties?.address || 'Unknown',
      unitId: null,
      unitNumber: null,
      tenantName,
      tenantId: d.tenant_id,
      dueDate: `Day ${rentDueDay}`,
      amountOwed: d.balance_amount || 0,
      daysLate,
      status,
    };
  }).sort((a: LateUnit, b: LateUnit) => b.daysLate - a.daysLate);

  const lateCount = lateUnits.filter(u => u.status === 'late' || u.status === 'overdue').length;
  const gracePeriodCount = lateUnits.filter(u => u.status === 'grace').length;
  const lateAmount = lateUnits.reduce((sum, u) => sum + u.amountOwed, 0);

  const onTimeCount = unitsPaid;
  const pendingCount = Math.max(0, totalUnits - unitsPaid - lateCount - gracePeriodCount);

  // Calculate rent health score
  const onTimeRate = totalUnits > 0 ? (onTimeCount / totalUnits) * 100 : 100;
  const rentHealthScore = calculateRentHealthScore({
    lateUnits: lateCount,
    gracePeriodUnits: gracePeriodCount,
    unpaidUnits: Math.max(0, totalUnits - unitsPaid),
    collectionRate,
    onTimeRate,
  });

  // Build weekly collections data (Week 1-4 of the month)
  let dailyCollections: DailyCollection[] = [];
  
  // Initialize weeks 1-4
  const weeks: { [key: string]: { hapAmount: number; tenantAmount: number } } = {
    'Week 1': { hapAmount: 0, tenantAmount: 0 },
    'Week 2': { hapAmount: 0, tenantAmount: 0 },
    'Week 3': { hapAmount: 0, tenantAmount: 0 },
    'Week 4': { hapAmount: 0, tenantAmount: 0 },
  };

  // Group rent payments by week of month
  completedRent.forEach((p: any) => {
    if (p.payment_date) {
      const paymentDate = new Date(p.payment_date);
      const weekNum = Math.min(getWeekOfMonth(paymentDate), 4); // Cap at Week 4
      const key = `Week ${weekNum}`;
      weeks[key].tenantAmount += (p.amount || 0);
    }
  });

  // Group HAP payments by week of month
  completedHap.forEach((p: any) => {
    if (p.payment_date) {
      const paymentDate = new Date(p.payment_date);
      const weekNum = Math.min(getWeekOfMonth(paymentDate), 4);
      const key = `Week ${weekNum}`;
      weeks[key].hapAmount += (p.actual_amount || 0);
    }
  });

  // Convert to array for chart (always show all 4 weeks)
  dailyCollections = Object.entries(weeks).map(([date, data]) => ({
    date,
    amount: data.hapAmount + data.tenantAmount,
    hapAmount: data.hapAmount,
    tenantAmount: data.tenantAmount,
  }));

  // Build payment sources breakdown
  const paymentSources: PaymentSource[] = [
    { name: 'OpenKey (Stripe)', value: viaOpenKey, color: 'hsl(var(--primary))' },
    { name: 'HAP (Plaid)', value: totalHapCollected, color: 'hsl(var(--chart-2))' },
    { name: 'External/Manual', value: Math.max(0, totalRentCollected - viaOpenKey), color: 'hsl(var(--chart-3))' },
  ].filter(s => s.value > 0);

  // All-stars would need historical data query
  const allStars: AllStar[] = [];

  // Calculate external tenant collected from tagged Plaid payments
  const externalTenantCollected = (taggedTransactions || [])
    .filter((t: any) => t.tag_type === 'tenant')
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);

  // Build recent payments list for Collection Activity
  const recentPayments: CollectionActivity[] = [
    // Rent payments (Stripe or manual)
    ...completedRent.map((p: any) => {
      const tenantName = p.profiles?.full_name || 
        `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim() || 
        undefined;
      return {
        id: `rent-${p.id}`,
        amount: p.amount || 0,
        date: p.payment_date,
        source: (p.payment_method === 'stripe' || p.payment_method === 'card' || p.payment_method === 'ach') 
          ? 'stripe' as const 
          : 'tenant_tracked' as const,
        propertyAddress: p.properties?.address,
        unitNumber: p.property_units?.unit_number || p.property_units?.unit_name,
        tenantName,
      };
    }),
    // HAP payments (tracked)
    ...completedHap.map((p: any) => {
      const payerName = p._plaidDescription || 'HAP Payment';
      return {
        id: `hap-${p.id}`,
        amount: p.actual_amount || 0,
        date: p.payment_date,
        source: 'hap_tracked' as const,
        propertyAddress: p.properties?.address || p.property_units?.properties?.address,
        unitNumber: p.property_units?.unit_number || p.property_units?.unit_name,
        tenantName: payerName,
      };
    }),
  ]
    .filter(p => p.date) // Filter out entries without dates
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  return {
    totalCollected,
    totalExpected, // Now = totalExpectedRent from all occupied units
    collectionRate,
    unitsPaid,
    totalUnits, // Now = totalOccupiedUnits
    viaOpenKey,
    hapPortion: totalHapCollected,
    tenantPortion: externalTenantCollected, // Changed to tagged external tenant payments
    expectedHap,
    expectedStripeTenant,
    expectedExternalTenant,
    propertiesAccountedFor, // Fully accounted units count
    totalProperties: totalOccupiedUnits, // Total occupied units (denominator)
    amountAccountedFor: amountAccountedForCalc, // Sum of monthly_rent for fully accounted units
    lateCount,
    lateAmount,
    gracePeriodCount,
    onTimeCount,
    pendingCount,
    rentHealthScore,
    dailyCollections,
    paymentSources,
    lateUnits,
    allStars,
    recentPayments,
    loading,
    error,
  };
};
