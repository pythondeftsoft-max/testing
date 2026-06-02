import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Extract user ID from JWT (already verified by verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode JWT to get user ID (JWT already verified by Supabase)
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    console.log('Auth check - User ID from JWT:', userId);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    console.log('Auth check - User type:', profile?.user_type);
    console.log('Auth check - Profile error:', profileError);

    if (!profile || profile?.user_type !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { filters, statsOnly } = await req.json();

    // If statsOnly, return summary statistics
    if (statsOnly) {
      const { data: hapPayments, error: statsError } = await supabase
        .from('hap_payments')
        .select('expected_amount, actual_amount, payment_status, is_verified, payment_date');

      if (statsError) throw statsError;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalExpected = hapPayments?.reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0;
      const totalReceived = hapPayments?.reduce((sum, p) => sum + (p.actual_amount || 0), 0) || 0;
      const thisMonthPayments = hapPayments?.filter(p => new Date(p.payment_date) >= firstDayOfMonth) || [];
      const thisMonthExpected = thisMonthPayments.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
      const thisMonthReceived = thisMonthPayments.reduce((sum, p) => sum + (p.actual_amount || 0), 0);
      const verified = hapPayments?.filter(p => p.is_verified === true).length || 0;

      return new Response(
        JSON.stringify({
          totalExpected,
          totalReceived,
          thisMonthExpected,
          thisMonthReceived,
          totalPayments: hapPayments?.length || 0,
          verifiedCount: verified,
          verificationRate: hapPayments?.length ? (verified / hapPayments.length) * 100 : 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for HAP payments
    let query = supabase
      .from('hap_payments')
      .select(`
        *,
        property:properties(
          id,
          address,
          city,
          state,
          zipcode,
          owner:profiles!properties_owner_id_fkey(first_name, last_name, email)
        ),
        unit:property_units(unit_number),
        tenant:profiles!hap_payments_tenant_id_fkey(first_name, last_name, email)
      `)
      .order('payment_date', { ascending: false });

    // Apply filters
    if (filters?.dateFrom) {
      query = query.gte('payment_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('payment_date', filters.dateTo);
    }
    if (filters?.status) {
      query = query.eq('payment_status', filters.status);
    }
    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) throw paymentsError;

    // For unit-level HAP payments (property_id is NULL), we need to look up property via unit
    // Collect unit_ids that need property lookup
    const unitIdsNeedingLookup = payments
      ?.filter(p => !p.property_id && p.unit_id)
      .map(p => p.unit_id) || [];

    // Fetch property data for unit-level payments
    let unitPropertyMap: Record<string, any> = {};
    if (unitIdsNeedingLookup.length > 0) {
      const { data: unitProperties } = await supabase
        .from('property_units')
        .select(`
          id,
          property:properties(
            id,
            address,
            city,
            state,
            zipcode,
            owner_id,
            owner:profiles!properties_owner_id_fkey(first_name, last_name, email)
          )
        `)
        .in('id', unitIdsNeedingLookup);

      if (unitProperties) {
        unitProperties.forEach(up => {
          unitPropertyMap[up.id] = up.property;
        });
      }
    }

    // Fetch Plaid transaction display names for matched payments
    const plaidTransactionIds = payments
      ?.filter(p => p.plaid_transaction_id)
      .map(p => p.plaid_transaction_id) || [];
    
    let plaidDisplayNameMap: Record<string, string> = {};
    if (plaidTransactionIds.length > 0) {
      const { data: plaidTransactions } = await supabase
        .from('landlord_plaid_transactions')
        .select('id, display_name, description, merchant_name')
        .in('id', plaidTransactionIds);

      if (plaidTransactions) {
        plaidTransactions.forEach(pt => {
          // Use custom display_name first, then fall back to description or merchant_name
          plaidDisplayNameMap[pt.id] = pt.display_name || pt.description || pt.merchant_name || 'Bank Deposit';
        });
      }
    }

    // Transform payments to flatten nested data
    const transformedPayments = payments?.map(p => {
      // Use direct property data, or look up via unit if property_id is NULL
      const propertyData = p.property || unitPropertyMap[p.unit_id] || null;
      
      // Determine actual status based on payment state
      let calculatedStatus = p.payment_status || 'pending';
      if (p.is_verified) {
        calculatedStatus = 'verified';
      } else if (p.matched_via_plaid) {
        calculatedStatus = 'received';
      }
      
      // Determine display name - use actual Plaid display_name if available
      let displayName = 'HAP Payment';
      if (p.plaid_transaction_id && plaidDisplayNameMap[p.plaid_transaction_id]) {
        displayName = plaidDisplayNameMap[p.plaid_transaction_id];
      } else if (p.payment_source) {
        displayName = `HAP - ${p.payment_source}`;
      }
      
      // Determine source type for admin display
      let sourceType = 'Manual';
      if (p.matched_via_plaid || p.plaid_transaction_id) {
        sourceType = 'Plaid Tracked';
      }
      
      return {
        ...p,
        // Source type for admin view
        source_type: sourceType,
        // Use actual_amount as the primary amount for display
        amount: p.actual_amount || p.expected_amount || 0,
        // Flatten property data
        property_address: propertyData?.address || 'Unknown',
        property_city: propertyData?.city || '',
        property_state: propertyData?.state || '',
        property_zipcode: propertyData?.zipcode || '',
        // Flatten tenant data
        tenant_name: p.tenant ? `${p.tenant.first_name || ''} ${p.tenant.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        tenant_email: p.tenant?.email || '',
        // Flatten landlord data (owner of property)
        landlord_name: propertyData?.owner ? `${propertyData.owner.first_name || ''} ${propertyData.owner.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        landlord_email: propertyData?.owner?.email || '',
        landlord_id: propertyData?.owner_id || null,
        // Flatten unit data
        unit_number: p.unit?.unit_number || '',
        // Calculated fields
        status: calculatedStatus,
        display_name: displayName,
      };
    }) || [];

    // Calculate summary for filtered results
    const filteredExpected = transformedPayments.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
    const filteredReceived = transformedPayments.reduce((sum, p) => sum + (p.actual_amount || 0), 0);
    const filteredVerified = transformedPayments.filter(p => p.is_verified === true).length;

    return new Response(
      JSON.stringify({
        payments: transformedPayments,
        summary: {
          totalShown: transformedPayments.length,
          totalExpected: filteredExpected,
          totalReceived: filteredReceived,
          verifiedCount: filteredVerified,
          verificationRate: transformedPayments.length ? (filteredVerified / transformedPayments.length) * 100 : 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-hap-transactions:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
