import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ValidationIssue {
  tenant_id: string | null
  family_id: string
  action_type: string
  severity: 'error' | 'warning' | 'info'
  field_name: string
  error_code: string
  message: string
}

const SSN_REGEX = /^\d{9}$/
const ZIP_REGEX = /^\d{5}(\d{4})?$/

function classifyAction(lease: any, recert: any): string {
  if (recert?.status === 'completed') return '2' // Annual Reexam
  if (lease?.lease_start && new Date(lease.lease_start) > new Date(Date.now() - 90 * 86400000)) return '1' // New Admission
  return '2'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { agency_id, fiscal_year, fiscal_quarter } = await req.json()
    if (!agency_id) {
      return new Response(JSON.stringify({ success: false, error: 'agency_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Pull active voucher leases
    const { data: leases, error: leaseErr } = await supabase
      .from('tenant_leases')
      .select('*')
      .eq('agency_id', agency_id)
      .eq('lease_category', 'voucher')
      .eq('status', 'active')

    if (leaseErr) throw leaseErr

    const tenantIds = [...new Set((leases || []).map((l: any) => l.tenant_id))]

    const [profilesRes, vouchersRes, recertsRes, agencyRes] = await Promise.all([
      supabase.from('tenant_profiles').select('user_id, full_name, date_of_birth, household_size, annual_income, ssn_last_four, move_in_date, disability_status, race_ethnicity').in('user_id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('agency_vouchers').select('tenant_id, voucher_number, voucher_type, bedroom_size').eq('agency_id', agency_id).in('tenant_id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('agency_recertifications').select('tenant_id, status, completed_date').eq('agency_id', agency_id).in('tenant_id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('housing_authorities').select('pha_code, name').eq('id', agency_id).single(),
    ])

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]))
    const voucherMap = new Map((vouchersRes.data || []).map((v: any) => [v.tenant_id, v]))
    const recertMap = new Map((recertsRes.data || []).map((r: any) => [r.tenant_id, r]))
    const phaCode = (agencyRes.data as any)?.pha_code

    const issues: ValidationIssue[] = []

    // Agency-level checks
    if (!phaCode) {
      issues.push({
        tenant_id: null, family_id: 'AGENCY', action_type: '0',
        severity: 'error', field_name: 'pha_code', error_code: 'PHA_001',
        message: 'Agency PHA code is missing. Set it in agency settings before generating PIC submission.',
      })
    }

    // Per-tenant checks
    for (const lease of leases || []) {
      const p: any = profileMap.get(lease.tenant_id) || {}
      const v: any = voucherMap.get(lease.tenant_id) || {}
      const r: any = recertMap.get(lease.tenant_id) || null
      const familyId = lease.tenant_id?.slice(0, 9) || 'UNKNOWN'
      const actionType = classifyAction(lease, r)

      const push = (severity: 'error' | 'warning' | 'info', field: string, code: string, msg: string) => {
        issues.push({
          tenant_id: lease.tenant_id, family_id: familyId, action_type: actionType,
          severity, field_name: field, error_code: code, message: msg,
        })
      }

      // Required field checks
      if (!p.full_name?.trim()) push('error', 'head_name', 'REQ_001', 'Head of household name is missing.')
      if (!p.date_of_birth) push('error', 'dob', 'REQ_002', 'Date of birth is missing.')
      else {
        const dob = new Date(p.date_of_birth)
        if (isNaN(dob.getTime())) push('error', 'dob', 'FMT_002', 'Date of birth is invalid.')
        else if (dob > new Date()) push('error', 'dob', 'LOG_002', 'Date of birth is in the future.')
      }

      if (p.ssn_last_four && !/^\d{4}$/.test(p.ssn_last_four)) {
        push('error', 'ssn', 'FMT_003', 'SSN last four must be exactly 4 digits.')
      }
      if (!p.ssn_last_four) push('warning', 'ssn', 'REQ_003', 'SSN last four is missing (HUD requires full SSN on file).')

      // Household composition
      const hh = parseInt(p.household_size) || 0
      if (hh < 1) push('error', 'household_size', 'LOG_004', 'Household size must be at least 1.')
      if (hh > 15) push('warning', 'household_size', 'LOG_005', 'Household size unusually large — verify.')

      // Income
      const income = parseFloat(p.annual_income) || 0
      if (income < 0) push('error', 'annual_income', 'LOG_006', 'Annual income cannot be negative.')
      if (income === 0 && actionType !== '6') push('warning', 'annual_income', 'LOG_007', 'Zero income reported — confirm or document hardship.')

      // Voucher
      if (!v.voucher_number) push('error', 'voucher_number', 'REQ_008', 'Voucher number is not assigned.')
      if (!v.voucher_type) push('warning', 'voucher_type', 'REQ_009', 'Voucher type missing — defaulting to HCV.')

      // Bedroom vs household
      const br = parseInt(lease.bedroom_count || v.bedroom_size) || 0
      if (br === 0) push('error', 'bedroom_size', 'REQ_010', 'Bedroom size is missing.')
      if (br > 0 && hh > 0 && hh > br * 2 + 2) {
        push('warning', 'bedroom_size', 'LOG_011', `Bedroom size (${br}) may be undersized for household of ${hh}.`)
      }

      // Lease dates
      if (!lease.lease_start) push('error', 'lease_start', 'REQ_012', 'Lease start date is missing.')
      if (lease.lease_start && lease.lease_end && new Date(lease.lease_start) >= new Date(lease.lease_end)) {
        push('error', 'lease_end', 'LOG_013', 'Lease end must be after lease start.')
      }

      // Financials cross-check
      const gross = parseFloat(lease.total_monthly_rent) || 0
      const ua = parseFloat(lease.utility_allowance) || 0
      const hap = parseFloat(lease.hap_amount) || 0
      const tenant = parseFloat(lease.tenant_portion) || 0
      if (gross === 0) push('error', 'gross_rent', 'REQ_014', 'Gross rent is missing or zero.')
      if (Math.abs((hap + tenant) - (gross - ua)) > 5 && gross > 0) {
        push('warning', 'hap_amount', 'LOG_015', `Financial mismatch: HAP (${hap.toFixed(2)}) + Tenant (${tenant.toFixed(2)}) ≠ Gross (${gross.toFixed(2)}) − UA (${ua.toFixed(2)}).`)
      }

      // Annual reexam timeliness for action type 2
      if (actionType === '2' && r?.completed_date) {
        const days = Math.floor((Date.now() - new Date(r.completed_date).getTime()) / 86400000)
        if (days > 365) push('warning', 'effective_date', 'LOG_016', `Annual reexam is ${days} days old — may be overdue.`)
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length
    const recordCount = (leases || []).length
    const validCount = recordCount - new Set(issues.filter(i => i.severity === 'error' && i.tenant_id).map(i => i.tenant_id)).size

    // Persist as a draft submission
    const period = `${fiscal_year || new Date().getFullYear()}-Q${fiscal_quarter || Math.ceil((new Date().getMonth() + 1) / 3)}`
    const batchRef = `PIC-${period}-${Date.now().toString(36).toUpperCase()}`

    const { data: submission, error: subErr } = await supabase
      .from('agency_pic_submissions')
      .insert({
        agency_id,
        batch_reference: batchRef,
        submission_period: period,
        record_count: recordCount,
        accepted_count: 0,
        rejected_count: errorCount,
        status: errorCount > 0 ? 'draft' : 'draft',
        notes: `Auto-validation: ${validCount}/${recordCount} valid · ${errorCount} errors · ${warningCount} warnings`,
        error_records: issues.slice(0, 500) as any,
      })
      .select()
      .single()

    if (subErr) throw subErr

    return new Response(JSON.stringify({
      success: true,
      submission_id: submission.id,
      batch_reference: batchRef,
      record_count: recordCount,
      valid_count: validCount,
      error_count: errorCount,
      warning_count: warningCount,
      issues: issues.slice(0, 200),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
