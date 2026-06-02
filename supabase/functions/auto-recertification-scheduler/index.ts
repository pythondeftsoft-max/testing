import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Find active leases where anniversary is within 90 days
    const { data: leases, error: leaseErr } = await supabase
      .from('tenant_leases')
      .select('id, tenant_id, agency_id, lease_start, last_recert_generated')
      .eq('status', 'active')
      .not('agency_id', 'is', null);

    if (leaseErr) throw leaseErr;

    let created = 0;
    let overdueMarked = 0;
    let remindersSent = 0;

    for (const lease of (leases || [])) {
      if (!lease.agency_id || !lease.lease_start) continue;

      const leaseStart = new Date(lease.lease_start);
      const thisYearAnniv = new Date(now.getFullYear(), leaseStart.getMonth(), leaseStart.getDate());
      let nextAnniv = thisYearAnniv;
      if (thisYearAnniv <= now) {
        nextAnniv = new Date(now.getFullYear() + 1, leaseStart.getMonth(), leaseStart.getDate());
      }

      const daysUntil = Math.ceil((nextAnniv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 90 || daysUntil < 0) continue;

      const annivYear = nextAnniv.getFullYear();
      if (lease.last_recert_generated) {
        const lastGen = new Date(lease.last_recert_generated);
        if (lastGen.getFullYear() === annivYear) {
          // Already generated — but check if we need to send reminders
        } else {
          // Create new recert
          const dueDate = nextAnniv.toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('agency_recertifications')
            .select('id')
            .eq('tenant_id', lease.tenant_id)
            .eq('agency_id', lease.agency_id)
            .eq('due_date', dueDate)
            .maybeSingle();

          if (!existing) {
            const { error: insertErr } = await supabase
              .from('agency_recertifications')
              .insert({
                agency_id: lease.agency_id,
                tenant_id: lease.tenant_id,
                type: 'annual',
                due_date: dueDate,
                status: 'upcoming',
              });

            if (!insertErr) {
              created++;
              await supabase
                .from('tenant_leases')
                .update({ last_recert_generated: today })
                .eq('id', lease.id);
            }
          }
          continue;
        }
      } else {
        // First time — create recert
        const dueDate = nextAnniv.toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('agency_recertifications')
          .select('id')
          .eq('tenant_id', lease.tenant_id)
          .eq('agency_id', lease.agency_id)
          .eq('due_date', dueDate)
          .maybeSingle();

        if (!existing) {
          const { error: insertErr } = await supabase
            .from('agency_recertifications')
            .insert({
              agency_id: lease.agency_id,
              tenant_id: lease.tenant_id,
              type: 'annual',
              due_date: dueDate,
              status: 'upcoming',
            });

          if (!insertErr) {
            created++;
            await supabase
              .from('tenant_leases')
              .update({ last_recert_generated: today })
              .eq('id', lease.id);
          }
        }
        continue;
      }
    }

    // 2. Send 90/60/30-day reminders for upcoming recertifications
    const { data: upcomingRecerts } = await supabase
      .from('agency_recertifications')
      .select('id, tenant_id, agency_id, due_date, reminder_count, last_reminder_sent, status')
      .in('status', ['upcoming', 'documents_requested'])
      .gte('due_date', today);

    for (const recert of (upcomingRecerts || [])) {
      const dueDate = new Date(recert.due_date);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine if reminder is needed (90, 60, 30 day windows)
      let shouldRemind = false;
      let urgency = 'info';

      if (daysUntil <= 90 && daysUntil > 60 && (recert.reminder_count || 0) < 1) {
        shouldRemind = true;
        urgency = 'notice';
      } else if (daysUntil <= 60 && daysUntil > 30 && (recert.reminder_count || 0) < 2) {
        shouldRemind = true;
        urgency = 'warning';
      } else if (daysUntil <= 30 && (recert.reminder_count || 0) < 3) {
        shouldRemind = true;
        urgency = 'urgent';
      }

      // Skip if we already sent a reminder today
      if (recert.last_reminder_sent && recert.last_reminder_sent.startsWith(today)) {
        shouldRemind = false;
      }

      if (!shouldRemind) continue;

      // Get tenant profile for notification
      const { data: tenant } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', recert.tenant_id)
        .maybeSingle();

      // Create in-app message for the agency
      const messageBody = `Recertification reminder (${urgency.toUpperCase()}): ${tenant?.full_name || 'Tenant'} has a recertification due on ${recert.due_date}. ${daysUntil} days remaining.`;

      await supabase.from('agency_messages').insert({
        agency_id: recert.agency_id,
        sender_id: recert.tenant_id,
        sender_type: 'system',
        recipient_id: recert.agency_id,
        recipient_type: 'agency',
        subject: `Recertification ${urgency === 'urgent' ? '⚠️ URGENT' : 'Reminder'}: ${tenant?.full_name || 'Tenant'}`,
        body: messageBody,
      } as any);

      // Update reminder tracking
      await supabase
        .from('agency_recertifications')
        .update({
          reminder_count: (recert.reminder_count || 0) + 1,
          last_reminder_sent: now.toISOString(),
        })
        .eq('id', recert.id);

      remindersSent++;
    }

    // 3. Mark overdue recertifications
    const { data: overdueRecerts } = await supabase
      .from('agency_recertifications')
      .select('id')
      .lt('due_date', today)
      .in('status', ['upcoming', 'documents_requested', 'under_review']);

    if (overdueRecerts?.length) {
      const { error: updateErr } = await supabase
        .from('agency_recertifications')
        .update({ status: 'overdue' })
        .lt('due_date', today)
        .in('status', ['upcoming', 'documents_requested', 'under_review']);

      if (!updateErr) overdueMarked = overdueRecerts.length;
    }

    console.log(`Recert scheduler: created=${created}, reminders=${remindersSent}, overdue=${overdueMarked}`);

    return new Response(
      JSON.stringify({ success: true, created, remindersSent, overdueMarked }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Recert scheduler error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
