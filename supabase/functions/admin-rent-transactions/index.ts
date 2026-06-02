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
      const { data: stats, error: statsError } = await supabase
        .from('rent_payments')
        .select('amount, platform_fee_amount, tenant_fee_amount, net_amount_to_pm, status, payment_date');

      if (statsError) throw statsError;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalCollected = stats?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalPlatformFees = stats?.reduce((sum, p) => sum + (p.platform_fee_amount || 0), 0) || 0;
      const thisMonthPayments = stats?.filter(p => new Date(p.payment_date) >= firstDayOfMonth) || [];
      const thisMonthCollected = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const thisMonthFees = thisMonthPayments.reduce((sum, p) => sum + (p.platform_fee_amount || 0), 0);

      return new Response(
        JSON.stringify({
          totalCollected,
          totalPlatformFees,
          thisMonthCollected,
          thisMonthFees,
          totalTransactions: stats?.length || 0,
          thisMonthTransactions: thisMonthPayments.length,
          averageTransaction: totalCollected / (stats?.length || 1),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for payments
    let query = supabase
      .from('rent_payments')
      .select(`
        *,
        property:properties(
          id,
          address,
          city,
          state,
          zipcode,
          owner_id,
          owner:profiles!properties_owner_id_fkey(first_name, last_name, email)
        ),
        unit:property_units(unit_number),
        tenant:profiles!rent_payments_tenant_id_fkey(first_name, last_name, email)
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
      query = query.eq('status', filters.status);
    }
    if (filters?.paymentSource) {
      query = query.eq('payment_source', filters.paymentSource);
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

    // Fetch Plaid display names through plaid_split_id chain for tagged payments
    const splitIds = payments?.filter(p => p.plaid_split_id).map(p => p.plaid_split_id) || [];
    let plaidDisplayNameMap: Record<string, string> = {};
    
    if (splitIds.length > 0) {
      // Get landlord_payment_splits with transaction_id
      const { data: splits } = await supabase
        .from('landlord_payment_splits')
        .select('id, transaction_id')
        .in('id', splitIds);
      
      if (splits && splits.length > 0) {
        // Get transaction display names
        const transactionIds = splits.filter(s => s.transaction_id).map(s => s.transaction_id);
        if (transactionIds.length > 0) {
          const { data: transactions } = await supabase
            .from('landlord_plaid_transactions')
            .select('id, display_name, description, merchant_name')
            .in('id', transactionIds);
          
          // Build split_id → display_name map
          if (transactions) {
            splits.forEach(split => {
              const tx = transactions.find(t => t.id === split.transaction_id);
              if (tx) {
                plaidDisplayNameMap[split.id] = tx.display_name || tx.description || tx.merchant_name || 'Bank Deposit';
              }
            });
          }
        }
      }
    }

    // Transform payments to flatten nested data for the component
    const transformedPayments = payments?.map(p => {
      // Determine actual status - prioritize matched_via_plaid
      let calculatedStatus = 'pending';
      if (p.matched_via_plaid) {
        calculatedStatus = 'received';  // Tagged from bank = received
      } else if (p.paid_at) {
        calculatedStatus = 'paid';      // Stripe confirmed
      } else if (p.stripe_payment_intent_id && !p.paid_at) {
        calculatedStatus = 'pending';   // Stripe in progress
      } else if (p.status) {
        calculatedStatus = p.status;    // Use DB status as fallback
      }
      
      // Determine display name - use actual Plaid display_name if available
      let displayName = 'Manual Entry';
      if (p.payment_source === 'stripe' || p.stripe_payment_intent_id) {
        displayName = 'Stripe';
      } else if (p.plaid_split_id && plaidDisplayNameMap[p.plaid_split_id]) {
        // Tagged via split - get actual display_name from Plaid transaction
        displayName = plaidDisplayNameMap[p.plaid_split_id];
      } else if (p.matched_via_plaid) {
        displayName = 'Tagged - Bank Deposit';
      } else if (p.payment_source) {
        displayName = p.payment_source;
      }
      
      // Determine source type for admin display
      let sourceType = 'Manual';
      if (p.payment_source === 'stripe' || p.stripe_payment_intent_id || p.payment_method === 'stripe_checkout' || p.payment_method === 'stripe') {
        sourceType = 'Stripe';
      } else if (p.matched_via_plaid || p.plaid_split_id) {
        sourceType = 'Plaid Tracked';
      }
      
      return {
        ...p,
        // Source type for admin view
        source_type: sourceType,
        // Flatten property data
        property_address: p.property?.address || 'Unknown',
        property_city: p.property?.city || '',
        property_state: p.property?.state || '',
        property_zipcode: p.property?.zipcode || '',
        // Flatten tenant data
        tenant_name: p.tenant ? `${p.tenant.first_name || ''} ${p.tenant.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        tenant_email: p.tenant?.email || '',
        // Flatten landlord data (owner of property)
        landlord_name: p.property?.owner ? `${p.property.owner.first_name || ''} ${p.property.owner.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        landlord_email: p.property?.owner?.email || '',
        landlord_id: p.property?.owner_id || null,
        // Flatten unit data
        unit_number: p.unit?.unit_number || '',
        // Calculated fields
        status: calculatedStatus,
        display_name: displayName,
      };
    }) || [];

    // Calculate summary for filtered results
    const filteredTotal = transformedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const filteredFees = transformedPayments.reduce((sum, p) => sum + (p.platform_fee_amount || 0), 0);
    const filteredNet = transformedPayments.reduce((sum, p) => sum + (p.net_amount_to_pm || 0), 0);

    return new Response(
      JSON.stringify({
        payments: transformedPayments,
        summary: {
          totalShown: transformedPayments.length,
          totalAmount: filteredTotal,
          platformFees: filteredFees,
          netToLandlords: filteredNet,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-rent-transactions:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
