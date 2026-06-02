import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Cron-invoked: snapshots SEMAP for every onboarded agency for the current FY period.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const year = new Date().getFullYear()
    const reporting_period = `${year - 1}-${year}`

    const { data: agencies, error } = await supabase
      .from('housing_authorities')
      .select('id, name')
      .eq('is_onboarded', true)

    if (error) throw error

    const results: Array<{ agency_id: string; status: string; percentage?: number; error?: string }> = []

    for (const agency of agencies || []) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/calculate-semap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            'x-trigger-source': 'scheduled_monthly',
          },
          body: JSON.stringify({ agency_id: agency.id, reporting_period }),
        })
        const json = await resp.json()
        if (json.success) {
          results.push({ agency_id: agency.id, status: 'ok', percentage: json.percentage })
        } else {
          results.push({ agency_id: agency.id, status: 'failed', error: json.error })
        }
      } catch (e) {
        results.push({ agency_id: agency.id, status: 'failed', error: (e as Error).message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      reporting_period,
      processed: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
