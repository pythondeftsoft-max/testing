import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body?.session_id;
    const placementFeeId: string | undefined = body?.placement_fee_id;

    if (!sessionId && !placementFeeId) {
      return new Response(
        JSON.stringify({ success: false, error: 'session_id or placement_fee_id required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase
      .from('landlord_placement_fees')
      .select('id, fee_amount, payment_status, payment_date, property_id, tenant_id, stripe_session_id');

    if (sessionId) query = query.eq('stripe_session_id', sessionId);
    else if (placementFeeId) query = query.eq('id', placementFeeId);

    const { data: fee, error } = await query.maybeSingle();

    if (error) {
      console.error('Query error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fee) {
      return new Response(
        JSON.stringify({ success: true, paid: false, found: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paid = fee.payment_status === 'paid';

    // Fetch property + tenant context for the receipt
    let propertyAddress: string | null = null;
    let tenantName: string | null = null;

    if (fee.property_id) {
      const { data: prop } = await supabase
        .from('portfolio_assets')
        .select('asset_name, address')
        .eq('id', fee.property_id)
        .maybeSingle();
      propertyAddress = prop?.address || prop?.asset_name || null;
    }

    if (fee.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('first_name, last_name')
        .eq('id', fee.tenant_id)
        .maybeSingle();
      if (tenant) {
        tenantName = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') || null;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paid,
        found: true,
        placement_fee_id: fee.id,
        amount: fee.fee_amount,
        payment_date: fee.payment_date,
        property_address: propertyAddress,
        tenant_name: tenantName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('confirm-placement-fee-payment error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
