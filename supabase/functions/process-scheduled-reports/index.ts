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

    // Get all active scheduled reports
    const { data: reports, error: repErr } = await supabase
      .from('agency_scheduled_reports')
      .select('*')
      .eq('is_active', true);

    if (repErr) throw repErr;
    if (!reports || reports.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let totalProcessed = 0;

    for (const report of reports) {
      // Simple cron matching: check if enough time has passed since last sent
      const lastSent = report.last_sent_at ? new Date(report.last_sent_at) : null;
      const cronInterval = parseCronToMs(report.schedule_cron);

      if (lastSent && (now.getTime() - lastSent.getTime()) < cronInterval) {
        continue; // Not due yet
      }

      const agencyId = report.agency_id;
      const reportType = report.report_type;

      // Get agency info for branding
      const { data: agency } = await supabase
        .from('housing_authorities')
        .select('name, email')
        .eq('id', agencyId)
        .single();

      const agencyName = agency?.name || 'Housing Authority';

      // Generate report content based on type
      let subject = '';
      let body = '';

      switch (reportType) {
        case 'vms_utilization': {
          const { data: vouchers } = await supabase
            .from('agency_vouchers')
            .select('status')
            .eq('agency_id', agencyId);

          const total = vouchers?.length || 0;
          const active = vouchers?.filter(v => v.status === 'leased_up').length || 0;
          const utilization = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

          subject = `VMS Utilization Report - ${agencyName}`;
          body = `<h2>VMS Utilization Report</h2>
            <p><strong>Agency:</strong> ${agencyName}</p>
            <p><strong>Date:</strong> ${now.toLocaleDateString()}</p>
            <hr/>
            <p><strong>Total Vouchers:</strong> ${total}</p>
            <p><strong>Active (Leased Up):</strong> ${active}</p>
            <p><strong>Utilization Rate:</strong> ${utilization}%</p>`;
          break;
        }
        case 'semap_scorecard': {
          const { data: scores } = await supabase
            .from('agency_semap_scores')
            .select('indicator_name, score, max_points')
            .eq('agency_id', agencyId)
            .order('indicator_number', { ascending: true });

          const totalScore = scores?.reduce((sum, s) => sum + s.score, 0) || 0;
          const maxScore = scores?.reduce((sum, s) => sum + s.max_points, 0) || 0;

          subject = `SEMAP Scorecard - ${agencyName}`;
          body = `<h2>SEMAP Scorecard</h2>
            <p><strong>Agency:</strong> ${agencyName}</p>
            <p><strong>Date:</strong> ${now.toLocaleDateString()}</p>
            <hr/>
            <p><strong>Total Score:</strong> ${totalScore} / ${maxScore}</p>
            <table border="1" cellpadding="4" cellspacing="0">
              <tr><th>Indicator</th><th>Score</th><th>Max</th></tr>
              ${(scores || []).map(s => `<tr><td>${s.indicator_name}</td><td>${s.score}</td><td>${s.max_points}</td></tr>`).join('')}
            </table>`;
          break;
        }
        default: {
          subject = `${reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - ${agencyName}`;
          body = `<h2>${reportType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
            <p><strong>Agency:</strong> ${agencyName}</p>
            <p><strong>Date:</strong> ${now.toLocaleDateString()}</p>
            <p>Report data generation for this type is pending implementation.</p>`;
          break;
        }
      }

      // Queue emails for each recipient
      for (const email of report.recipient_emails) {
        await supabase.from('email_queue').insert({
          user_id: agencyId, // Use agency ID as the sender context
          subject,
          body,
          to_email: email,
          status: 'pending',
          template_slug: `scheduled_report_${reportType}`,
          category: 'scheduled_report',
          metadata: {
            agency_id: agencyId,
            report_type: reportType,
            scheduled_report_id: report.id,
          },
        });
      }

      // Update last_sent_at
      await supabase
        .from('agency_scheduled_reports')
        .update({ last_sent_at: now.toISOString() })
        .eq('id', report.id);

      totalProcessed++;
    }

    return new Response(JSON.stringify({ success: true, processed: totalProcessed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scheduled report processing error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Simple cron string to millisecond interval parser */
function parseCronToMs(cron: string): number {
  // Common patterns
  if (cron.includes('0 * * * *')) return 60 * 60 * 1000; // hourly
  if (cron.includes('0 0 * * *')) return 24 * 60 * 60 * 1000; // daily
  if (cron.includes('0 0 * * 1')) return 7 * 24 * 60 * 60 * 1000; // weekly
  if (cron.includes('0 0 1 * *')) return 30 * 24 * 60 * 60 * 1000; // monthly

  // Default: daily
  return 24 * 60 * 60 * 1000;
}
