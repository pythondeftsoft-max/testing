import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyOwner } from '../_shared/notify-owner.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch property details
    const { data: property } = await supabase
      .from('properties')
      .select('address, city, state, monthly_rent')
      .eq('id', record.property_id)
      .single();

    // Fetch tenant name
    const { data: tenant } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', record.tenant_id)
      .single();

    // Fetch unit if applicable
    let unitInfo = '';
    if (record.unit_id) {
      const { data: unit } = await supabase
        .from('property_units')
        .select('unit_number, monthly_rent')
        .eq('id', record.unit_id)
        .single();
      if (unit) {
        unitInfo = unit.unit_number ? ` — Unit ${unit.unit_number}` : '';
        // Unit rent overrides property rent
        if (unit.monthly_rent) {
          (property as any)._unitRent = unit.monthly_rent;
        }
      }
    }

    const tenantName = tenant
      ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim()
      : 'Unknown tenant';

    const addr = property
      ? `${property.address}, ${property.city}, ${property.state}`
      : 'Unknown property';

    const rent = (property as any)?._unitRent || property?.monthly_rent;
    const rentStr = rent ? `$${Number(rent).toLocaleString()}/mo` : 'N/A';

    await notifyOwner({
      subject: `🏠 New Push`,
      body: [
        `${addr}${unitInfo}`,
        `Rent: ${rentStr}`,
        `→ Pushed to ${tenantName}`,
      ].join('\n'),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify-push] Error:', err);
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
