import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: reminders, error: remErr } = await supabase
      .from('agency_automated_reminders')
      .select('*')
      .eq('is_active', true);

    if (remErr) throw remErr;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agencyIds = [...new Set(reminders.map(r => r.agency_id))];
    const { data: allPrefs } = await supabase
      .from('agency_notification_preferences')
      .select('agency_id, notification_type, email_enabled, in_app_enabled')
      .in('agency_id', agencyIds);

    const prefsMap: Record<string, Record<string, { email_enabled: boolean; in_app_enabled: boolean }>> = {};
    for (const p of (allPrefs || [])) {
      if (!prefsMap[p.agency_id]) prefsMap[p.agency_id] = {};
      prefsMap[p.agency_id][p.notification_type] = {
        email_enabled: p.email_enabled,
        in_app_enabled: p.in_app_enabled,
      };
    }

    // Per-agency branded from-address (housing_authorities.email if present)
    const { data: agencies } = await supabase
      .from('housing_authorities')
      .select('id, name, email')
      .in('id', agencyIds);
    const agencyMeta: Record<string, { name?: string; email?: string }> = {};
    for (const a of (agencies || [])) agencyMeta[a.id] = { name: a.name, email: a.email };

    let totalProcessed = 0;

    const sendNotice = async (
      agencyId: string,
      tenantId: string,
      subject: string,
      body: string,
      linkedType: string,
      linkedId: string,
      templateSlug: string,
      inAppEnabled: boolean,
      emailEnabled: boolean,
      recipientType: 'tenant' | 'landlord' = 'tenant',
    ) => {
      if (inAppEnabled) {
        await supabase.from('agency_messages').insert({
          agency_id: agencyId,
          sender_id: agencyId,
          sender_type: 'system',
          recipient_id: tenantId,
          recipient_type: recipientType,
          subject,
          body,
          linked_entity_type: linkedType,
          linked_entity_id: linkedId,
        });
      }
      if (emailEnabled) {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', tenantId).single();
        if (profile?.email) {
          const meta = agencyMeta[agencyId] || {};
          await supabase.from('email_queue').insert({
            user_id: tenantId,
            subject,
            body,
            to_email: profile.email,
            status: 'pending',
            template_slug: templateSlug,
            category: 'agency_reminder',
            metadata: { agency_id: agencyId, from_email: meta.email, from_name: meta.name },
          });
        }
      }
    };

    for (const reminder of reminders) {
      const daysBefore = reminder.days_before;
      const agencyId = reminder.agency_id;
      const reminderType = reminder.reminder_type as string;

      let notifType = reminderType;
      if (reminderType.startsWith('recertification_')) notifType = 'recertification_reminder';
      if (reminderType === 'inspection_upcoming') notifType = 'inspection_reminder';
      if (reminderType === 'hap_contract_expiration') notifType = 'hap_expiration';

      const agencyPrefs = prefsMap[agencyId] || {};
      const pref = agencyPrefs[notifType];
      const inAppEnabled = pref?.in_app_enabled !== false;
      const emailEnabled = pref?.email_enabled !== false;

      if (!inAppEnabled && !emailEnabled) {
        await supabase.from('agency_automated_reminders').update({ last_run_at: new Date().toISOString() }).eq('id', reminder.id);
        continue;
      }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      try {
        if (reminderType.startsWith('recertification_')) {
          const { data: recerts } = await supabase
            .from('agency_recertifications')
            .select('id, tenant_id, due_date, status')
            .eq('agency_id', agencyId)
            .eq('due_date', targetDateStr)
            .in('status', ['upcoming', 'documents_requested']);
          for (const r of (recerts || [])) {
            await sendNotice(agencyId, r.tenant_id,
              `Recertification Reminder - Due ${r.due_date}`,
              `Your annual recertification is due on ${r.due_date} (${daysBefore} days). Please submit required documents to your caseworker.`,
              'recertification', r.id, 'recertification_reminder', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        } else if (reminderType === 'inspection_upcoming') {
          const { data: inspections } = await supabase
            .from('agency_inspections')
            .select('id, tenant_id, scheduled_date, status')
            .eq('agency_id', agencyId)
            .eq('scheduled_date', targetDateStr)
            .eq('status', 'scheduled');
          for (const i of (inspections || [])) {
            await sendNotice(agencyId, i.tenant_id,
              `Inspection Reminder - ${i.scheduled_date}`,
              `Housing inspection scheduled for ${i.scheduled_date} (${daysBefore} days away). Please ensure unit access.`,
              'inspection', i.id, 'inspection_reminder', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        } else if (reminderType === 'lease_expiration') {
          const { data: leases } = await supabase
            .from('tenant_leases')
            .select('id, tenant_id, lease_end')
            .eq('agency_id', agencyId)
            .eq('lease_end', targetDateStr)
            .eq('status', 'active');
          for (const l of (leases || [])) {
            await sendNotice(agencyId, l.tenant_id,
              `Lease Expiration Notice - ${l.lease_end}`,
              `Your lease expires on ${l.lease_end} (${daysBefore} days). Please contact your caseworker to discuss renewal.`,
              'lease', l.id, 'lease_expiration', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        } else if (reminderType === 'hap_contract_expiration') {
          const { data: contracts } = await supabase
            .from('hap_contracts')
            .select('id, landlord_id, tenant_id, contract_end_date')
            .eq('agency_id', agencyId)
            .eq('contract_end_date', targetDateStr)
            .eq('status', 'active');
          for (const c of (contracts || [])) {
            const recipient = c.landlord_id || c.tenant_id;
            const rType = c.landlord_id ? 'landlord' : 'tenant';
            if (!recipient) continue;
            await sendNotice(agencyId, recipient,
              `HAP Contract Expiring - ${c.contract_end_date}`,
              `HAP contract expires on ${c.contract_end_date} (${daysBefore} days). Please contact the agency to renew.`,
              'hap_contract', c.id, 'hap_expiration', inAppEnabled, emailEnabled, rType as any);
            totalProcessed++;
          }
        } else if (reminderType === 'voucher_issued') {
          // Re-notify recently issued vouchers approaching shopping deadline
          const { data: vouchers } = await supabase
            .from('agency_vouchers')
            .select('id, tenant_id, shopping_deadline')
            .eq('agency_id', agencyId)
            .eq('shopping_deadline', targetDateStr)
            .in('status', ['issued', 'shopping']);
          for (const v of (vouchers || [])) {
            await sendNotice(agencyId, v.tenant_id,
              `Voucher Shopping Reminder - Deadline ${v.shopping_deadline}`,
              `Your voucher shopping deadline is ${v.shopping_deadline} (${daysBefore} days). Submit an RFTA before the deadline.`,
              'voucher', v.id, 'voucher_issued', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        } else if (reminderType === 'rent_change') {
          const { data: changes } = await supabase
            .from('rent_calculations')
            .select('id, tenant_id, effective_date')
            .eq('agency_id', agencyId)
            .eq('effective_date', targetDateStr);
          for (const c of (changes || [])) {
            await sendNotice(agencyId, c.tenant_id,
              `Rent Portion Change - Effective ${c.effective_date}`,
              `A change to your rent portion takes effect ${c.effective_date} (${daysBefore} days). View details in your portal.`,
              'rent_calculation', c.id, 'rent_change', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        } else if (reminderType === 'document_expiration') {
          const { data: docs } = await supabase
            .from('agency_compliance_documents')
            .select('id, tenant_id, expires_on, document_type')
            .eq('agency_id', agencyId)
            .eq('expires_on', targetDateStr);
          for (const d of (docs || [])) {
            await sendNotice(agencyId, d.tenant_id,
              `Document Expiring - ${d.document_type}`,
              `Your ${d.document_type} expires on ${d.expires_on} (${daysBefore} days). Please upload a renewal.`,
              'document', d.id, 'document_expiration', inAppEnabled, emailEnabled);
            totalProcessed++;
          }
        }
      } catch (innerErr) {
        console.error(`Reminder ${reminder.id} (${reminderType}) failed:`, innerErr);
      }

      await supabase
        .from('agency_automated_reminders')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', reminder.id);
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reminder processing error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
