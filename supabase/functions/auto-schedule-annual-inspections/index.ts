// Auto-schedules annual inspections 60 days before HAP contract anniversary.
// Creates one "scheduled" inspection per active HAP contract per year.
// Idempotent: skips contracts that already have a scheduled/completed annual inspection for the upcoming cycle.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find all active HAP contracts
    const { data: contracts, error } = await supabase
      .from('agency_hap_contracts')
      .select('id, agency_id, tenant_id, unit_id, property_address, effective_date')
      .eq('status', 'active')
      .not('effective_date', 'is', null);

    if (error) throw error;

    let created = 0;
    let skipped = 0;

    for (const c of contracts || []) {
      if (!c.effective_date) continue;
      const effective = new Date(c.effective_date);
      // Compute the next anniversary date in the future
      const thisYearAnniv = new Date(now.getFullYear(), effective.getMonth(), effective.getDate());
      let nextAnniv = thisYearAnniv;
      if (thisYearAnniv <= now) {
        nextAnniv = new Date(now.getFullYear() + 1, effective.getMonth(), effective.getDate());
      }
      const daysUntil = Math.ceil((nextAnniv.getTime() - now.getTime()) / 86400000);
      // Only schedule when anniversary is within 60 days
      if (daysUntil > 60 || daysUntil < 0) continue;

      // Skip if there's already an annual inspection scheduled or completed for this anniversary year
      const yearStart = new Date(nextAnniv.getFullYear(), 0, 1).toISOString();
      const yearEnd = new Date(nextAnniv.getFullYear() + 1, 0, 1).toISOString();
      const { data: existing } = await supabase
        .from('inspections')
        .select('id')
        .eq('hap_contract_id', c.id)
        .eq('inspection_type', 'annual')
        .gte('scheduled_date', yearStart)
        .lt('scheduled_date', yearEnd)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Schedule the inspection 14 days before the anniversary
      const scheduledFor = new Date(nextAnniv.getTime() - 14 * 86400000).toISOString();
      const { error: insErr } = await supabase
        .from('inspections')
        .insert({
          agency_id: c.agency_id,
          tenant_id: c.tenant_id,
          unit_id: c.unit_id,
          hap_contract_id: c.id,
          inspection_type: 'annual',
          status: 'scheduled',
          scheduled_date: scheduledFor,
          notes: `Auto-scheduled: HAP anniversary ${nextAnniv.toISOString().split('T')[0]}`,
        });
      if (!insErr) created++;
      else console.error('insert inspection error', insErr);
    }

    console.log(`auto-schedule-annual-inspections: created=${created}, skipped=${skipped}, today=${today}`);

    return new Response(JSON.stringify({ success: true, created, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('auto-schedule-annual-inspections error', e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
