// Auto-generate monthly HAP payment batches in DRAFT status.
// Runs daily via pg_cron — only processes agencies whose configured day == today.
// Idempotent: skips agencies that already have a batch for the target period.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function nextMonthFirstDay(today: Date): string {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1; // next month, 0-indexed → +1 then JS handles overflow
  const next = new Date(Date.UTC(y, m, 1));
  return next.toISOString().slice(0, 10); // YYYY-MM-DD
}

function periodLabel(periodMonth: string): string {
  const d = new Date(periodMonth + 'T00:00:00Z');
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const today = new Date();
  const dayOfMonth = today.getUTCDate();
  const periodMonth = nextMonthFirstDay(today);

  // Allow manual trigger via body or querystring: { force: true } or { agency_id: "..." }
  let forceAll = false;
  let forceAgencyId: string | null = null;
  try {
    const url = new URL(req.url);
    forceAll = url.searchParams.get('force') === 'true';
    forceAgencyId = url.searchParams.get('agency_id');
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (body?.force === true) forceAll = true;
      if (body?.agency_id) forceAgencyId = body.agency_id;
    }
  } catch {/* noop */}

  // Find eligible agencies
  let query = supabase
    .from('housing_authorities')
    .select('id, name, auto_batch_day_of_month, auto_batch_enabled')
    .eq('is_onboarded', true)
    .eq('auto_batch_enabled', true);

  if (forceAgencyId) {
    query = query.eq('id', forceAgencyId);
  } else if (!forceAll) {
    query = query.eq('auto_batch_day_of_month', dayOfMonth);
  }

  const { data: agencies, error: aErr } = await query;
  if (aErr) {
    console.error('Failed to fetch agencies', aErr);
    return new Response(JSON.stringify({ error: aErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: any[] = [];

  for (const agency of agencies ?? []) {
    try {
      // Idempotency: skip if a batch for this period already exists for this agency
      const { data: existing } = await supabase
        .from('hap_payment_batches')
        .select('id')
        .eq('agency_id', agency.id)
        .eq('period_month', periodMonth)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from('auto_batch_generation_log').insert({
          agency_id: agency.id,
          batch_id: existing[0].id,
          period_month: periodMonth,
          status: 'skipped_existing',
          contracts_count: 0,
          total_amount: 0,
        });
        results.push({ agency_id: agency.id, status: 'skipped_existing' });
        continue;
      }

      // Pull active HAP contracts
      const { data: contracts, error: cErr } = await supabase
        .from('agency_hap_contracts')
        .select('id, tenant_id, landlord_id, unit_id, voucher_id, hap_amount, tenant_rent, gross_rent, utility_allowance')
        .eq('agency_id', agency.id)
        .eq('status', 'active');

      if (cErr) throw new Error(`Fetch contracts: ${cErr.message}`);

      if (!contracts || contracts.length === 0) {
        await supabase.from('auto_batch_generation_log').insert({
          agency_id: agency.id,
          period_month: periodMonth,
          status: 'skipped_no_contracts',
          contracts_count: 0,
          total_amount: 0,
        });
        results.push({ agency_id: agency.id, status: 'skipped_no_contracts' });
        continue;
      }

      // Compute totals
      const total_amount = contracts.reduce((s, c) => s + Number(c.hap_amount || 0), 0);
      const total_units = contracts.length;
      const total_landlords = new Set(contracts.map((c) => c.landlord_id).filter(Boolean)).size;
      const periodMonthShort = periodMonth.slice(0, 7).replace('-', '');
      const batchNumber = `AUTO-${periodMonthShort}-${agency.id.slice(0, 8)}`;

      // Create batch in draft
      const { data: batch, error: bErr } = await supabase
        .from('hap_payment_batches')
        .insert({
          agency_id: agency.id,
          batch_number: batchNumber,
          period_month: periodMonth,
          status: 'draft',
          total_amount,
          total_units,
          total_landlords,
          notes: `Auto-generated on ${today.toISOString().slice(0, 10)} from ${total_units} active HAP contract(s).`,
        })
        .select()
        .single();

      if (bErr) throw new Error(`Create batch: ${bErr.message}`);

      // Insert items
      const items = contracts.map((c) => ({
        batch_id: batch.id,
        tenant_lease_id: null,
        landlord_id: c.landlord_id,
        unit_id: c.unit_id,
        tenant_id: c.tenant_id,
        voucher_id: c.voucher_id,
        hap_amount: Number(c.hap_amount || 0),
        tenant_portion: Number(c.tenant_rent || 0),
        gross_rent: Number(c.gross_rent || 0),
        utility_allowance: Number(c.utility_allowance || 0),
        adjustment_amount: 0,
        status: 'pending',
      }));

      const { error: iErr } = await supabase.from('hap_batch_items').insert(items);
      if (iErr) throw new Error(`Insert items: ${iErr.message}`);

      // Log success
      await supabase.from('auto_batch_generation_log').insert({
        agency_id: agency.id,
        batch_id: batch.id,
        period_month: periodMonth,
        status: 'success',
        contracts_count: total_units,
        total_amount,
      });

      // Notify finance staff
      const { data: financeStaff } = await supabase
        .from('agency_staff')
        .select('email')
        .eq('agency_id', agency.id)
        .eq('is_active', true)
        .in('role', ['finance', 'agency_admin']);

      const recipients = (financeStaff ?? []).map((s: any) => s.email).filter(Boolean);
      if (recipients.length > 0) {
        const subject = `${periodLabel(periodMonth)} HAP batch drafted — review required`;
        const body = `<p>A new HAP payment batch has been auto-drafted for <strong>${agency.name}</strong>.</p>
<ul>
  <li><strong>Period:</strong> ${periodLabel(periodMonth)}</li>
  <li><strong>Total amount:</strong> $${total_amount.toFixed(2)}</li>
  <li><strong>Units:</strong> ${total_units}</li>
  <li><strong>Landlords:</strong> ${total_landlords}</li>
</ul>
<p>The batch is in <strong>draft</strong> status and will not send until a human reviews and approves it.</p>
<p>Batch number: <code>${batchNumber}</code></p>`;

        await supabase.from('email_queue').insert(
          recipients.map((email) => ({
            to_email: email,
            subject,
            body,
            status: 'pending',
            template_slug: 'hap_auto_batch_drafted',
            audience: 'all',
            metadata: { agency_id: agency.id, batch_id: batch.id, period_month: periodMonth },
          })),
        );
      }

      results.push({
        agency_id: agency.id,
        status: 'success',
        batch_id: batch.id,
        total_amount,
        total_units,
      });
    } catch (err: any) {
      console.error(`Agency ${agency.id} failed:`, err);
      await supabase.from('auto_batch_generation_log').insert({
        agency_id: agency.id,
        period_month: periodMonth,
        status: 'error',
        contracts_count: 0,
        total_amount: 0,
        error_message: String(err?.message || err),
      });
      results.push({ agency_id: agency.id, status: 'error', error: String(err?.message || err) });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      run_at: today.toISOString(),
      day_of_month: dayOfMonth,
      target_period: periodMonth,
      processed: results.length,
      results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
