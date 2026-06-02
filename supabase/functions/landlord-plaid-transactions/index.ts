// Landlord Plaid Transactions Edge Function
// Handles bank account linking and transaction tagging for property management
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create payment records when tagging transactions
async function createPaymentRecordFromTag(
  supabase: any,
  params: {
    propertyId: string;
    unitId?: string | null;
    tagType: string;
    amount: number;
    transactionDate: string;
    transactionDescription?: string;
    plaidTransactionId?: string;
    splitId?: string | null;
    userId: string;
  }
) {
  const { propertyId, unitId, tagType, amount, transactionDate, transactionDescription, plaidTransactionId, splitId, userId } = params;
  
  // Calculate payment period from transaction date
  const periodDate = new Date(transactionDate);
  const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
  const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  // Get unit's tenant_id and tenant name if unit is specified
  let tenantId = null;
  let tenantName = null;
  if (unitId) {
    const { data: unitData } = await supabase
      .from('property_units')
      .select('tenant_id, profiles:tenant_id(first_name, last_name)')
      .eq('id', unitId)
      .single();
    tenantId = unitData?.tenant_id || null;
    if (unitData?.profiles) {
      tenantName = `${unitData.profiles.first_name || ''} ${unitData.profiles.last_name || ''}`.trim() || null;
    }
  }

  const noteText = `Tagged from bank deposit: ${transactionDescription || 'N/A'}`;

  if (tagType === 'hap_voucher') {
    // Create HAP payment record with tenant_name for historical preservation
    // NOTE: Constraint requires EITHER property_id OR unit_id, not both
    const { error: hapError } = await supabase.from('hap_payments').insert({
      property_id: unitId ? null : propertyId,  // Only set if no unit_id
      unit_id: unitId || null,
      tenant_id: tenantId,
      tenant_name: tenantName,  // Store tenant name for historical records
      payment_period_start: periodStartStr,
      payment_period_end: periodEndStr,
      expected_amount: amount,
      actual_amount: amount,
      payment_date: transactionDate,
      payment_method: 'ach',  // Valid: ach, check, wire
      payment_status: 'received',
      verification_method: 'plaid',
      plaid_transaction_id: plaidTransactionId,
      plaid_split_id: splitId,
      matched_via_plaid: true,
      notes: noteText,
      recorded_by: userId,
    });

    if (hapError) {
      console.error('[landlord-plaid-transactions] Failed to create HAP payment record:', hapError);
    } else {
      console.log(`[landlord-plaid-transactions] Created HAP payment record for ${amount}`);
    }
  } else if (tagType === 'tenant_rent') {
    // Create rent payment record with tenant_name for historical preservation
    const { error: rentError } = await supabase.from('rent_payments').insert({
      property_id: propertyId,
      unit_id: unitId || null,
      tenant_id: tenantId,
      tenant_name: tenantName,  // Store tenant name for historical records
      payment_date: transactionDate,
      amount: amount,
      payment_source: 'manual',
      payment_method: 'plaid',
      payment_type: 'rent',
      status: 'completed',
      plaid_transaction_id: plaidTransactionId,
      plaid_split_id: splitId,
      matched_via_plaid: true,
      notes: noteText,
      recorded_by: userId,
    });

    if (rentError) {
      console.error('[landlord-plaid-transactions] Failed to create rent payment record:', rentError);
    } else {
      console.log(`[landlord-plaid-transactions] Created rent payment record for ${amount}`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body FIRST to get landlordId fallback before auth check
    const body = await req.json();
    const { action, landlordId: bodyLandlordId, ...params } = body;
    
    console.log(`[landlord-plaid-transactions] Action: ${action}, bodyLandlordId: ${bodyLandlordId}`);

    // Try to get user from auth header
    const authHeader = req.headers.get('Authorization');
    let user: { id: string } | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.log(`[landlord-plaid-transactions] Auth error: ${authError.message}`);
      }
      user = authData?.user || null;
    } else {
      console.log(`[landlord-plaid-transactions] No auth header present`);
    }

    // Use auth user ID or fallback to body landlordId
    const effectiveLandlordId = user?.id || bodyLandlordId;
    
    if (!effectiveLandlordId) {
      console.log(`[landlord-plaid-transactions] No landlord ID available from auth or body`);
      return new Response(JSON.stringify({ error: 'No landlord ID' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reassign user to ensure it's set for existing code
    user = { id: effectiveLandlordId };
    console.log(`[landlord-plaid-transactions] Effective user ID: ${effectiveLandlordId}`);

    switch (action) {
      case 'get_untagged_properties': {
        // Get occupied units that need payment tagging for the current period
        const { year, month } = params;
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const periodEnd = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
        
        console.log(`[landlord-plaid-transactions] Getting untagged properties for ${periodStart} to ${periodEnd}`);

        // Get all occupied units with their rent requirements
        const { data: occupiedUnits, error: unitsError } = await supabase
          .from('property_units')
          .select(`
            id,
            unit_number,
            unit_name,
            monthly_rent,
            pha_portion,
            tenant_portion,
            tenant_id,
            property_id,
            properties!inner (
              id,
              address,
              owner_id,
              deleted_at,
              portfolio_id,
              portfolios (
                id,
                client_name
              )
            ),
            profiles:tenant_id (
              id,
              first_name,
              last_name
            )
          `)
          .eq('status', 'occupied')
          .eq('properties.owner_id', user.id)
          .is('properties.deleted_at', null);

        if (unitsError) throw unitsError;

        // Get active rent splits for occupied units from rent_splits table
        const unitIds = (occupiedUnits || []).map((u: any) => u.id);
        const propertyIds = [...new Set((occupiedUnits || []).map((u: any) => u.property_id))];
        let rentSplitsByUnit: Record<string, { total_rent: number; pha_portion: number; tenant_portion: number; tenant_collection_method: string }> = {};
        
        if (unitIds.length > 0) {
          // First try to find rent_splits by unit_id
          const { data: unitSplitsData, error: unitSplitsError } = await supabase
            .from('rent_splits')
            .select('unit_id, property_id, total_rent, pha_portion, tenant_portion, tenant_collection_method, effective_date')
            .in('unit_id', unitIds)
            .eq('is_active', true)
            .order('effective_date', { ascending: false });

          if (unitSplitsError) {
            console.log('[landlord-plaid-transactions] Error fetching unit rent_splits:', unitSplitsError);
          } else {
            // Build map from unit_id matches
            for (const split of unitSplitsData || []) {
              if (split.unit_id && !rentSplitsByUnit[split.unit_id]) {
                rentSplitsByUnit[split.unit_id] = {
                  total_rent: Number(split.total_rent) || 0,
                  pha_portion: Number(split.pha_portion) || 0,
                  tenant_portion: Number(split.tenant_portion) || 0,
                  tenant_collection_method: split.tenant_collection_method || 'external',
                };
              }
            }
            console.log(`[landlord-plaid-transactions] Found ${Object.keys(rentSplitsByUnit).length} unit-level rent splits`);
          }

          // Also query by property_id for records where unit_id is NULL (legacy data)
          if (propertyIds.length > 0) {
            const { data: propertySplitsData, error: propertySplitsError } = await supabase
              .from('rent_splits')
              .select('property_id, total_rent, pha_portion, tenant_portion, tenant_collection_method, effective_date')
              .in('property_id', propertyIds)
              .is('unit_id', null)
              .eq('is_active', true)
              .order('effective_date', { ascending: false });

            if (propertySplitsError) {
              console.log('[landlord-plaid-transactions] Error fetching property rent_splits:', propertySplitsError);
            } else {
              // Build a map of property_id -> rent split for fallback
              const rentSplitsByProperty: Record<string, { total_rent: number; pha_portion: number; tenant_portion: number; tenant_collection_method: string }> = {};
              for (const split of propertySplitsData || []) {
                if (!rentSplitsByProperty[split.property_id]) {
                  rentSplitsByProperty[split.property_id] = {
                    total_rent: Number(split.total_rent) || 0,
                    pha_portion: Number(split.pha_portion) || 0,
                    tenant_portion: Number(split.tenant_portion) || 0,
                    tenant_collection_method: split.tenant_collection_method || 'external',
                  };
                }
              }
              console.log(`[landlord-plaid-transactions] Found ${Object.keys(rentSplitsByProperty).length} property-level rent splits`);

              // For units without unit-level splits, fall back to property-level splits
              for (const unit of occupiedUnits || []) {
                if (!rentSplitsByUnit[unit.id] && rentSplitsByProperty[unit.property_id]) {
                  rentSplitsByUnit[unit.id] = rentSplitsByProperty[unit.property_id];
                }
              }
            }
          }
          
          console.log(`[landlord-plaid-transactions] Total rent splits mapped: ${Object.keys(rentSplitsByUnit).length} units`);
        }

        // Get tagged amounts for each unit this period WITH tag_type and transaction details
        // Filter by unit_ids to ensure we only get splits for this landlord's units
        const { data: taggedSplits, error: splitsError } = await supabase
          .from('landlord_payment_splits')
          .select(`
            id,
            unit_id, 
            amount,
            tag_type,
            transaction_id,
            created_at,
            transaction:landlord_plaid_transactions(id, description, transaction_date, amount)
          `)
          .in('unit_id', unitIds)
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd + 'T23:59:59');

        if (splitsError) throw splitsError;
        
        console.log(`[landlord-plaid-transactions] Found ${(taggedSplits || []).length} payment splits for period`);
        if (taggedSplits?.length) {
          console.log(`[landlord-plaid-transactions] Split details:`, taggedSplits.map(s => ({
            unit_id: s.unit_id,
            amount: s.amount,
            tag_type: s.tag_type,
            desc: (s.transaction as any)?.description
          })));
        }

        // Get direct-tagged transactions for each unit this period WITH tag_type
        const { data: directTags, error: directError } = await supabase
          .from('landlord_plaid_transactions')
          .select('id, unit_id, amount, tag_type, description, transaction_date')
          .eq('landlord_id', user.id)
          .eq('is_tagged', true)
          .not('unit_id', 'is', null)
          .not('tag_type', 'eq', 'split')
          .gte('transaction_date', periodStart)
          .lte('transaction_date', periodEnd);

        if (directError) throw directError;

        // Calculate tagged amounts per unit BY TAG TYPE
        interface TagDetails {
          total: number;
          hap: number;
          tenant: number;
          tags: Array<{
            id: string;
            amount: number;
            tag_type: string;
            deposit_description: string | null;
            deposit_date: string;
          }>;
        }
        const taggedByUnit: Record<string, TagDetails> = {};
        
        // Initialize all units
        for (const unit of occupiedUnits || []) {
          taggedByUnit[unit.id] = { total: 0, hap: 0, tenant: 0, tags: [] };
        }
        
        // Process splits (partial tags from deposits)
        for (const split of taggedSplits || []) {
          if (split.unit_id && taggedByUnit[split.unit_id]) {
            const amt = Number(split.amount);
            taggedByUnit[split.unit_id].total += amt;
            
            if (split.tag_type === 'hap_voucher') {
              taggedByUnit[split.unit_id].hap += amt;
            } else {
              taggedByUnit[split.unit_id].tenant += amt;
            }
            
            taggedByUnit[split.unit_id].tags.push({
              id: split.id,
              amount: amt,
              tag_type: split.tag_type || 'tenant_rent',
              deposit_description: (split.transaction as any)?.description || null,
              deposit_date: (split.transaction as any)?.transaction_date || split.created_at,
            });
          }
        }
        
        // Process direct tags (full deposit tagged to unit)
        for (const tag of directTags || []) {
          if (tag.unit_id && taggedByUnit[tag.unit_id]) {
            const amt = Number(tag.amount);
            taggedByUnit[tag.unit_id].total += amt;
            
            if (tag.tag_type === 'hap_voucher') {
              taggedByUnit[tag.unit_id].hap += amt;
            } else {
              taggedByUnit[tag.unit_id].tenant += amt;
            }
            
            taggedByUnit[tag.unit_id].tags.push({
              id: tag.id,
              amount: amt,
              tag_type: tag.tag_type || 'tenant_rent',
              deposit_description: tag.description,
              deposit_date: tag.transaction_date,
            });
          }
        }

        // Build results
        const untaggedProperties = (occupiedUnits || []).map((unit: any) => {
          const unitTags = taggedByUnit[unit.id] || { total: 0, hap: 0, tenant: 0, tags: [] };
          
          // Get rent split data from rent_splits table (not property_units)
          const rentSplit = rentSplitsByUnit[unit.id];
          // Use rent_splits.total_rent when available, fall back to unit.monthly_rent
          const requiredRent = rentSplit?.total_rent || Number(unit.monthly_rent) || 0;
          const amountTagged = unitTags.total;
          const remaining = Math.max(0, requiredRent - amountTagged);
          
          const hapExpected = rentSplit?.pha_portion || 0;
          const tenantCollectionMethod = rentSplit?.tenant_collection_method || 'external';
          
          // Tenant expected for Plaid tagging: if collected via Stripe, show 0 for tagging purposes
          const tenantExpectedRaw = rentSplit?.tenant_portion || (requiredRent - hapExpected);
          const tenantExpectedForTagging = tenantCollectionMethod === 'stripe' ? 0 : tenantExpectedRaw;
          
          // Calculate remaining per type
          const hapTagged = unitTags.hap;
          const tenantTagged = unitTags.tenant;
          const hapRemaining = Math.max(0, hapExpected - hapTagged);
          const tenantRemaining = Math.max(0, tenantExpectedForTagging - tenantTagged);
          
          // Total remaining only includes what needs Plaid tagging
          const totalRemainingForTagging = hapRemaining + tenantRemaining;
          
          return {
            unit_id: unit.id,
            unit_number: unit.unit_number,
            unit_name: unit.unit_name,
            property_id: unit.property_id,
            property_address: unit.properties?.address,
            portfolio_id: unit.properties?.portfolio_id || null,
            portfolio_name: unit.properties?.portfolios?.client_name || 'Unassigned',
            tenant_id: unit.tenant_id,
            tenant_name: unit.profiles 
              ? `${unit.profiles.first_name || ''} ${unit.profiles.last_name || ''}`.trim() || 'Unnamed'
              : null,
            required_rent: requiredRent,
            hap_expected: hapExpected,
            tenant_expected: tenantExpectedForTagging, // For Plaid tagging purposes
            tenant_expected_raw: tenantExpectedRaw, // Actual tenant portion amount
            tenant_collection_method: tenantCollectionMethod,
            hap_tagged: hapTagged,
            tenant_tagged: tenantTagged,
            hap_remaining: hapRemaining,
            tenant_remaining: tenantRemaining,
            amount_tagged: amountTagged,
            remaining: totalRemainingForTagging, // Only what needs Plaid tagging
            is_complete: totalRemainingForTagging === 0,
            existing_tags: unitTags.tags,
            // Show deposits that have been tagged to this specific unit
            tagged_deposits: unitTags.tags.length > 0 
              ? unitTags.tags.map((tag: any) => ({
                  description: tag.deposit_description,
                  amount: tag.amount,
                  tag_type: tag.tag_type,
                  date: tag.deposit_date,
                }))
              : null,
          };
        });

        // Sort: incomplete first, then by remaining descending
        untaggedProperties.sort((a: any, b: any) => {
          if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1;
          return b.remaining - a.remaining;
        });

        return new Response(JSON.stringify({ 
          properties: untaggedProperties,
          period: { year, month },
          totalUnits: untaggedProperties.length,
          untaggedCount: untaggedProperties.filter((p: any) => !p.is_complete).length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_tagged_transactions': {
        // Get transactions that have been tagged - now grouped by payment source (description)
        // Each source becomes ONE persistent row, showing only the most recent transaction
        const { minAmount, limit = 50, offset = 0 } = params;
        
        let query = supabase
          .from('landlord_plaid_transactions')
          .select(`
            *,
            bank_account:user_bank_accounts(id, institution_name, account_name, mask)
          `)
          .eq('landlord_id', user.id)
          .eq('is_tagged', true)
          .order('transaction_date', { ascending: false });

        if (minAmount) {
          query = query.gte('amount', minAmount);
        }

        const { data: transactions, error: transError } = await query;
        if (transError) throw transError;

        // Group transactions by source (description) - keep only the most recent per source
        const groupedBySource: Record<string, any> = {};
        for (const trans of transactions || []) {
          const sourceKey = trans.description || trans.merchant_name || 'Unknown';
          if (!groupedBySource[sourceKey] || 
              new Date(trans.transaction_date) > new Date(groupedBySource[sourceKey].transaction_date)) {
            groupedBySource[sourceKey] = trans;
          }
        }
        
        const uniqueSourceTransactions = Object.values(groupedBySource);

        // Apply pagination after grouping
        const paginatedTransactions = uniqueSourceTransactions.slice(offset, offset + limit);

        // Get all splits for these transactions
        const transactionIds = paginatedTransactions.map((t: any) => t.id);
        
        let splits: any[] = [];
        if (transactionIds.length > 0) {
          const { data: splitsData, error: splitsError } = await supabase
            .from('landlord_payment_splits')
            .select(`
              *,
              property:properties(id, address, portfolio_id, portfolios(id, client_name)),
              unit:property_units(id, unit_number, unit_name, monthly_rent)
            `)
            .in('transaction_id', transactionIds);
          
          if (splitsError) throw splitsError;
          splits = splitsData || [];
        }

        // Get rent_splits for these units to show HAP/tenant breakdown
        const splitUnitIds = splits.map((s: any) => s.unit?.id).filter(Boolean);
        const splitPropertyIds = splits.map((s: any) => s.property?.id).filter(Boolean);
        let rentSplitsByUnitTagged: Record<string, { total_rent: number; pha_portion: number; tenant_portion: number; tenant_collection_method: string }> = {};
        
        // First try to find rent_splits by unit_id
        if (splitUnitIds.length > 0) {
          const { data: rentSplitsData } = await supabase
            .from('rent_splits')
            .select('unit_id, total_rent, pha_portion, tenant_portion, tenant_collection_method')
            .in('unit_id', splitUnitIds)
            .eq('is_active', true);
          
          for (const rs of rentSplitsData || []) {
            if (rs.unit_id) {
              rentSplitsByUnitTagged[rs.unit_id] = {
                total_rent: Number(rs.total_rent) || 0,
                pha_portion: Number(rs.pha_portion) || 0,
                tenant_portion: Number(rs.tenant_portion) || 0,
                tenant_collection_method: rs.tenant_collection_method || 'external',
              };
            }
          }
        }

        // Also query by property_id for records where unit_id is NULL (legacy data)
        if (splitPropertyIds.length > 0) {
          const { data: propertySplitsData } = await supabase
            .from('rent_splits')
            .select('property_id, total_rent, pha_portion, tenant_portion, tenant_collection_method')
            .in('property_id', splitPropertyIds)
            .is('unit_id', null)
            .eq('is_active', true);
          
          // Build map of property_id -> rent split for fallback
          const rentSplitsByProperty: Record<string, { total_rent: number; pha_portion: number; tenant_portion: number; tenant_collection_method: string }> = {};
          for (const rs of propertySplitsData || []) {
            if (rs.property_id) {
              rentSplitsByProperty[rs.property_id] = {
                total_rent: Number(rs.total_rent) || 0,
                pha_portion: Number(rs.pha_portion) || 0,
                tenant_portion: Number(rs.tenant_portion) || 0,
                tenant_collection_method: rs.tenant_collection_method || 'external',
              };
            }
          }
          
          // For units without unit-level splits, fall back to property-level splits
          for (const split of splits) {
            if (split.unit?.id && !rentSplitsByUnitTagged[split.unit.id] && split.property?.id) {
              const propertySplit = rentSplitsByProperty[split.property.id];
              if (propertySplit) {
                rentSplitsByUnitTagged[split.unit.id] = propertySplit;
              }
            }
          }
        }

        // Get tenant names from housed applications
        let tenantsByUnit: Record<string, string> = {};
        console.log(`[DEBUG] splitUnitIds for tenant lookup: ${JSON.stringify(splitUnitIds)}`);
        if (splitUnitIds.length > 0) {
          const { data: housedTenants, error: tenantError } = await supabase
            .from('marketplace_applications')
            .select('unit_id, contact_name')
            .in('unit_id', splitUnitIds)
            .eq('status', 'housed');
          
          console.log(`[DEBUG] housedTenants query result: ${JSON.stringify(housedTenants)}, error: ${JSON.stringify(tenantError)}`);
          
          for (const ht of housedTenants || []) {
            if (ht.unit_id && ht.contact_name) {
              tenantsByUnit[ht.unit_id] = ht.contact_name;
            }
          }
          console.log(`[DEBUG] tenantsByUnit map: ${JSON.stringify(tenantsByUnit)}`);
        }

        // Build response with calculated totals
        const taggedTransactions = paginatedTransactions.map((trans: any) => {
          const transactionSplits = splits
            .filter((s: any) => s.transaction_id === trans.id)
            .map((split: any) => {
              const rentInfo = split.unit ? rentSplitsByUnitTagged[split.unit.id] : null;
              const tenantName = split.unit ? tenantsByUnit[split.unit.id] : null;
              return {
                ...split,
                portfolio_name: split.property?.portfolios?.client_name || 'Unassigned',
                tenant_name: tenantName,
                rent_info: rentInfo ? {
                  total: rentInfo.total_rent || split.unit?.monthly_rent || 0,
                  hap: rentInfo.pha_portion,
                  tenant: rentInfo.tenant_portion,
                  tenant_collection_method: rentInfo.tenant_collection_method,
                } : split.unit ? {
                  total: Number(split.unit.monthly_rent) || 0,
                  hap: 0,
                  tenant: Number(split.unit.monthly_rent) || 0,
                  tenant_collection_method: 'external',
                } : null,
              };
            });
          
          const totalTagged = transactionSplits.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
          
          // Handle different tag types:
          // - 'tracked': Just documented, no units assigned yet - show $0 tagged, 0 units
          // - 'split': Has payment splits with unit allocations - use split totals
          // - Other legacy types: Treat as fully tagged to one unit
          let effectiveTagged: number;
          let unitsCount: number;
          
          if (trans.tag_type === 'tracked') {
            effectiveTagged = totalTagged;
            unitsCount = transactionSplits.length;
          } else if (trans.tag_type === 'split') {
            effectiveTagged = totalTagged;
            unitsCount = transactionSplits.length;
          } else {
            effectiveTagged = Number(trans.amount);
            unitsCount = 1;
          }
          
          const remaining = Number(trans.amount) - effectiveTagged;
          
          return {
            ...trans,
            last_tracked_date: trans.transaction_date, // Most recent payment date from this source
            total_tagged: effectiveTagged,
            remaining_balance: remaining,
            units_tagged_count: unitsCount,
            splits: transactionSplits,
            status: remaining === 0 && effectiveTagged > 0 ? 'balanced' : 
                    remaining < 0 ? 'over' : 'remaining',
          };
        });

        return new Response(JSON.stringify({ 
          transactions: taggedTransactions, 
          total: uniqueSourceTransactions.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_available_deposits': {
        // Get untagged or partially tagged deposits for tagging to a property
        const { data: deposits, error } = await supabase
          .from('landlord_plaid_transactions')
          .select(`
            id,
            transaction_date,
            amount,
            description,
            display_name,
            merchant_name,
            is_tagged,
            tag_type,
            bank_account:user_bank_accounts(id, institution_name, account_name)
          `)
          .eq('landlord_id', user.id)
          .or('is_tagged.eq.false,tag_type.eq.split,tag_type.eq.tracked')
          .order('transaction_date', { ascending: false })
          .limit(100);

        if (error) throw error;

        // For split transactions, calculate remaining balance
        const depositIds = (deposits || []).filter((d: any) => d.tag_type === 'split').map((d: any) => d.id);
        
        let splitTotals: Record<string, number> = {};
        if (depositIds.length > 0) {
          const { data: splitsData } = await supabase
            .from('landlord_payment_splits')
            .select('transaction_id, amount')
            .in('transaction_id', depositIds);
          
          for (const split of splitsData || []) {
            splitTotals[split.transaction_id] = (splitTotals[split.transaction_id] || 0) + Number(split.amount);
          }
        }

        const availableDeposits = (deposits || []).map((d: any) => {
          const usedAmount = d.is_tagged && d.tag_type === 'split' ? (splitTotals[d.id] || 0) : 0;
          const availableAmount = (d.is_tagged && d.tag_type !== 'split' && d.tag_type !== 'tracked') ? 0 : Number(d.amount) - usedAmount;
          
          return {
            ...d,
            used_amount: usedAmount,
            available_amount: availableAmount,
          };
        }).filter((d: any) => d.available_amount > 0);

        return new Response(JSON.stringify({ deposits: availableDeposits }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'tag_property_payment': {
        // Tag a deposit (or portion) to a specific property/unit
        const { transactionId, propertyId, unitId, amount, tagType, notes, createAutoTagRule, transactionDescription } = params;
        
        // Get the transaction
        const { data: transaction, error: transError } = await supabase
          .from('landlord_plaid_transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('landlord_id', user.id)
          .single();

        if (transError) throw transError;

        const tagAmount = amount || transaction.amount;

        // If tagging full amount to single property (not already split)
        if (!transaction.is_tagged && tagAmount >= transaction.amount) {
          const { error: updateError } = await supabase
            .from('landlord_plaid_transactions')
            .update({
              is_tagged: true,
              tagged_at: new Date().toISOString(),
              tagged_by: user.id,
              property_id: propertyId,
              unit_id: unitId || null,
              tag_type: tagType,
              notes: notes || null,
            })
            .eq('id', transactionId);

          if (updateError) throw updateError;

          // Create payment record for full tag
          await createPaymentRecordFromTag(supabase, {
            propertyId,
            unitId,
            tagType,
            amount: tagAmount,
            transactionDate: transaction.transaction_date,
            transactionDescription: transaction.description,
            plaidTransactionId: transaction.plaid_transaction_id,
            splitId: null,
            userId: user.id,
          });
        } else {
          // Create or add to splits
          if (!transaction.is_tagged) {
            // Mark as split transaction
            await supabase
              .from('landlord_plaid_transactions')
              .update({
                is_tagged: true,
                tagged_at: new Date().toISOString(),
                tagged_by: user.id,
                tag_type: 'split',
              })
              .eq('id', transactionId);
          }

          // Add the split
          const { error: splitError } = await supabase
            .from('landlord_payment_splits')
            .insert({
              transaction_id: transactionId,
              property_id: propertyId,
              unit_id: unitId || null,
              amount: tagAmount,
              tag_type: tagType,
              notes: notes || null,
            });

          if (splitError) throw splitError;

          // Get the split ID we just created for linking
          const { data: newSplit } = await supabase
            .from('landlord_payment_splits')
            .select('id')
            .eq('transaction_id', transactionId)
            .eq('property_id', propertyId)
            .eq('amount', tagAmount)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Create payment record for the split
          await createPaymentRecordFromTag(supabase, {
            propertyId,
            unitId,
            tagType,
            amount: tagAmount,
            transactionDate: transaction.transaction_date,
            transactionDescription: transaction.description,
            plaidTransactionId: transaction.plaid_transaction_id,
            splitId: newSplit?.id,
            userId: user.id,
          });
        }

        // Create auto-tag rule if requested
        if (createAutoTagRule && (transaction.description || transactionDescription)) {
          const description = transactionDescription || transaction.description;
          const ruleName = `Auto: ${description.substring(0, 30)}${description.length > 30 ? '...' : ''}`;
          
          // Check if a similar rule already exists
          const { data: existingRule } = await supabase
            .from('landlord_auto_tag_rules')
            .select('id')
            .eq('landlord_id', user.id)
            .eq('match_pattern', description)
            .eq('target_property_id', propertyId)
            .maybeSingle();

          if (!existingRule) {
            const { error: ruleError } = await supabase
              .from('landlord_auto_tag_rules')
              .insert({
                landlord_id: user.id,
                rule_name: ruleName,
                match_type: 'description',
                match_pattern: description,
                match_amount_min: Math.floor(tagAmount * 0.9), // 10% tolerance
                match_amount_max: Math.ceil(tagAmount * 1.1),
                target_property_id: propertyId,
                target_unit_id: unitId || null,
                tag_type: tagType || 'tenant_rent',
                is_active: true,
              });

            if (ruleError) {
              console.error('[landlord-plaid-transactions] Failed to create auto-tag rule:', ruleError);
            } else {
              console.log(`[landlord-plaid-transactions] Created auto-tag rule: ${ruleName}`);
            }
          } else {
            console.log(`[landlord-plaid-transactions] Auto-tag rule already exists for pattern: ${description}`);
          }
        }

        console.log(`[landlord-plaid-transactions] Tagged ${tagAmount} from transaction ${transactionId} to property ${propertyId}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_transactions': {
        const { isTagged, bankAccountId, dateFrom, dateTo, searchTerm, limit = 50, offset = 0 } = params;
        
        let query = supabase
          .from('landlord_plaid_transactions')
          .select(`
            *,
            property:properties(id, address),
            unit:property_units(id, unit_number, unit_name),
            bank_account:user_bank_accounts(id, institution_name, account_name, mask)
          `, { count: 'exact' })
          .eq('landlord_id', user.id)
          .order('transaction_date', { ascending: false });

        if (typeof isTagged === 'boolean') {
          query = query.eq('is_tagged', isTagged);
        }
        if (bankAccountId) {
          query = query.eq('bank_account_id', bankAccountId);
        }
        if (dateFrom) {
          query = query.gte('transaction_date', dateFrom);
        }
        if (dateTo) {
          query = query.lte('transaction_date', dateTo);
        }
        if (searchTerm) {
          query = query.or(`description.ilike.%${searchTerm}%,merchant_name.ilike.%${searchTerm}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ transactions: data, total: count }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stats': {
        // Calculate accurate untagged count by checking actual tagging status
        const currentMonth = new Date();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];
        
        // Get occupied units with rent info (excluding soft-deleted properties)
        const { data: occupiedUnits, error: occupiedError } = await supabase
          .from('property_units')
          .select('id, monthly_rent, property_id, properties!inner(owner_id, deleted_at)')
          .eq('status', 'occupied')
          .eq('properties.owner_id', user.id)
          .is('properties.deleted_at', null);
        if (occupiedError) throw occupiedError;

        const unitIds = (occupiedUnits || []).map((u: any) => u.id);
        const propertyIds = [...new Set((occupiedUnits || []).map((u: any) => u.property_id))];
        
        // Get rent splits to determine expected amounts
        let rentSplitsByUnit: Record<string, { pha_portion: number; tenant_portion: number; tenant_collection_method: string }> = {};
        if (unitIds.length > 0) {
          const { data: unitSplits } = await supabase
            .from('rent_splits')
            .select('unit_id, property_id, pha_portion, tenant_portion, tenant_collection_method')
            .in('unit_id', unitIds)
            .eq('is_active', true);
          
          for (const split of unitSplits || []) {
            if (split.unit_id && !rentSplitsByUnit[split.unit_id]) {
              rentSplitsByUnit[split.unit_id] = {
                pha_portion: Number(split.pha_portion) || 0,
                tenant_portion: Number(split.tenant_portion) || 0,
                tenant_collection_method: split.tenant_collection_method || 'external',
              };
            }
          }
          
          // Fallback to property-level splits
          if (propertyIds.length > 0) {
            const { data: propertySplits } = await supabase
              .from('rent_splits')
              .select('property_id, pha_portion, tenant_portion, tenant_collection_method')
              .in('property_id', propertyIds)
              .is('unit_id', null)
              .eq('is_active', true);
            
            const rentSplitsByProperty: Record<string, any> = {};
            for (const split of propertySplits || []) {
              if (!rentSplitsByProperty[split.property_id]) {
                rentSplitsByProperty[split.property_id] = {
                  pha_portion: Number(split.pha_portion) || 0,
                  tenant_portion: Number(split.tenant_portion) || 0,
                  tenant_collection_method: split.tenant_collection_method || 'external',
                };
              }
            }
            for (const unit of occupiedUnits || []) {
              if (!rentSplitsByUnit[unit.id] && rentSplitsByProperty[unit.property_id]) {
                rentSplitsByUnit[unit.id] = rentSplitsByProperty[unit.property_id];
              }
            }
          }
        }

        // Get tagged amounts for each unit this period
        const { data: taggedSplits } = await supabase
          .from('landlord_payment_splits')
          .select('unit_id, amount, tag_type')
          .in('unit_id', unitIds)
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd + 'T23:59:59');

        const { data: directTags } = await supabase
          .from('landlord_plaid_transactions')
          .select('unit_id, amount, tag_type')
          .eq('landlord_id', user.id)
          .eq('is_tagged', true)
          .not('unit_id', 'is', null)
          .not('tag_type', 'eq', 'split')
          .gte('transaction_date', periodStart)
          .lte('transaction_date', periodEnd);

        // Calculate tagged amounts per unit
        const taggedByUnit: Record<string, { hap: number; tenant: number }> = {};
        for (const unit of occupiedUnits || []) {
          taggedByUnit[unit.id] = { hap: 0, tenant: 0 };
        }
        for (const split of taggedSplits || []) {
          if (split.unit_id && taggedByUnit[split.unit_id]) {
            if (split.tag_type === 'hap_voucher') {
              taggedByUnit[split.unit_id].hap += Number(split.amount);
            } else {
              taggedByUnit[split.unit_id].tenant += Number(split.amount);
            }
          }
        }
        for (const tag of directTags || []) {
          if (tag.unit_id && taggedByUnit[tag.unit_id]) {
            if (tag.tag_type === 'hap_voucher') {
              taggedByUnit[tag.unit_id].hap += Number(tag.amount);
            } else {
              taggedByUnit[tag.unit_id].tenant += Number(tag.amount);
            }
          }
        }

        // Count units that still need tagging (remaining > 0)
        let untaggedCount = 0;
        for (const unit of occupiedUnits || []) {
          const rentSplit = rentSplitsByUnit[unit.id];
          const hapExpected = rentSplit?.pha_portion || 0;
          const tenantCollectionMethod = rentSplit?.tenant_collection_method || 'external';
          const tenantExpectedRaw = rentSplit?.tenant_portion || Number(unit.monthly_rent) || 0;
          const tenantExpectedForTagging = tenantCollectionMethod === 'stripe' ? 0 : tenantExpectedRaw;
          
          const unitTags = taggedByUnit[unit.id] || { hap: 0, tenant: 0 };
          const hapRemaining = Math.max(0, hapExpected - unitTags.hap);
          const tenantRemaining = Math.max(0, tenantExpectedForTagging - unitTags.tenant);
          const totalRemaining = hapRemaining + tenantRemaining;
          
          if (totalRemaining > 0) {
            untaggedCount++;
          }
        }

        const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
        const { data: taggedThisMonth } = await supabase
          .from('landlord_plaid_transactions')
          .select('amount')
          .eq('landlord_id', user.id)
          .eq('is_tagged', true)
          .gte('tagged_at', firstOfMonth);

        const { data: totalTransactions } = await supabase
          .from('landlord_plaid_transactions')
          .select('id', { count: 'exact' })
          .eq('landlord_id', user.id);

        const { data: activeRules } = await supabase
          .from('landlord_auto_tag_rules')
          .select('id', { count: 'exact' })
          .eq('landlord_id', user.id)
          .eq('is_active', true);

        const taggedAmount = taggedThisMonth?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Calculate amount actually tagged to properties (from splits)
        const lastOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: taggedToProperties } = await supabase
          .from('landlord_payment_splits')
          .select('amount')
          .in('unit_id', unitIds)
          .gte('created_at', firstOfMonth)
          .lte('created_at', lastOfMonth + 'T23:59:59');

        const amountTaggedToProperties = taggedToProperties?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

        return new Response(JSON.stringify({
          untaggedCount,
          amountTaggedToProperties,
          amountTrackedFromPlaid: taggedAmount,
          totalTransactions: totalTransactions?.length || 0,
          activeRulesCount: activeRules?.length || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'mark_as_tracked': {
        // Mark deposits as tracked without linking to property yet
        // This is used when loading bank deposits for later property linking
        const { transactionId, createAutoTagRule } = params;
        
        const { data, error } = await supabase
          .from('landlord_plaid_transactions')
          .update({
            is_tagged: true,
            tagged_at: new Date().toISOString(),
            tagged_by: user.id,
            tag_type: 'tracked', // Generic tracked status
          })
          .eq('id', transactionId)
          .eq('landlord_id', user.id)
          .select()
          .single();

        if (error) throw error;
        console.log(`[landlord-plaid-transactions] Marked transaction ${transactionId} as tracked`);

        return new Response(JSON.stringify({ success: true, transaction: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'tag_transaction': {
        const { transactionId, propertyId, unitId, tagType, notes } = params;
        
        const { data, error } = await supabase
          .from('landlord_plaid_transactions')
          .update({
            is_tagged: true,
            tagged_at: new Date().toISOString(),
            tagged_by: user.id,
            property_id: propertyId,
            unit_id: unitId || null,
            tag_type: tagType,
            notes: notes || null,
          })
          .eq('id', transactionId)
          .eq('landlord_id', user.id)
          .select()
          .single();

        if (error) throw error;
        console.log(`[landlord-plaid-transactions] Tagged transaction ${transactionId}`);

        return new Response(JSON.stringify({ success: true, transaction: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'untag_transaction': {
        const { transactionId } = params;
        
        // Get existing splits to delete associated payment records
        const { data: existingSplits } = await supabase
          .from('landlord_payment_splits')
          .select('id')
          .eq('transaction_id', transactionId);
        
        const existingSplitIds = (existingSplits || []).map((s: any) => s.id);
        
        if (existingSplitIds.length > 0) {
          // Delete associated rent_payments
          await supabase
            .from('rent_payments')
            .delete()
            .in('plaid_split_id', existingSplitIds);
          
          // Delete associated hap_payments
          await supabase
            .from('hap_payments')
            .delete()
            .in('plaid_split_id', existingSplitIds);
        }
        
        // Also delete by plaid_transaction_id for direct tags
        const { data: transData } = await supabase
          .from('landlord_plaid_transactions')
          .select('plaid_transaction_id')
          .eq('id', transactionId)
          .single();
        
        if (transData?.plaid_transaction_id) {
          await supabase
            .from('rent_payments')
            .delete()
            .eq('plaid_transaction_id', transData.plaid_transaction_id);
          
          await supabase
            .from('hap_payments')
            .delete()
            .eq('plaid_transaction_id', transData.plaid_transaction_id);
        }
        
        // Delete any splits
        await supabase
          .from('landlord_payment_splits')
          .delete()
          .eq('transaction_id', transactionId);

        const { data, error } = await supabase
          .from('landlord_plaid_transactions')
          .update({
            is_tagged: false,
            tagged_at: null,
            tagged_by: null,
            property_id: null,
            unit_id: null,
            tag_type: null,
            notes: null,
          })
          .eq('id', transactionId)
          .eq('landlord_id', user.id)
          .select()
          .single();

        if (error) throw error;
        console.log(`[landlord-plaid-transactions] Untagged transaction ${transactionId} and removed payment records`);

        return new Response(JSON.stringify({ success: true, transaction: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'split_transaction': {
        const { transactionId, splits } = params;
        
        // Get transaction details first
        const { data: transaction, error: transError } = await supabase
          .from('landlord_plaid_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();
        
        if (transError) throw transError;
        
        // Update main transaction
        const { error: updateError } = await supabase
          .from('landlord_plaid_transactions')
          .update({
            is_tagged: true,
            tagged_at: new Date().toISOString(),
            tagged_by: user.id,
            tag_type: 'split',
          })
          .eq('id', transactionId)
          .eq('landlord_id', user.id);

        if (updateError) throw updateError;

        // Delete existing splits and their associated payment records
        const { data: existingSplits } = await supabase
          .from('landlord_payment_splits')
          .select('id')
          .eq('transaction_id', transactionId);
        
        const existingSplitIds = (existingSplits || []).map((s: any) => s.id);
        
        if (existingSplitIds.length > 0) {
          // Delete associated rent_payments
          await supabase
            .from('rent_payments')
            .delete()
            .in('plaid_split_id', existingSplitIds);
          
          // Delete associated hap_payments
          await supabase
            .from('hap_payments')
            .delete()
            .in('plaid_split_id', existingSplitIds);
        }
        
        await supabase
          .from('landlord_payment_splits')
          .delete()
          .eq('transaction_id', transactionId);

        // Insert new splits
        const splitsToInsert = splits.map((s: any) => ({
          transaction_id: transactionId,
          property_id: s.propertyId,
          unit_id: s.unitId || null,
          amount: s.amount,
          tag_type: s.tagType,
          notes: s.notes || null,
        }));

        const { data: insertedSplits, error: splitsError } = await supabase
          .from('landlord_payment_splits')
          .insert(splitsToInsert)
          .select();

        if (splitsError) throw splitsError;
        
        // Create corresponding payment records for each split
        const transactionDate = transaction.transaction_date;
        const periodStart = new Date(transactionDate);
        periodStart.setDate(1);
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
        
        for (const split of insertedSplits || []) {
          // Get unit's tenant_id if unit is specified
          let tenantId = null;
          if (split.unit_id) {
            const { data: unitData } = await supabase
              .from('property_units')
              .select('tenant_id')
              .eq('id', split.unit_id)
              .single();
            tenantId = unitData?.tenant_id || null;
          }
          
          if (split.tag_type === 'hap_voucher') {
            // Create HAP payment record
            // NOTE: Constraint requires EITHER property_id OR unit_id, not both
            const { error: hapError } = await supabase
              .from('hap_payments')
              .insert({
                property_id: split.unit_id ? null : split.property_id,  // Only set if no unit_id
                unit_id: split.unit_id,
                tenant_id: tenantId,
                payment_period_start: periodStart.toISOString().split('T')[0],
                payment_period_end: periodEnd.toISOString().split('T')[0],
                expected_amount: split.amount,
                actual_amount: split.amount,
                payment_date: transactionDate,
                payment_method: 'ach',  // Valid: ach, check, wire
                payment_status: 'received',
                verification_method: 'plaid',
                plaid_transaction_id: transaction.plaid_transaction_id,
                plaid_split_id: split.id,
                matched_via_plaid: true,
                notes: `Tagged from bank deposit: ${transaction.description || 'N/A'}`,
                recorded_by: user.id,
              });
            
            if (hapError) {
              console.error('[landlord-plaid-transactions] Error creating HAP payment:', hapError);
            } else {
              console.log(`[landlord-plaid-transactions] Created HAP payment for split ${split.id}`);
            }
          } else {
            // Create rent payment record (tenant_rent or generic)
            const { error: rentError } = await supabase
              .from('rent_payments')
              .insert({
                property_id: split.property_id,
                unit_id: split.unit_id,
                tenant_id: tenantId,
                payment_date: transactionDate,
                amount: split.amount,
                payment_source: 'bank_transfer',
                payment_method: 'plaid',
                payment_type: 'rent',
                status: 'completed',
                plaid_transaction_id: transaction.plaid_transaction_id,
                plaid_split_id: split.id,
                matched_via_plaid: true,
                notes: `Tagged from bank deposit: ${transaction.description || 'N/A'}`,
                recorded_by: user.id,
              });
            
            if (rentError) {
              console.error('[landlord-plaid-transactions] Error creating rent payment:', rentError);
            } else {
              console.log(`[landlord-plaid-transactions] Created rent payment for split ${split.id}`);
            }
          }
        }
        
        console.log(`[landlord-plaid-transactions] Split transaction ${transactionId} into ${splits.length} parts with payment records`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_splits': {
        const { transactionId } = params;
        
        const { data, error } = await supabase
          .from('landlord_payment_splits')
          .select(`
            *,
            property:properties(id, address),
            unit:property_units(id, unit_number, unit_name)
          `)
          .eq('transaction_id', transactionId);

        if (error) throw error;

        return new Response(JSON.stringify({ splits: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_rules': {
        const { data, error } = await supabase
          .from('landlord_auto_tag_rules')
          .select(`
            *,
            property:properties(id, address),
            unit:property_units(id, unit_number, unit_name)
          `)
          .eq('landlord_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ rules: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_rule': {
        const { ruleName, matchType, matchPattern, matchAmountMin, matchAmountMax, matchMerchant, targetPropertyId, targetUnitId, tagType } = params;
        
        const { data, error } = await supabase
          .from('landlord_auto_tag_rules')
          .insert({
            landlord_id: user.id,
            rule_name: ruleName,
            match_type: matchType,
            match_pattern: matchPattern || null,
            match_amount_min: matchAmountMin || null,
            match_amount_max: matchAmountMax || null,
            match_merchant: matchMerchant || null,
            target_property_id: targetPropertyId,
            target_unit_id: targetUnitId || null,
            tag_type: tagType,
          })
          .select()
          .single();

        if (error) throw error;
        console.log(`[landlord-plaid-transactions] Created rule ${data.id}`);

        return new Response(JSON.stringify({ success: true, rule: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_rule': {
        const { ruleId, ...updates } = params;
        
        const updateData: any = {};
        if (updates.ruleName !== undefined) updateData.rule_name = updates.ruleName;
        if (updates.matchType !== undefined) updateData.match_type = updates.matchType;
        if (updates.matchPattern !== undefined) updateData.match_pattern = updates.matchPattern;
        if (updates.matchAmountMin !== undefined) updateData.match_amount_min = updates.matchAmountMin;
        if (updates.matchAmountMax !== undefined) updateData.match_amount_max = updates.matchAmountMax;
        if (updates.matchMerchant !== undefined) updateData.match_merchant = updates.matchMerchant;
        if (updates.targetPropertyId !== undefined) updateData.target_property_id = updates.targetPropertyId;
        if (updates.targetUnitId !== undefined) updateData.target_unit_id = updates.targetUnitId;
        if (updates.tagType !== undefined) updateData.tag_type = updates.tagType;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        const { data, error } = await supabase
          .from('landlord_auto_tag_rules')
          .update(updateData)
          .eq('id', ruleId)
          .eq('landlord_id', user.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, rule: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_rule': {
        const { ruleId } = params;
        
        const { error } = await supabase
          .from('landlord_auto_tag_rules')
          .delete()
          .eq('id', ruleId)
          .eq('landlord_id', user.id);

        if (error) throw error;
        console.log(`[landlord-plaid-transactions] Deleted rule ${ruleId}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'apply_rules': {
        // Get active rules
        const { data: rules, error: rulesError } = await supabase
          .from('landlord_auto_tag_rules')
          .select('*')
          .eq('landlord_id', user.id)
          .eq('is_active', true);

        if (rulesError) throw rulesError;

        // Get untagged transactions
        const { data: transactions, error: transError } = await supabase
          .from('landlord_plaid_transactions')
          .select('*')
          .eq('landlord_id', user.id)
          .eq('is_tagged', false);

        if (transError) throw transError;

        let taggedCount = 0;
        for (const transaction of transactions || []) {
          for (const rule of rules || []) {
            let matches = false;

            switch (rule.match_type) {
              case 'description':
                matches = rule.match_pattern && 
                  transaction.description?.toLowerCase().includes(rule.match_pattern.toLowerCase());
                break;
              case 'merchant':
                matches = rule.match_merchant && 
                  transaction.merchant_name?.toLowerCase().includes(rule.match_merchant.toLowerCase());
                break;
              case 'amount':
                const amount = Math.abs(Number(transaction.amount));
                matches = (!rule.match_amount_min || amount >= rule.match_amount_min) &&
                  (!rule.match_amount_max || amount <= rule.match_amount_max);
                break;
              case 'combined':
                const descMatch = !rule.match_pattern || 
                  transaction.description?.toLowerCase().includes(rule.match_pattern.toLowerCase());
                const merchantMatch = !rule.match_merchant || 
                  transaction.merchant_name?.toLowerCase().includes(rule.match_merchant.toLowerCase());
                const amtMatch = (!rule.match_amount_min || Math.abs(Number(transaction.amount)) >= rule.match_amount_min) &&
                  (!rule.match_amount_max || Math.abs(Number(transaction.amount)) <= rule.match_amount_max);
                matches = descMatch && merchantMatch && amtMatch;
                break;
            }

            if (matches) {
              await supabase
                .from('landlord_plaid_transactions')
                .update({
                  is_tagged: true,
                  tagged_at: new Date().toISOString(),
                  tagged_by: user.id,
                  property_id: rule.target_property_id,
                  unit_id: rule.target_unit_id,
                  tag_type: rule.tag_type,
                  notes: `Auto-tagged by rule: ${rule.rule_name}`,
                })
                .eq('id', transaction.id);

              // Create payment record automatically with tenant linking
              await createPaymentRecordFromTag(supabase, {
                propertyId: rule.target_property_id,
                unitId: rule.target_unit_id,
                tagType: rule.tag_type,
                amount: Math.abs(Number(transaction.amount)),
                transactionDate: transaction.transaction_date,
                transactionDescription: transaction.description,
                plaidTransactionId: transaction.plaid_transaction_id,
                splitId: null,
                userId: user.id,
              });

              taggedCount++;
              break; // Stop after first matching rule
            }
          }
        }

        console.log(`[landlord-plaid-transactions] Applied rules, tagged ${taggedCount} transactions`);

        return new Response(JSON.stringify({ success: true, taggedCount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_transactions': {
        // Get user's Plaid-linked bank accounts
        const { data: bankAccounts, error: bankError } = await supabase
          .from('user_bank_accounts')
          .select('id, plaid_access_token, plaid_account_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'linked'])
        .not('plaid_access_token', 'is', null);

        if (bankError) throw bankError;

        if (!bankAccounts || bankAccounts.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No linked bank accounts found',
            syncedCount: 0 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
        const plaidSecret = Deno.env.get('PLAID_SECRET');
        const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
        
        if (!plaidClientId || !plaidSecret) {
          return new Response(JSON.stringify({ 
            error: 'Plaid credentials not configured' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const plaidBaseUrl = plaidEnv === 'production' 
          ? 'https://production.plaid.com'
          : plaidEnv === 'development' 
            ? 'https://development.plaid.com'
            : 'https://sandbox.plaid.com';

        let totalSynced = 0;
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        for (const account of bankAccounts) {
          try {
            const transResponse = await fetch(`${plaidBaseUrl}/transactions/get`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: plaidClientId,
                secret: plaidSecret,
                access_token: account.plaid_access_token,
                start_date: startDate,
                end_date: endDate,
                options: {
                  account_ids: [account.plaid_account_id],
                  count: 500,
                },
              }),
            });

            if (!transResponse.ok) {
              console.error(`[landlord-plaid-transactions] Plaid error for account ${account.id}`);
              continue;
            }

            const transData = await transResponse.json();
            
            // Filter for incoming payments (positive amounts = rent received)
            const incomingTransactions = transData.transactions?.filter(
              (t: any) => t.amount > 0
            ) || [];

            for (const trans of incomingTransactions) {
              const { error: insertError } = await supabase
                .from('landlord_plaid_transactions')
                .upsert({
                  landlord_id: user.id,
                  bank_account_id: account.id,
                  plaid_transaction_id: trans.transaction_id,
                  transaction_date: trans.date,
                  amount: trans.amount, // Already positive
                  description: trans.name || trans.merchant_name,
                  merchant_name: trans.merchant_name,
                  pending: trans.pending,
                  category: trans.category?.[0],
                  plaid_data: trans,
                }, {
                  onConflict: 'landlord_id,plaid_transaction_id',
                  ignoreDuplicates: true,
                });

              if (!insertError) totalSynced++;
            }
          } catch (err) {
            console.error(`[landlord-plaid-transactions] Error syncing account ${account.id}:`, err);
          }
        }

        console.log(`[landlord-plaid-transactions] Synced ${totalSynced} transactions for user ${user.id}`);

        // Auto-apply rules after syncing new transactions
        let autoTaggedCount = 0;
        if (totalSynced > 0) {
          const { data: rules } = await supabase
            .from('landlord_auto_tag_rules')
            .select('*')
            .eq('landlord_id', user.id)
            .eq('is_active', true);

          if (rules && rules.length > 0) {
            const { data: untaggedTrans } = await supabase
              .from('landlord_plaid_transactions')
              .select('*')
              .eq('landlord_id', user.id)
              .eq('is_tagged', false);

            for (const transaction of untaggedTrans || []) {
              for (const rule of rules) {
                let matches = false;
                switch (rule.match_type) {
                  case 'description':
                    matches = rule.match_pattern && 
                      transaction.description?.toLowerCase().includes(rule.match_pattern.toLowerCase());
                    break;
                  case 'merchant':
                    matches = rule.match_merchant && 
                      transaction.merchant_name?.toLowerCase().includes(rule.match_merchant.toLowerCase());
                    break;
                  case 'amount':
                    const amount = Math.abs(Number(transaction.amount));
                    matches = (!rule.match_amount_min || amount >= rule.match_amount_min) &&
                      (!rule.match_amount_max || amount <= rule.match_amount_max);
                    break;
                  case 'combined':
                    const descMatch = !rule.match_pattern || 
                      transaction.description?.toLowerCase().includes(rule.match_pattern.toLowerCase());
                    const merchantMatch = !rule.match_merchant || 
                      transaction.merchant_name?.toLowerCase().includes(rule.match_merchant.toLowerCase());
                    const amtMatch = (!rule.match_amount_min || Math.abs(Number(transaction.amount)) >= rule.match_amount_min) &&
                      (!rule.match_amount_max || Math.abs(Number(transaction.amount)) <= rule.match_amount_max);
                    matches = descMatch && merchantMatch && amtMatch;
                    break;
                }
                if (matches) {
                  await supabase
                    .from('landlord_plaid_transactions')
                    .update({
                      is_tagged: true,
                      tagged_at: new Date().toISOString(),
                      tagged_by: user.id,
                      property_id: rule.target_property_id,
                      unit_id: rule.target_unit_id,
                      tag_type: rule.tag_type,
                      notes: `Auto-tagged by rule: ${rule.rule_name}`,
                    })
                    .eq('id', transaction.id);

                  // Create payment record automatically with tenant linking
                  await createPaymentRecordFromTag(supabase, {
                    propertyId: rule.target_property_id,
                    unitId: rule.target_unit_id,
                    tagType: rule.tag_type,
                    amount: Math.abs(Number(transaction.amount)),
                    transactionDate: transaction.transaction_date,
                    transactionDescription: transaction.description,
                    plaidTransactionId: transaction.plaid_transaction_id,
                    splitId: null,
                    userId: user.id,
                  });

                  autoTaggedCount++;
                  break;
                }
              }
            }
            console.log(`[landlord-plaid-transactions] Auto-applied rules, tagged ${autoTaggedCount} transactions`);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          syncedCount: totalSynced,
          autoTaggedCount 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_payment_tag': {
        const { splitId, amount, tagType } = params;
        
        if (!splitId) {
          return new Response(JSON.stringify({ error: 'splitId is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updateData: Record<string, any> = {};
        if (amount !== undefined) updateData.amount = amount;
        if (tagType !== undefined) updateData.tag_type = tagType;

        const { data: updatedSplit, error: updateError } = await supabase
          .from('landlord_payment_splits')
          .update(updateData)
          .eq('id', splitId)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log(`[landlord-plaid-transactions] Updated split ${splitId}:`, updatedSplit);

        return new Response(JSON.stringify({ success: true, data: updatedSplit }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_payment_tag': {
        const { splitId } = params;
        
        if (!splitId) {
          return new Response(JSON.stringify({ error: 'splitId is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get the split to find the transaction_id
        const { data: split, error: splitFetchError } = await supabase
          .from('landlord_payment_splits')
          .select('transaction_id')
          .eq('id', splitId)
          .single();

        if (splitFetchError) {
          console.log(`[landlord-plaid-transactions] Split not found: ${splitId}`);
          return new Response(JSON.stringify({ error: 'Split not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const transactionId = split.transaction_id;

        // Delete the split
        const { error: deleteError } = await supabase
          .from('landlord_payment_splits')
          .delete()
          .eq('id', splitId);

        if (deleteError) throw deleteError;

        // Check if parent transaction has any remaining splits
        const { data: remainingSplits, error: countError } = await supabase
          .from('landlord_payment_splits')
          .select('id')
          .eq('transaction_id', transactionId);

        if (countError) throw countError;

        // If no splits remain, reset the transaction to untagged
        if (!remainingSplits || remainingSplits.length === 0) {
          await supabase
            .from('landlord_plaid_transactions')
            .update({
              is_tagged: false,
              tagged_at: null,
              tagged_by: null,
              tag_type: null,
            })
            .eq('id', transactionId);
          console.log(`[landlord-plaid-transactions] Transaction ${transactionId} reset to untagged (no splits remaining)`);
        }

        console.log(`[landlord-plaid-transactions] Deleted payment split ${splitId}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'backfill_payment_records': {
        // Backfill payment records for existing tagged splits that are missing hap_payments/rent_payments entries
        console.log(`[landlord-plaid-transactions] Starting backfill for user ${user.id}`);

        // Get all tagged transactions for this landlord WITH the data we need
        const { data: transactions, error: txError } = await supabase
          .from('landlord_plaid_transactions')
          .select('id, transaction_date, description, plaid_transaction_id')
          .eq('landlord_id', user.id)
          .eq('is_tagged', true);

        if (txError) throw txError;

        // Build a lookup map for transaction data
        const transactionMap = new Map<string, { transaction_date: string; description: string; plaid_transaction_id: string }>();
        (transactions || []).forEach((t: any) => {
          transactionMap.set(t.id, {
            transaction_date: t.transaction_date,
            description: t.description,
            plaid_transaction_id: t.plaid_transaction_id,
          });
        });
        
        const transactionIds = Array.from(transactionMap.keys());
        
        if (transactionIds.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No tagged transactions found',
            created: { hap: 0, rent: 0 }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[landlord-plaid-transactions] Found ${transactionIds.length} tagged transactions`);

        // Get all splits WITHOUT the problematic PostgREST join
        const { data: allSplits, error: splitsError } = await supabase
          .from('landlord_payment_splits')
          .select('id, property_id, unit_id, amount, tag_type, transaction_id')
          .in('transaction_id', transactionIds);

        if (splitsError) throw splitsError;

        console.log(`[landlord-plaid-transactions] Found ${(allSplits || []).length} splits to process`);

        let hapCreated = 0;
        let rentCreated = 0;

        for (const split of allSplits || []) {
          // Manually look up transaction data from our map
          const transaction = transactionMap.get(split.transaction_id);
          const paymentDate = transaction?.transaction_date || new Date().toISOString().split('T')[0];
          
          // Calculate payment period from transaction date
          const periodDate = new Date(paymentDate);
          const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
          const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

          if (split.tag_type === 'hap_voucher') {
            // Check if hap_payment already exists for this split
            const { data: existingHap } = await supabase
              .from('hap_payments')
              .select('id')
              .eq('plaid_split_id', split.id)
              .maybeSingle();

            if (!existingHap) {
              // Get tenant_id from unit if available
              let hapTenantId = null;
              if (split.unit_id) {
                const { data: unitData } = await supabase
                  .from('property_units')
                  .select('tenant_id')
                  .eq('id', split.unit_id)
                  .single();
                hapTenantId = unitData?.tenant_id;
              }

              // Create hap_payment record
              // NOTE: Database constraint requires EITHER property_id OR unit_id, not both
              const { error: hapError } = await supabase
                .from('hap_payments')
                .insert({
                  property_id: split.unit_id ? null : split.property_id,
                  unit_id: split.unit_id,
                  tenant_id: hapTenantId,
                  payment_period_start: periodStart.toISOString().split('T')[0],
                  payment_period_end: periodEnd.toISOString().split('T')[0],
                  expected_amount: split.amount,
                  actual_amount: split.amount,
                  payment_date: paymentDate,
                  payment_status: 'received',
                  payment_method: 'bank_deposit',
                  plaid_split_id: split.id,
                  matched_via_plaid: true,
                  notes: `Auto-created from Plaid tag: ${transaction?.description || 'Bank deposit'}`,
                  recorded_by: user.id,
                });

              if (hapError) {
                console.log(`[landlord-plaid-transactions] Failed to create hap_payment for split ${split.id}:`, hapError);
              } else {
                hapCreated++;
                console.log(`[landlord-plaid-transactions] Created hap_payment for split ${split.id}`);
              }
            }
          } else {
            // Tenant rent payment - check if rent_payment already exists
            const { data: existingRent } = await supabase
              .from('rent_payments')
              .select('id')
              .eq('plaid_split_id', split.id)
              .maybeSingle();

            if (!existingRent) {
              // Get tenant_id from unit if available
              let tenantId = null;
              if (split.unit_id) {
                const { data: unitData } = await supabase
                  .from('property_units')
                  .select('tenant_id')
                  .eq('id', split.unit_id)
                  .single();
                tenantId = unitData?.tenant_id;
              }

              // Create rent_payment record
              const { error: rentError } = await supabase
                .from('rent_payments')
                .insert({
                  property_id: split.property_id,
                  unit_id: split.unit_id,
                  tenant_id: tenantId,
                  amount: split.amount,
                  payment_date: paymentDate,
                  payment_source: 'manual',
                  payment_type: 'rent',
                  status: 'completed',
                  payment_method: 'bank_deposit',
                  plaid_split_id: split.id,
                  matched_via_plaid: true,
                  notes: `Auto-created from Plaid tag: ${transaction?.description || 'Bank deposit'}`,
                  recorded_by: user.id,
                });

              if (rentError) {
                console.log(`[landlord-plaid-transactions] Failed to create rent_payment for split ${split.id}:`, rentError);
              } else {
                rentCreated++;
                console.log(`[landlord-plaid-transactions] Created rent_payment for split ${split.id}`);
              }
            }
          }
        }

        console.log(`[landlord-plaid-transactions] Backfill complete: ${hapCreated} HAP, ${rentCreated} rent payments created`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Created ${hapCreated} HAP and ${rentCreated} rent payment records`,
          created: { hap: hapCreated, rent: rentCreated }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[landlord-plaid-transactions] Error:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
