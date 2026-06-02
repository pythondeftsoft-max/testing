import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * notify-caseworker-on-marketplace-lease
 *
 * MARKETPLACE MESH LAYER — read-only signal flowing INTO the agency portal.
 *
 * Triggered when a tenant on an agency caseload signs a lease via the
 * OpenKey marketplace. Sends an in-app + email alert to the assigned
 * caseworker so they can fast-track the RFTA paperwork.
 *
 * Does NOT modify marketplace tables, lease records, or placement flow.
 *
 * Request body:
 *   { lease_id?: string, tenant_id: string }
 * Either is acceptable; if only tenant_id is given we'll find the most recent lease.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { lease_id, tenant_id } = body as { lease_id?: string; tenant_id?: string };

    if (!tenant_id && !lease_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenant_id or lease_id required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Resolve lease + tenant
    let lease: any = null;
    if (lease_id) {
      const { data } = await supabase
        .from('tenant_leases')
        .select('id, tenant_id, property_id, unit_id, lease_start, monthly_rent')
        .eq('id', lease_id)
        .maybeSingle();
      lease = data;
    } else if (tenant_id) {
      const { data } = await supabase
        .from('tenant_leases')
        .select('id, tenant_id, property_id, unit_id, lease_start, monthly_rent')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      lease = data;
    }

    if (!lease) {
      return new Response(
        JSON.stringify({ success: false, error: 'lease not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = lease.tenant_id;

    // 2. Find any active caseworker assignment for this tenant
    const { data: assignments } = await supabase
      .from('caseworker_assignments')
      .select('caseworker_id, agency_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (!assignments || assignments.length === 0) {
      // Tenant is not on any agency caseload — nothing to do.
      return new Response(
        JSON.stringify({ success: true, notified: 0, reason: 'no caseworker assignment' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Lookup tenant + property details for the message
    const [{ data: tenantProfile }, { data: property }] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', tenantId)
        .maybeSingle(),
      lease.property_id
        ? supabase
            .from('properties')
            .select('address, city, state')
            .eq('id', lease.property_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const tenantName =
      [tenantProfile?.first_name, tenantProfile?.last_name].filter(Boolean).join(' ').trim() ||
      tenantProfile?.email ||
      'Your tenant';

    const propLabel = property
      ? `${property.address || ''}${property.city ? `, ${property.city}` : ''}${property.state ? `, ${property.state}` : ''}`.trim()
      : 'a marketplace unit';

    const subject = `Marketplace lease signed: ${tenantName}`;
    const bodyText = `${tenantName} just signed a lease via the OpenKey marketplace at ${propLabel}.\n\nThis is a tenant on your caseload. Consider initiating the RFTA / HAP paperwork now to fast-track move-in.`;

    let notified = 0;

    // 4. For each caseworker, send in-app + email alert
    for (const assignment of assignments) {
      // Resolve caseworker user_id from agency_staff
      const { data: staff } = await supabase
        .from('agency_staff')
        .select('user_id')
        .eq('id', assignment.caseworker_id)
        .maybeSingle();

      const caseworkerUserId = (staff as any)?.user_id;
      if (!caseworkerUserId) continue;

      // In-app message via agency_messages
      await supabase.from('agency_messages').insert({
        agency_id: assignment.agency_id,
        sender_id: assignment.agency_id,
        sender_type: 'system',
        recipient_id: caseworkerUserId,
        recipient_type: 'staff',
        subject,
        body: bodyText,
        linked_entity_type: 'tenant_lease',
        linked_entity_id: lease.id,
      });

      // Email via existing email_queue
      const { data: cwProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', caseworkerUserId)
        .maybeSingle();

      if (cwProfile?.email) {
        await supabase.from('email_queue').insert({
          user_id: caseworkerUserId,
          subject,
          body: bodyText,
          to_email: cwProfile.email,
          status: 'pending',
          template_slug: 'marketplace_lease_caseworker_alert',
          category: 'agency_mesh',
          metadata: {
            agency_id: assignment.agency_id,
            tenant_id: tenantId,
            lease_id: lease.id,
            property_id: lease.property_id,
          },
        });
      }

      notified++;
    }

    return new Response(
      JSON.stringify({ success: true, notified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('notify-caseworker-on-marketplace-lease error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
