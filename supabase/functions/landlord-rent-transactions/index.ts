import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RentPaymentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentSource?: string;
  propertyId?: string;
  unitId?: string;
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
    const requestedLandlordId = landlordId || user.id;
    
    if (requestedLandlordId !== user.id) {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
      if (!isAdmin) {
        console.error('❌ Authorization denied: user', user.id, 'tried to access landlord', requestedLandlordId);
        return new Response(
          JSON.stringify({ error: 'Forbidden - Cannot access other landlord data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const targetLandlordId = landlordId || user.id;

    console.log('🏠 Fetching rent transactions for landlord:', targetLandlordId, 'portfolioId:', portfolioId);

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
            totalCollected: 0,
            totalCollectedThisMonth: 0,
            pendingPayments: 0,
            failedPayments: 0,
            totalTransactions: 0,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payments } = await supabase
        .from('rent_payments')
        .select('amount, status, created_at')
        .in('property_id', propertyIds);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalCollected = payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalCollectedThisMonth = payments?.filter(p => 
        p.status === 'completed' && new Date(p.created_at) >= firstDayOfMonth
      ).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      const failedPayments = payments?.filter(p => p.status === 'failed').length || 0;

      return new Response(JSON.stringify({
        summary: {
          totalCollected,
          totalCollectedThisMonth,
          pendingPayments,
          failedPayments,
          totalTransactions: payments?.length || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch payment transactions with filters
    const cleanFilters: RentPaymentFilters = filters || {};
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

    // Build query for rent payments
    let query = supabase
      .from('rent_payments')
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

    if (cleanFilters.paymentSource) {
      query = query.eq('payment_source', cleanFilters.paymentSource);
    }

    if (cleanFilters.propertyId) {
      query = query.eq('property_id', cleanFilters.propertyId);
    }

    if (cleanFilters.unitId) {
      query = query.eq('unit_id', cleanFilters.unitId);
    }

    if (cleanFilters.dateFrom) {
      query = query.gte('created_at', cleanFilters.dateFrom);
    }

    if (cleanFilters.dateTo) {
      query = query.lte('created_at', cleanFilters.dateTo);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching rent payments:', error);
      throw error;
    }

    // Apply search filter on the client side
    let filteredPayments = payments || [];
    if (cleanFilters.searchTerm) {
      const searchLower = cleanFilters.searchTerm.toLowerCase();
      filteredPayments = filteredPayments.filter((p: any) =>
        p.properties?.address?.toLowerCase().includes(searchLower) ||
        p.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        p.id?.toLowerCase().includes(searchLower)
      );
    }

    return new Response(JSON.stringify({
      payments: filteredPayments,
      summary: {
        totalShown: filteredPayments.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in landlord-rent-transactions:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
