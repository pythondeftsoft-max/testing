import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { batch_id } = await req.json();
    if (!batch_id) return json({ success: false, error: 'batch_id required' });

    const { data: batch } = await sb
      .from('hap_payment_batches')
      .select('id, agency_id, period_month, batch_number, landlord_notifications_sent_at')
      .eq('id', batch_id)
      .maybeSingle();
    if (!batch) return json({ success: false, error: 'batch not found' });
    if (batch.landlord_notifications_sent_at) {
      return json({ success: true, skipped: true, reason: 'already notified' });
    }

    const { data: agency } = await sb
      .from('housing_authorities')
      .select('name')
      .eq('id', batch.agency_id)
      .maybeSingle();
    const agencyName = agency?.name || 'Your housing authority';

    const { data: disbursements } = await sb
      .from('hap_disbursements')
      .select('landlord_id, amount, rail, status')
      .eq('batch_id', batch_id);

    // Group by landlord
    const grouped = new Map<string, { amount: number; rail: string }>();
    for (const d of (disbursements || [])) {
      if (!d.landlord_id) continue;
      const g = grouped.get(d.landlord_id) || { amount: 0, rail: d.rail || 'manual' };
      g.amount += Number(d.amount || 0);
      grouped.set(d.landlord_id, g);
    }

    if (grouped.size === 0) return json({ success: true, sent: 0, skipped: true });

    const ids = Array.from(grouped.keys());
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, business_name, email')
      .in('id', ids);

    const periodLabel = new Date(batch.period_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const link = `/landlord/payments`;

    let sent = 0;
    for (const [landlordId, g] of grouped.entries()) {
      const p = (profiles || []).find((x: any) => x.id === landlordId);
      const displayName = p?.business_name || p?.full_name || 'Landlord';
      const railLabel =
        g.rail === 'nacha' ? 'ACH (NACHA)' :
        g.rail === 'checkbook' ? 'Checkbook (digital check / virtual card)' :
        g.rail === 'ap_export' ? 'AP export (handled by your accounting team)' :
        'Manual';

      const title = `HAP payment ${fmtMoney(g.amount)} sent for ${periodLabel}`;
      const body =
        `${agencyName} has disbursed your ${periodLabel} HAP payment of ${fmtMoney(g.amount)} via ${railLabel}. ` +
        `Funds typically settle within 1–3 business days for ACH and 3–7 days for digital checks.`;

      // In-app notification
      await sb.from('notifications').insert({
        user_id: landlordId,
        title,
        description: body,
        type: 'payment',
        category: 'finance',
        priority: 'normal',
        link,
        related_entity_type: 'hap_payment_batch',
        related_entity_id: batch_id,
        action_type: 'view',
        metadata: { batch_id, batch_number: batch.batch_number, amount: g.amount, rail: g.rail },
      });

      // Email queue
      if (p?.email) {
        await sb.from('email_queue').insert({
          to_email: p.email,
          user_id: landlordId,
          subject: title,
          body,
          link,
          email_type: 'transactional',
          template_slug: 'landlord_hap_disbursed',
          category: 'payments',
          status: 'pending',
          metadata: {
            batch_id,
            batch_number: batch.batch_number,
            agency_id: batch.agency_id,
            agency_name: agencyName,
            amount: g.amount,
            rail: g.rail,
            period_month: batch.period_month,
            display_name: displayName,
          },
        });
      }
      sent++;
    }

    await sb
      .from('hap_payment_batches')
      .update({
        landlord_notifications_sent_at: new Date().toISOString(),
        landlord_notifications_count: sent,
      })
      .eq('id', batch_id);

    return json({ success: true, sent });
  } catch (e) {
    return json({ success: false, error: String(e) });
  }
});
