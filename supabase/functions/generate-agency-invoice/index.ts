import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { contract_id, send_email = true, period_label } = body as {
      contract_id?: string; send_email?: boolean; period_label?: string;
    };

    if (!contract_id) {
      return json({ success: false, error: 'contract_id required' });
    }

    const { data: contract, error: cErr } = await admin
      .from('agency_contracts')
      .select('*, housing_authorities(name)')
      .eq('id', contract_id)
      .maybeSingle();
    if (cErr || !contract) return json({ success: false, error: cErr?.message || 'Contract not found' });

    const monthly = Number(contract.monthly_rate) || 0;
    const domainFee = Number(contract.custom_email_domain_fee) || 0;
    const lineItems: Array<{ description: string; amount: number }> = [
      { description: `Monthly Platform Fee${period_label ? ' — ' + period_label : ''}`, amount: monthly },
    ];
    if (domainFee > 0) lineItems.push({ description: 'Custom Email Domain Add-On', amount: domainFee });
    const total = lineItems.reduce((s, l) => s + l.amount, 0);

    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + 30);
    const invoiceNumber = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const { data: inv, error: iErr } = await admin
      .from('agency_invoices')
      .insert({
        agency_id: contract.agency_id,
        contract_id: contract.id,
        invoice_number: invoiceNumber,
        amount: total,
        line_items: lineItems,
        status: 'sent',
        issued_date: today.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        sent_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (iErr) return json({ success: false, error: iErr.message });

    await admin.from('agency_contracts').update({ last_invoice_id: inv.id }).eq('id', contract.id);

    const billingEmail = contract.billing_contact_email;
    const publicUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://openkeyhousing.com'}/agency/invoice/${inv.public_token}`;

    if (send_email && billingEmail) {
      try {
        await admin.from('email_queue').insert({
          to_email: billingEmail,
          subject: `Invoice ${invoiceNumber} from OpenKey — $${total.toLocaleString()}`,
          body_html: `<p>Hi ${contract.billing_contact_name || 'there'},</p>
<p>Your OpenKey invoice <strong>${invoiceNumber}</strong> for <strong>${(contract.housing_authorities as any)?.name || 'your agency'}</strong> is ready.</p>
<p><strong>Amount due:</strong> $${total.toLocaleString()} · <strong>Due:</strong> ${due.toISOString().slice(0,10)}</p>
<p><a href="${publicUrl}" style="background:#1e40af;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">View invoice</a></p>
<p>Pay by ACH or check — instructions on the invoice page.</p>
<p>— OpenKey Billing</p>`,
          body_text: `Invoice ${invoiceNumber} — $${total} due ${due.toISOString().slice(0,10)}\n${publicUrl}`,
          status: 'pending',
          related_agency_id: contract.agency_id,
          template_key: 'agency_invoice',
        });
      } catch (e) {
        console.warn('[generate-agency-invoice] email queue insert failed', e);
      }
    }

    return json({ success: true, invoice: inv, public_url: publicUrl });
  } catch (e) {
    console.error(e);
    return json({ success: false, error: (e as Error).message });
  }
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
