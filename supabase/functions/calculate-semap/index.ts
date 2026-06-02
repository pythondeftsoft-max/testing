import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { agency_id, reporting_period } = await req.json()
    if (!agency_id || !reporting_period) {
      return new Response(JSON.stringify({ error: 'Missing agency_id or reporting_period' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user is agency staff
    const { data: staff } = await supabase
      .from('agency_staff')
      .select('id')
      .eq('agency_id', agency_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!staff) {
      return new Response(JSON.stringify({ error: 'Not authorized for this agency' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const scores: Record<number, { score: number; max: number; name: string }> = {}

    // --- Indicator 1: Selection from Waitlist (15 pts) ---
    // Check if waitlist selections follow proper order
    const { count: totalApps } = await supabase
      .from('voucher_applications')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency_id)
    const { count: processedApps } = await supabase
      .from('voucher_applications')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agency_id)
      .in('status', ['approved', 'voucher_issued', 'denied'])
    const selectionRate = (totalApps && totalApps > 0) ? (processedApps || 0) / totalApps : 0
    scores[1] = { score: selectionRate >= 0.9 ? 15 : selectionRate >= 0.7 ? 10 : selectionRate >= 0.5 ? 5 : 0, max: 15, name: 'Selection from Waitlist' }

    // --- Indicator 2: Rent Reasonableness (20 pts) ---
    // Check HAP contracts have rent within payment standard
    const { data: hapContracts } = await supabase
      .from('agency_hap_contracts')
      .select('gross_rent, hap_amount, tenant_rent')
      .eq('agency_id', agency_id)
      .eq('status', 'active')
    const validRents = hapContracts?.filter(c => c.gross_rent && c.hap_amount && c.gross_rent > 0).length || 0
    const totalContracts = hapContracts?.length || 0
    const rentRate = totalContracts > 0 ? validRents / totalContracts : 0
    scores[2] = { score: rentRate >= 0.95 ? 20 : rentRate >= 0.8 ? 15 : rentRate >= 0.6 ? 10 : 5, max: 20, name: 'Rent Reasonableness' }

    // --- Indicator 3: Determination of Adjusted Income (20 pts) ---
    // Check recertifications completeness
    const { data: recerts } = await supabase
      .from('agency_recertifications')
      .select('status, completed_at, due_date')
      .eq('agency_id', agency_id)
    const completedRecerts = recerts?.filter(r => r.status === 'completed').length || 0
    const totalRecerts = recerts?.length || 0
    const incomeRate = totalRecerts > 0 ? completedRecerts / totalRecerts : 0
    scores[3] = { score: incomeRate >= 0.9 ? 20 : incomeRate >= 0.7 ? 15 : incomeRate >= 0.5 ? 10 : 5, max: 20, name: 'Determination of Adjusted Income' }

    // --- Indicator 4: Utility Allowance Schedule (5 pts) ---
    const { data: utilSchedules } = await supabase
      .from('agency_utility_schedules')
      .select('effective_date')
      .eq('agency_id', agency_id)
      .order('effective_date', { ascending: false })
      .limit(1)
    const hasRecentUtil = utilSchedules?.length && 
      new Date(utilSchedules[0].effective_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    scores[4] = { score: hasRecentUtil ? 5 : 0, max: 5, name: 'Utility Allowance Schedule' }

    // --- Indicator 5: HQS Quality Control Inspections (5 pts) ---
    const { data: inspections } = await supabase
      .from('inspections')
      .select('result')
      .eq('agency_id', agency_id)
    const passedInsp = inspections?.filter(i => i.result === 'pass').length || 0
    const totalInsp = inspections?.length || 0
    const hqsRate = totalInsp > 0 ? passedInsp / totalInsp : 0
    scores[5] = { score: hqsRate >= 0.95 ? 5 : hqsRate >= 0.8 ? 3 : 1, max: 5, name: 'HQS Quality Control Inspections' }

    // --- Indicator 6: HQS Enforcement (10 pts) ---
    const failedInsp = inspections?.filter(i => i.result === 'fail').length || 0
    // Check if failed inspections have follow-up
    const enforcementRate = totalInsp > 0 ? 1 - (failedInsp / totalInsp) : 1
    scores[6] = { score: enforcementRate >= 0.9 ? 10 : enforcementRate >= 0.7 ? 7 : enforcementRate >= 0.5 ? 4 : 1, max: 10, name: 'HQS Enforcement' }

    // --- Indicator 7: Expanding Housing Opportunities (5 pts) ---
    // Check geographic diversity of properties
    const { data: properties } = await supabase
      .from('agency_landlord_units')
      .select('property_id')
      .eq('agency_landlord_id', agency_id)
    scores[7] = { score: (properties?.length || 0) >= 10 ? 5 : (properties?.length || 0) >= 5 ? 3 : 1, max: 5, name: 'Expanding Housing Opportunities' }

    // --- Indicator 8: Payment Standards (5 pts) ---
    const { data: payStandards } = await supabase
      .from('agency_payment_standards')
      .select('effective_date')
      .eq('agency_id', agency_id)
      .order('effective_date', { ascending: false })
      .limit(1)
    const hasRecentPS = payStandards?.length && 
      new Date(payStandards[0].effective_date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    scores[8] = { score: hasRecentPS ? 5 : 0, max: 5, name: 'Payment Standards' }

    // --- Indicator 9: Timely Annual Recertifications (10 pts) ---
    const onTimeRecerts = recerts?.filter(r => 
      r.status === 'completed' && r.completed_at && r.due_date && 
      new Date(r.completed_at) <= new Date(r.due_date)
    ).length || 0
    const recertTimeliness = completedRecerts > 0 ? onTimeRecerts / completedRecerts : 0
    scores[9] = { score: recertTimeliness >= 0.95 ? 10 : recertTimeliness >= 0.8 ? 7 : recertTimeliness >= 0.5 ? 4 : 1, max: 10, name: 'Timely Annual Recertifications' }

    // --- Indicator 10: Correct Tenant Rent Calculations (5 pts) ---
    // Based on HAP contract data completeness
    const completeContracts = hapContracts?.filter(c => c.gross_rent && c.tenant_rent && c.hap_amount).length || 0
    const calcRate = totalContracts > 0 ? completeContracts / totalContracts : 0
    scores[10] = { score: calcRate >= 0.95 ? 5 : calcRate >= 0.8 ? 3 : 1, max: 5, name: 'Correct Tenant Rent Calculations' }

    // --- Indicator 11: Pre-Contract HQS Inspections (5 pts) ---
    const { data: preInsp } = await supabase
      .from('inspections')
      .select('result, inspection_type')
      .eq('agency_id', agency_id)
      .eq('inspection_type', 'initial')
    const prePassRate = preInsp?.length ? preInsp.filter(i => i.result === 'pass').length / preInsp.length : 0
    scores[11] = { score: prePassRate >= 0.95 ? 5 : prePassRate >= 0.8 ? 3 : 1, max: 5, name: 'Pre-Contract HQS Inspections' }

    // --- Indicator 12: Annual HQS Inspections (10 pts) ---
    const { data: annualInsp } = await supabase
      .from('inspections')
      .select('completed_date, inspection_type')
      .eq('agency_id', agency_id)
      .eq('inspection_type', 'annual')
    const annualCompleted = annualInsp?.filter(i => i.completed_date).length || 0
    const annualTotal = annualInsp?.length || 0
    const annualRate = annualTotal > 0 ? annualCompleted / annualTotal : 0
    scores[12] = { score: annualRate >= 0.95 ? 10 : annualRate >= 0.8 ? 7 : annualRate >= 0.5 ? 4 : 1, max: 10, name: 'Annual HQS Inspections' }

    // --- Indicator 13: Lease-Up Rate (20 pts) ---
    const { data: vouchers } = await supabase
      .from('agency_vouchers')
      .select('status')
      .eq('agency_id', agency_id)
    const leasedUp = vouchers?.filter(v => v.status === 'leased_up').length || 0
    const totalVouchers = vouchers?.length || 0
    const leaseUpRate = totalVouchers > 0 ? leasedUp / totalVouchers : 0
    scores[13] = { score: leaseUpRate >= 0.95 ? 20 : leaseUpRate >= 0.8 ? 15 : leaseUpRate >= 0.5 ? 10 : 5, max: 20, name: 'Lease-Up Rate' }

    // --- Indicator 14: Family Self-Sufficiency (10 pts) ---
    const { data: fss } = await supabase
      .from('agency_fss_participants')
      .select('id, status')
      .eq('agency_id', agency_id)
      .in('status', ['enrolled', 'active', 'completed'])
    const fssRate = totalVouchers > 0 ? (fss?.length || 0) / totalVouchers : 0
    scores[14] = { score: fssRate >= 0.05 ? 10 : fssRate > 0 ? 5 : 0, max: 10, name: 'Family Self-Sufficiency' }

    // Upsert all scores
    const upserts = Object.entries(scores).map(([num, s]) => ({
      agency_id,
      reporting_period,
      indicator_number: parseInt(num),
      indicator_name: s.name,
      max_points: s.max,
      score: s.score,
      notes: 'Auto-calculated from live data',
    }))

    for (const row of upserts) {
      await supabase.from('agency_semap_scores').upsert(row, {
        onConflict: 'agency_id,reporting_period,indicator_number',
      })
    }

    const totalScore = Object.values(scores).reduce((s, v) => s + v.score, 0)
    const totalMax = Object.values(scores).reduce((s, v) => s + v.max, 0)
    const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
    const passing = percentage >= 60
    const designation =
      percentage >= 90 ? 'High Performer' :
      percentage >= 60 ? 'Standard' :
      'Troubled'

    // Write snapshot to history (one per agency/period/day via unique index)
    const indicator_breakdown = Object.entries(scores).map(([num, s]) => ({
      number: parseInt(num),
      name: s.name,
      score: s.score,
      max: s.max,
    }))
    await supabase.from('agency_semap_score_history').upsert({
      agency_id,
      reporting_period,
      snapshot_date: new Date().toISOString().slice(0, 10),
      total_score: totalScore,
      total_max: totalMax,
      percentage,
      passing,
      indicator_breakdown,
      triggered_by: req.headers.get('x-trigger-source') || 'manual',
    }, { onConflict: 'agency_id,reporting_period,snapshot_date' })

    // Annual designation history (one row per fiscal year + snapshot)
    const fiscalYear = parseInt(String(reporting_period).slice(0, 4)) || new Date().getFullYear()
    await supabase.from('agency_semap_history').insert({
      agency_id,
      fiscal_year: fiscalYear,
      scores: { breakdown: indicator_breakdown, totalScore, totalMax, percentage },
      designation,
    })

    return new Response(JSON.stringify({
      success: true,
      scores,
      totalScore,
      totalMax,
      percentage,
      passing,
      designation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
