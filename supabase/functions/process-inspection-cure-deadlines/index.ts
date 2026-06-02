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

    // 1. Find open deficiencies past their cure deadline
    const { data: overdue, error } = await supabase
      .from('agency_inspection_deficiencies')
      .select('id, inspection_id, agency_id, severity, cure_deadline')
      .is('cured_date', null)
      .lt('cure_deadline', new Date().toISOString());

    if (error) throw error;

    const inspectionIds = Array.from(new Set((overdue || []).map((d: any) => d.inspection_id)));

    // 2. For each affected inspection, mark its HAP contract abatement_risk if not already
    let abated = 0;
    for (const insId of inspectionIds) {
      const { data: ins } = await supabase
        .from('inspections')
        .select('hap_contract_id, abatement_triggered')
        .eq('id', insId)
        .maybeSingle();

      if (ins?.hap_contract_id && !ins.abatement_triggered) {
        await supabase
          .from('agency_hap_contracts')
          .update({ status: 'abatement_risk' })
          .eq('id', ins.hap_contract_id)
          .neq('status', 'terminated')
          .neq('status', 'expired');

        await supabase
          .from('inspections')
          .update({ abatement_triggered: true })
          .eq('id', insId);

        abated += 1;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      overdue_deficiencies: overdue?.length || 0,
      contracts_flagged: abated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('cure-deadline-processor error', e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
