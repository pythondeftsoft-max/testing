import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HAPPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  propertyId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filters, statsOnly, landlordId, portfolioId } = await req.json();
    
    // ===== AUTHORIZATION CHECK =====
    const targetLandlordId = landlordId || user.id;
    
    if (targetLandlordId !== user.id) {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!isAdmin) {
        console.error('❌ Authorization denied: user', user.id, 'tried to access landlord', targetLandlordId);
        return new Response(
          JSON.stringify({ error: 'Forbidden - Cannot access other landlord data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🏛️ ✅ Authorized - Fetching HAP transactions for landlord:', targetLandlordId, 'portfolioId:', portfolioId);

    if (statsOnly) {
      // Fetch summary statistics
      let propertyQuery = supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', targetLandlordId);

      if (portfolioId && portfolioId !== 'everything') {
        propertyQuery = propertyQuery.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await propertyQuery;
      const propertyIds = properties?.map(p => p.id) || [];

      if (propertyIds.length === 0) {
        return new Response(JSON.stringify({
          summary: {
            totalHAPReceived: 0,
            totalHAPReceivedThisMonth: 0,
            pendingHAP: 0,
            lateHAP: 0,
            propertiesWithHAP: 0,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payments } = await supabase
        .from('hap_payments')
        .select('hap_amount, status, created_at, property_id')
        .in('property_id', propertyIds);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalHAPReceived = payments?.filter(p => p.status === 'received').reduce((sum, p) => sum + (p.hap_amount || 0), 0) || 0;
      const totalHAPReceivedThisMonth = payments?.filter(p => 
        p.status === 'received' && new Date(p.created_at) >= firstDayOfMonth
      ).reduce((sum, p) => sum + (p.hap_amount || 0), 0) || 0;
      const pendingHAP = payments?.filter(p => p.status === 'pending').length || 0;
      const lateHAP = payments?.filter(p => p.status === 'late').length || 0;
      const uniquePropertyIds = new Set(payments?.map(p => p.property_id) || []);

      // YTD paid via disbursement ledger (authoritative source for landlord earnings)
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const { data: ytdRows } = await supabase
        .from('hap_disbursements')
        .select('amount')
        .eq('landlord_id', targetLandlordId)
        .eq('status', 'paid')
        .gte('paid_at', yearStart);
      const paidYtd = (ytdRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      return new Response(JSON.stringify({
        summary: {
          totalHAPReceived,
          totalHAPReceivedThisMonth,
          pendingHAP,
          lateHAP,
          propertiesWithHAP: uniquePropertyIds.size,
          paidYtd,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch HAP payment transactions with filters
    const cleanFilters: HAPPaymentFilters = filters || {};
    const limit = cleanFilters.limit || 50;
    const offset = cleanFilters.offset || 0;

    // First get landlord's properties
    let propertyQuery = supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', targetLandlordId);

    if (portfolioId && portfolioId !== 'everything') {
      propertyQuery = propertyQuery.eq('portfolio_id', portfolioId);
    }

    const { data: properties } = await propertyQuery;
    const propertyIds = properties?.map(p => p.id) || [];

    if (propertyIds.length === 0) {
      return new Response(JSON.stringify({
        payments: [],
        summary: { totalShown: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query for HAP payments
    let query = supabase
      .from('hap_payments')
      .select(`
        *,
        properties!inner(id, address),
        profiles!inner(id, full_name)
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (cleanFilters.status) {
      query = query.eq('status', cleanFilters.status);
    }

    if (cleanFilters.propertyId) {
      query = query.eq('property_id', cleanFilters.propertyId);
    }

    if (cleanFilters.dateFrom) {
      query = query.gte('created_at', cleanFilters.dateFrom);
    }

    if (cleanFilters.dateTo) {
      query = query.lte('created_at', cleanFilters.dateTo);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching HAP payments:', error);
      throw error;
    }

    // Apply search filter on the client side
    let filteredPayments = payments || [];
    if (cleanFilters.searchTerm) {
      const searchLower = cleanFilters.searchTerm.toLowerCase();
      filteredPayments = filteredPayments.filter((p: any) =>
        p.properties?.address?.toLowerCase().includes(searchLower) ||
        p.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        p.voucher_number?.toLowerCase().includes(searchLower) ||
        p.id?.toLowerCase().includes(searchLower)
      );
    }

    // Enrich with disbursement ledger data (rail, payment_method, reference, paid_at)
    const { data: disbursements } = await supabase
      .from('hap_disbursements')
      .select('id, landlord_id, unit_id, period_month, amount, rail, status, payment_method, reference_number, paid_at')
      .eq('landlord_id', targetLandlordId)
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(500);

    return new Response(JSON.stringify({
      payments: filteredPayments,
      disbursements: disbursements || [],
      summary: {
        totalShown: filteredPayments.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in landlord-hap-transactions:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
