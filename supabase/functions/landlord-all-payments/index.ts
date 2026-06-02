import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentType?: string; // 'all' | 'rent' | 'hap'
  propertyId?: string;
  unitId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// Compute display status based on payment state and due date
// Only shows: Received, Late, or Received/Late (no Pending before due date)
function getDisplayStatus(payment: { 
  status: string; 
  due_date: string | null; 
  paid_at: string | null;
}): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const dueDate = payment.due_date ? new Date(payment.due_date) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);
  
  const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;
  if (paidAt) paidAt.setHours(0, 0, 0, 0);
  
  // Payment completed
  if (payment.status === 'completed' || payment.status === 'paid') {
    if (dueDate && paidAt && paidAt > dueDate) {
      return 'Received/Late'; // Paid but after due date
    }
    return 'Received'; // Paid on time or no due date
  }
  
  // Payment pending - only show if overdue (Late)
  if (payment.status === 'pending') {
    if (dueDate && today > dueDate) {
      return 'Late'; // Overdue and unpaid
    }
    // Before due date - don't show in list
    return null;
  }
  
  // Failed payments are Late
  if (payment.status === 'failed' || payment.status === 'overdue') {
    return 'Late';
  }
  
  return payment.status; // Fallback
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filters = {}, statsOnly = false, landlordId, portfolioId } = await req.json();
    
    // ===== AUTHORIZATION CHECK =====
    // User can only access their own data, unless they are an admin
    const requestedLandlordId = landlordId || user.id;
    
    if (requestedLandlordId !== user.id) {
      // Check if caller is an admin
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!isAdmin) {
        console.error('❌ Authorization denied: user', user.id, 'tried to access landlord', requestedLandlordId);
        return new Response(
          JSON.stringify({ error: 'Forbidden - Cannot access other landlord data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('✅ Admin access granted for user:', user.id);
    }

    console.log('✅ Authorized - Fetching unified payments for landlord:', requestedLandlordId, 'Portfolio:', portfolioId, 'Stats only:', statsOnly);

    // Get landlord's properties with addresses for map lookup
    let propertiesQuery = supabase
      .from('properties')
      .select('id, address')
      .eq('owner_id', requestedLandlordId);

    if (portfolioId && portfolioId !== 'everything') {
      propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
    }

    const { data: properties, error: propError } = await propertiesQuery;
    if (propError) throw propError;

    const propertyIds = properties?.map(p => p.id) || [];
    
    // Build property address map for lookups (solves nested PostgREST join issues)
    const propertyAddressMap = new Map<string, string>(
      properties?.map(p => [p.id, p.address]) || []
    );
    if (propertyIds.length === 0) {
      return new Response(
        JSON.stringify(statsOnly ? { 
          totalReceived: 0, 
          totalReceivedThisMonth: 0,
          totalTenantRent: 0,
          totalHAPReceived: 0,
          pendingCount: 0,
          lateCount: 0
        } : { payments: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all unit IDs for these properties (needed for HAP payments with property_id NULL)
    const { data: units } = await supabase
      .from('property_units')
      .select('id')
      .in('property_id', propertyIds);
    
    const unitIds = units?.map(u => u.id) || [];

    const typedFilters = filters as PaymentFilters;
    console.log('Filters received:', typedFilters);

    if (statsOnly) {
      // Determine which property/unit IDs to use for stats filtering
      let statsPropertyIds = propertyIds;
      let statsUnitIds = unitIds;

      // If filtering by specific property, narrow down the scope
      if (typedFilters.propertyId) {
        statsPropertyIds = [typedFilters.propertyId];
        // Get units for this specific property
        const { data: propUnits } = await supabase
          .from('property_units')
          .select('id')
          .eq('property_id', typedFilters.propertyId);
        statsUnitIds = propUnits?.map(u => u.id) || [];
        console.log('Stats filtering by propertyId:', typedFilters.propertyId, 'unitIds:', statsUnitIds);
      }

      // If filtering by specific unit, narrow down further
      if (typedFilters.unitId) {
        statsUnitIds = [typedFilters.unitId];
        console.log('Stats filtering by unitId:', typedFilters.unitId);
      }

      // Fetch rent payment stats
      let rentStatsQuery = supabase
        .from('rent_payments')
        .select('amount, payment_date, status')
        .in('property_id', statsPropertyIds);

      // If unitId filter, also filter rent by unit
      if (typedFilters.unitId) {
        rentStatsQuery = rentStatsQuery.eq('unit_id', typedFilters.unitId);
      }

      // Fetch HAP payment stats - must query by both property_id OR unit_id
      // because HAP payments with unit_id have property_id = NULL (DB constraint)
      let hapStatsQuery = supabase
        .from('hap_payments')
        .select('actual_amount, payment_date, payment_status');
      
      if (statsUnitIds.length > 0) {
        hapStatsQuery = hapStatsQuery.or(`property_id.in.(${statsPropertyIds.join(',')}),unit_id.in.(${statsUnitIds.join(',')})`);
      } else {
        hapStatsQuery = hapStatsQuery.in('property_id', statsPropertyIds);
      }

      const [rentStatsResult, hapStatsResult] = await Promise.all([
        rentStatsQuery,
        hapStatsQuery
      ]);
      
      console.log('Stats results - rent:', rentStatsResult.data?.length, 'hap:', hapStatsResult.data?.length);

      if (rentStatsResult.error) throw rentStatsResult.error;
      if (hapStatsResult.error) throw hapStatsResult.error;

      const rentPayments = rentStatsResult.data || [];
      const hapPayments = hapStatsResult.data || [];

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalReceived = 0;
      let totalReceivedThisMonth = 0;
      let totalTenantRent = 0;
      let pendingCount = 0;
      let lateCount = 0;

      rentPayments.forEach((payment: any) => {
        const amount = payment.amount || 0;
        if (payment.status === 'completed' || payment.status === 'paid') {
          totalReceived += amount;
          totalTenantRent += amount;
          
          const paymentDate = new Date(payment.payment_date);
          if (paymentDate >= startOfMonth) {
            totalReceivedThisMonth += amount;
          }
        } else if (payment.status === 'pending') {
          pendingCount++;
        } else if (payment.status === 'failed' || payment.status === 'overdue') {
          lateCount++;
        }
      });

      let totalHAPReceived = 0;
      hapPayments.forEach((payment: any) => {
        const amount = payment.actual_amount || 0;
        if (payment.payment_status === 'received' || payment.payment_status === 'paid') {
          totalReceived += amount;
          totalHAPReceived += amount;
          
          const paymentDate = new Date(payment.payment_date);
          if (paymentDate >= startOfMonth) {
            totalReceivedThisMonth += amount;
          }
        } else if (payment.payment_status === 'pending') {
          pendingCount++;
        } else if (payment.payment_status === 'late' || payment.payment_status === 'partial') {
          lateCount++;
        }
      });

      return new Response(
        JSON.stringify({ 
          totalReceived, 
          totalReceivedThisMonth,
          totalTenantRent,
          totalHAPReceived,
          pendingCount,
          lateCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch full payment data (typedFilters already declared above)
    const shouldFetchRent = !typedFilters.paymentType || typedFilters.paymentType === 'all' || typedFilters.paymentType === 'rent';
    const shouldFetchHAP = !typedFilters.paymentType || typedFilters.paymentType === 'all' || typedFilters.paymentType === 'hap';

    let allPayments: any[] = [];

    // Fetch rent payments
    if (shouldFetchRent) {
      let rentQuery = supabase
        .from('rent_payments')
        .select(`
          id,
          payment_date,
          amount,
          status,
          due_date,
          paid_at,
          payment_method,
          stripe_payment_intent_id,
          plaid_transaction_id,
          property_id,
          tenant_id,
          tenant_name,
          unit_id,
          created_at,
          properties (
            id,
            address
          ),
          property_units!rent_payments_unit_id_fkey (
            unit_number,
            unit_name
          ),
          profiles!rent_payments_tenant_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .in('property_id', propertyIds);

      if (typedFilters.status) {
        rentQuery = rentQuery.eq('status', typedFilters.status);
      }
      if (typedFilters.propertyId) {
        rentQuery = rentQuery.eq('property_id', typedFilters.propertyId);
      }
      if (typedFilters.unitId) {
        rentQuery = rentQuery.eq('unit_id', typedFilters.unitId);
      }
      if (typedFilters.dateFrom) {
        rentQuery = rentQuery.gte('payment_date', typedFilters.dateFrom);
      }
      if (typedFilters.dateTo) {
        rentQuery = rentQuery.lte('payment_date', typedFilters.dateTo);
      }

      rentQuery = rentQuery.order('payment_date', { ascending: false });

      const { data: rentPayments, error: rentError } = await rentQuery;
      if (rentError) throw rentError;

      // Fetch Plaid transactions for rent payment display_name lookup
      const rentPlaidIds = (rentPayments || [])
        .map(p => p.plaid_transaction_id)
        .filter(Boolean);

      let rentPlaidTxnMap = new Map<string, { display_name: string | null; description: string | null; merchant_name: string | null }>();
      if (rentPlaidIds.length > 0) {
        const { data: rentPlaidTxns } = await supabase
          .from('landlord_plaid_transactions')
          .select('plaid_transaction_id, display_name, description, merchant_name')
          .in('plaid_transaction_id', rentPlaidIds);
        
        rentPlaidTxns?.forEach(txn => {
          rentPlaidTxnMap.set(txn.plaid_transaction_id, {
            display_name: txn.display_name,
            description: txn.description,
            merchant_name: txn.merchant_name
          });
        });
      }

      const normalizedRentPayments = (rentPayments || [])
        .map((payment: any) => {
          // Compute display status - filters out pre-due-date pending payments
          const displayStatus = getDisplayStatus({
            status: payment.status,
            due_date: payment.due_date,
            paid_at: payment.paid_at
          });
          
          // Skip payments that shouldn't be shown (pending before due date)
          if (!displayStatus) return null;
          
          // Determine payment source display
          let paymentSource = 'Unknown';
          
          // Stripe payments - clean display
          if (payment.payment_method === 'stripe' || payment.stripe_payment_intent_id) {
            paymentSource = 'Stripe';
          }
          // Plaid tagged payments - show "Tenant - Tagged from bank - [display_name]"
          else if (payment.plaid_transaction_id) {
            const txn = rentPlaidTxnMap.get(payment.plaid_transaction_id);
            const displayName = txn?.display_name || txn?.description || txn?.merchant_name;
            if (displayName) {
              paymentSource = `Tenant - Tagged from bank - ${displayName}`;
            } else {
              paymentSource = 'Tenant - Tagged from bank';
            }
          }
          // Fallback
          else if (payment.payment_method) {
            paymentSource = payment.payment_method;
          }

          // Prioritize stored tenant_name, fall back to joined profiles
          const resolvedTenantName = payment.tenant_name
            || (payment.profiles 
                ? `${payment.profiles.first_name || ''} ${payment.profiles.last_name || ''}`.trim() 
                : null)
            || 'N/A';

          return {
            id: payment.id,
            payment_date: payment.payment_date,
            property_id: payment.property_id,
            property_address: payment.properties?.address || 'N/A',
            unit_id: payment.unit_id,
            unit_number: payment.property_units?.unit_number,
            unit_name: payment.property_units?.unit_name,
            tenant_id: payment.tenant_id,
            tenant_name: resolvedTenantName,
            amount: payment.amount,
            payment_type: 'tenant_rent' as const,
            payment_source: paymentSource,
            status: displayStatus, // Use computed display status
            reference_number: payment.stripe_payment_intent_id || payment.id,
            created_at: payment.created_at
          };
        })
        .filter(Boolean); // Remove null entries (filtered out payments)

      allPayments = [...allPayments, ...normalizedRentPayments];
    }

    // Fetch HAP payments - must query by both property_id OR unit_id
    // because HAP payments with unit_id have property_id = NULL (DB constraint)
    if (shouldFetchHAP) {
      let hapQuery = supabase
        .from('hap_payments')
        .select(`
          id,
          payment_date,
          actual_amount,
          payment_status,
          pha_voucher_number,
          property_id,
          tenant_id,
          tenant_name,
          unit_id,
          created_at,
          notes,
          plaid_transaction_id,
          properties (
            id,
            address
          ),
          property_units!hap_payments_unit_id_fkey (
            unit_number,
            unit_name,
            property_id,
            tenant_id,
            profiles:tenant_id (
              id,
              first_name,
              last_name
            )
          ),
          profiles!hap_payments_tenant_id_fkey (
            id,
            first_name,
            last_name
          )
        `);

      // SIMPLIFIED HAP QUERY LOGIC:
      // Priority: unitId > propertyId > base landlord access
      // Only ONE filter applied to avoid complex AND/OR chains
      if (typedFilters.unitId) {
        // When filtering by specific unit, just use that directly
        console.log('HAP query: filtering by unitId:', typedFilters.unitId);
        hapQuery = hapQuery.eq('unit_id', typedFilters.unitId);
      } else if (typedFilters.propertyId) {
        // When filtering by property, use OR for property_id or unit's property
        console.log('HAP query: filtering by propertyId:', typedFilters.propertyId);
        const { data: filteredPropertyUnits } = await supabase
          .from('property_units')
          .select('id')
          .eq('property_id', typedFilters.propertyId);
        const filteredUnitIds = filteredPropertyUnits?.map(u => u.id) || [];
        
        if (filteredUnitIds.length > 0) {
          hapQuery = hapQuery.or(`property_id.eq.${typedFilters.propertyId},unit_id.in.(${filteredUnitIds.join(',')})`);
        } else {
          hapQuery = hapQuery.eq('property_id', typedFilters.propertyId);
        }
      } else {
        // Base landlord access filter - all properties/units owned
        console.log('HAP query: base landlord access filter');
        hapQuery = hapQuery.or(`property_id.in.(${propertyIds.join(',')}),unit_id.in.(${unitIds.join(',')})`);
      }

      if (typedFilters.status) {
        hapQuery = hapQuery.eq('payment_status', typedFilters.status);
      }
      if (typedFilters.dateFrom) {
        hapQuery = hapQuery.gte('payment_date', typedFilters.dateFrom);
      }
      if (typedFilters.dateTo) {
        hapQuery = hapQuery.lte('payment_date', typedFilters.dateTo);
      }

      hapQuery = hapQuery.order('payment_date', { ascending: false });

      const { data: hapPayments, error: hapError } = await hapQuery;
      if (hapError) throw hapError;

      // Fetch Plaid transactions for display_name lookup (batch fetch for efficiency)
      const plaidTransactionIds = (hapPayments || [])
        .map(p => p.plaid_transaction_id)
        .filter(Boolean);
      
      let plaidTxnMap = new Map<string, { display_name: string | null; description: string | null; merchant_name: string | null }>();
      if (plaidTransactionIds.length > 0) {
        const { data: plaidTxns } = await supabase
          .from('landlord_plaid_transactions')
          .select('plaid_transaction_id, display_name, description, merchant_name')
          .in('plaid_transaction_id', plaidTransactionIds);
        
        plaidTxns?.forEach(txn => {
          plaidTxnMap.set(txn.plaid_transaction_id, {
            display_name: txn.display_name,
            description: txn.description,
            merchant_name: txn.merchant_name
          });
        });
      }

      const normalizedHAPPayments = (hapPayments || []).map((payment: any) => {
        // HAP payments should never show as "late" - map to more appropriate statuses
        let status = payment.payment_status || 'pending';
        if (status === 'expected') status = 'pending';
        if (status === 'late') status = 'delayed';
        
        // Determine payment source display - prioritize display_name from linked transaction
        let paymentSource = 'HAP';
        const isPlaidMatched = !!payment.plaid_transaction_id;
        
        if (isPlaidMatched) {
          const txn = plaidTxnMap.get(payment.plaid_transaction_id);
          const txnDescription = txn?.display_name || txn?.description || txn?.merchant_name;
          if (txnDescription) {
            paymentSource = `HAP - Tagged from bank - ${txnDescription}`;
          } else if (payment.notes) {
            paymentSource = `HAP - Tagged from bank - ${payment.notes}`;
          } else {
            paymentSource = 'HAP - Tagged from bank';
          }
        }

        // For HAP payments with unit_id but no property_id, get address from map lookup
        const resolvedPropertyId = payment.property_id || payment.property_units?.property_id;
        const propertyAddress = payment.properties?.address 
          || (resolvedPropertyId ? propertyAddressMap.get(resolvedPropertyId) : null)
          || 'Unknown Property';
        
        // Prioritize stored tenant_name, fall back to joined profiles
        const resolvedTenantName = payment.tenant_name
          || (payment.profiles 
              ? `${payment.profiles.first_name || ''} ${payment.profiles.last_name || ''}`.trim() 
              : null)
          || (payment.property_units?.profiles 
              ? `${payment.property_units.profiles.first_name || ''} ${payment.property_units.profiles.last_name || ''}`.trim() 
              : null)
          || 'N/A';

        return {
          id: payment.id,
          payment_date: payment.payment_date,
          property_id: payment.property_id || payment.property_units?.property_id,
          property_address: propertyAddress,
          unit_id: payment.unit_id,
          unit_number: payment.property_units?.unit_number,
          unit_name: payment.property_units?.unit_name,
          tenant_id: payment.tenant_id,
          tenant_name: resolvedTenantName,
          amount: payment.actual_amount,
          payment_type: 'hap_voucher' as const,
          payment_source: paymentSource,
          status,
          reference_number: payment.pha_voucher_number || payment.id,
          created_at: payment.created_at,
          is_plaid_matched: isPlaidMatched
        };
      });

      allPayments = [...allPayments, ...normalizedHAPPayments];
    }

    // Sort by payment_date descending
    allPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    // Apply search filter
    if (typedFilters.searchTerm) {
      const searchLower = typedFilters.searchTerm.toLowerCase();
      allPayments = allPayments.filter((payment: any) =>
        payment.tenant_name.toLowerCase().includes(searchLower) ||
        payment.property_address.toLowerCase().includes(searchLower) ||
        payment.reference_number.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const limit = typedFilters.limit || 50;
    const offset = typedFilters.offset || 0;
    const paginatedPayments = allPayments.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({ payments: paginatedPayments, count: allPayments.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in landlord-all-payments:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
