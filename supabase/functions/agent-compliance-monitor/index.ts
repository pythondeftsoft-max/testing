import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyOwner } from '../_shared/notify-owner.ts';

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
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];

    // Fetch all agencies
    const { data: agencies } = await supabase
      .from('housing_authorities')
      .select('id, name')
      .eq('onboarding_status', 'active');

    const results: any[] = [];

    for (const agency of (agencies || [])) {
      const agencyId = agency.id;
      const metrics: Record<string, any> = { agency: agency.name };

      // 1. Overdue recertifications
      const { count: overdueRecerts } = await supabase
        .from('agency_recertifications')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'overdue');

      metrics.overdueRecerts = overdueRecerts || 0;

      // 2. Recertifications due within 30 days
      const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const { count: dueSoon } = await supabase
        .from('agency_recertifications')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .in('status', ['upcoming', 'documents_requested'] as any)
        .lte('due_date', thirtyDaysOut);

      metrics.recertsDueSoon = dueSoon || 0;

      // 3. Voucher utilization (active vs total)
      const { count: totalVouchers } = await supabase
        .from('agency_vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId);

      const { count: activeVouchers } = await supabase
        .from('agency_vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'active');

      metrics.voucherUtilization = totalVouchers
        ? Math.round(((activeVouchers || 0) / totalVouchers) * 100)
        : 0;

      // 4. Expired HAP contracts
      const { count: expiredContracts } = await supabase
        .from('agency_hap_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .lt('expiration_date', today);

      metrics.expiredContracts = expiredContracts || 0;

      // 5. Missing documents (landlords without W-9)
      const { count: missingW9 } = await supabase
        .from('agency_landlords')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('w9_required', true)
        .neq('w9_status', 'received');

      metrics.missingW9 = missingW9 || 0;

      // Calculate health score (0-100)
      let score = 100;
      if (metrics.overdueRecerts > 0) score -= Math.min(metrics.overdueRecerts * 5, 30);
      if (metrics.expiredContracts > 0) score -= Math.min(metrics.expiredContracts * 5, 20);
      if (metrics.missingW9 > 0) score -= Math.min(metrics.missingW9 * 2, 10);
      if (metrics.voucherUtilization < 90) score -= Math.round((90 - metrics.voucherUtilization) * 0.5);
      score = Math.max(0, score);

      metrics.healthScore = score;

      // Log to agent_activity_logs
      await supabase.from('agent_activity_logs').insert({
        agent_id: 'agent-compliance-monitor',
        action: 'compliance_scan',
        log_type: 'compliance',
        detail: JSON.stringify(metrics),
      });

      results.push(metrics);

      // Alert if score is critical
      if (score < 70) {
        const alertLines = [
          `⚠️ COMPLIANCE ALERT: ${agency.name}`,
          `Health Score: ${score}/100`,
          metrics.overdueRecerts > 0 ? `• ${metrics.overdueRecerts} overdue recertifications` : '',
          metrics.expiredContracts > 0 ? `• ${metrics.expiredContracts} expired HAP contracts` : '',
          metrics.missingW9 > 0 ? `• ${metrics.missingW9} landlords missing W-9` : '',
          `• Voucher utilization: ${metrics.voucherUtilization}%`,
        ].filter(Boolean).join('\n');

        try {
          await notifyOwner(
            `Compliance Alert: ${agency.name}`,
            alertLines,
            `compliance-${agencyId}`
          );
        } catch (e) {
          console.error('Failed to notify owner about compliance alert:', e);
        }
      }
    }

    console.log(`Compliance monitor: scanned ${results.length} agencies`);

    return new Response(
      JSON.stringify({ success: true, agenciesScanned: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('Compliance monitor error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
