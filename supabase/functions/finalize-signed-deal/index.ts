// finalize-signed-deal: called when an admin flips a Signed deal to Live.
// Validates billing_terms, writes/updates agency_contracts, and queues invoices.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Body {
  source: 'lead' | 'prospect';
  id: string;
  agency_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = (await req.json()) as Body;
    if (!body?.id || !body?.source) {
      return json({ success: false, error: 'Missing id/source' });
    }

    const table = body.source === 'lead' ? 'agency_leads' : 'pha_prospect_status';
    const { data: row, error: rowErr } = await supa
      .from(table)
      .select('id, billing_terms')
      .eq('id', body.id)
      .maybeSingle();

    if (rowErr) return json({ success: false, error: rowErr.message });
    if (!row) return json({ success: false, error: 'Deal not found' });

    const t = (row as any).billing_terms ?? {};
    const required = ['monthly_rate', 'term_months', 'billing_start_date', 'first_invoice_date', 'signed_date'];
    const missing = required.filter((k) => t[k] == null || t[k] === '');
    if (missing.length) {
      return json({
        success: false,
        error: `Billing terms incomplete: ${missing.join(', ')}`,
      });
    }
    if (!t.billing_contact_id && !t.ap_email) {
      return json({ success: false, error: 'Billing contact or AP email required' });
    }

    const agencyId = body.agency_id;
    if (!agencyId) {
      return json({
        success: false,
        error: 'agency_id required — convert deal to agency first',
      });
    }

    // Upsert contract
    const contractPayload: any = {
      agency_id: agencyId,
      monthly_rate: t.monthly_rate,
      setup_fee: t.setup_fee ?? 0,
      term_months: t.term_months,
      billing_cycle: t.billing_cycle ?? 'monthly',
      billing_start_date: t.billing_start_date,
      first_invoice_date: t.first_invoice_date,
      payment_terms: t.payment_terms ?? 'net-30',
      auto_renew: t.auto_renew ?? true,
      billing_contact_id: t.billing_contact_id ?? null,
      ap_email: t.ap_email ?? null,
      po_required: !!t.po_required,
      po_number: t.po_number ?? null,
      signed_at: t.signed_date,
      status: 'active',
      source_lead_id: body.source === 'lead' ? body.id : null,
      source_prospect_id: body.source === 'prospect' ? body.id : null,
    };

    const { data: contract, error: contractErr } = await supa
      .from('agency_contracts')
      .insert(contractPayload)
      .select()
      .single();

    if (contractErr) return json({ success: false, error: contractErr.message });

    // Setup-fee one-time invoice (signed_date + 7d)
    const invoices: any[] = [];
    if (t.setup_fee && t.setup_fee > 0) {
      const setupDue = new Date(t.signed_date);
      setupDue.setDate(setupDue.getDate() + 7);
      invoices.push({
        agency_id: agencyId,
        contract_id: (contract as any).id,
        invoice_number: `SETUP-${Date.now()}`,
        amount: t.setup_fee,
        line_items: [{ description: 'One-time setup fee', amount: t.setup_fee }],
        status: 'draft',
        issued_date: t.signed_date,
        due_date: setupDue.toISOString().slice(0, 10),
      });
    }
    // First recurring invoice
    invoices.push({
      agency_id: agencyId,
      contract_id: (contract as any).id,
      invoice_number: `INV-${Date.now() + 1}`,
      amount: t.monthly_rate,
      line_items: [
        {
          description: `${t.billing_cycle ?? 'monthly'} subscription`,
          amount: t.monthly_rate,
        },
      ],
      status: 'draft',
      issued_date: t.first_invoice_date,
      due_date: addPaymentTerms(t.first_invoice_date, t.payment_terms ?? 'net_30'),
    });

    const { error: invErr } = await supa.from('agency_invoices').insert(invoices);
    if (invErr) console.warn('[finalize] invoice insert warning', invErr.message);

    return json({
      success: true,
      contract_id: (contract as any).id,
      invoices_queued: invoices.length,
    });
  } catch (e: any) {
    return json({ success: false, error: e.message ?? String(e) });
  }
});

function addPaymentTerms(date: string, terms: string): string {
  const d = new Date(date);
  const days = parseInt(terms.replace(/[^\d]/g, ''), 10) || 30;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}
