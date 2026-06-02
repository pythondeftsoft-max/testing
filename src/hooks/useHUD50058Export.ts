import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { exportCSV, exportHUD50058FixedWidth, validate50058Records, type HUD50058Record, type ValidationWarning } from '@/lib/exportHUDReport';

export type ExportFormat = 'csv' | 'fixed_width';

export function useHUD50058Export(agencyId: string) {
  const [loading, setLoading] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);

  const fetchAndExport = async (format: ExportFormat = 'csv') => {
    setLoading(true);
    setValidationWarnings([]);

    const { data: leases } = await supabase
      .from('tenant_leases')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('lease_category', 'voucher')
      .eq('status', 'active');

    if (!leases?.length) {
      setRecordCount(0);
      setLoading(false);
      return;
    }

    const tenantIds = [...new Set(leases.map((l: any) => l.tenant_id))];

    const { data: profiles } = await supabase
      .from('tenant_profiles')
      .select('user_id, full_name, date_of_birth, household_size, annual_income, voucher_status, move_in_date, disability_status, race_ethnicity')
      .in('user_id', tenantIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const { data: vouchers } = await supabase
      .from('agency_vouchers')
      .select('tenant_id, voucher_number, voucher_type, amount')
      .eq('agency_id', agencyId)
      .in('tenant_id', tenantIds);

    const voucherMap: Record<string, any> = {};
    (vouchers || []).forEach((v: any) => { voucherMap[v.tenant_id] = v; });

    // Get agency PHA code
    const { data: agency } = await supabase
      .from('housing_authorities')
      .select('pha_code')
      .eq('id', agencyId)
      .single();

    const phaCode = (agency as any)?.pha_code || '';

    if (format === 'fixed_width') {
      const records: HUD50058Record[] = leases.map((l: any) => {
        const p = profileMap[l.tenant_id] || {};
        const v = voucherMap[l.tenant_id] || {};
        return {
          pha_code: phaCode,
          family_id: l.tenant_id?.slice(0, 9) || '',
          head_name: p.full_name || '',
          dob: p.date_of_birth || '',
          household_size: p.household_size || '1',
          annual_income: p.annual_income || '0',
          voucher_number: v.voucher_number || '',
          voucher_type: v.voucher_type || 'HCV',
          move_in_date: p.move_in_date || l.lease_start || '',
          bedroom_size: l.bedroom_count || '1',
          gross_rent: l.total_monthly_rent || '0',
          utility_allowance: l.utility_allowance || '0',
          hap_amount: l.hap_amount || '0',
          tenant_rent: l.tenant_portion || '0',
          total_rent: l.total_monthly_rent || '0',
          lease_start: l.lease_start || '',
          lease_end: l.lease_end || '',
          disability: p.disability_status || 'N',
          race_ethnicity: p.race_ethnicity || '',
        };
      });

      const warnings = validate50058Records(records);
      setValidationWarnings(warnings);
      setRecordCount(records.length);
      exportHUD50058FixedWidth(records, `HUD-50058-${agencyId.slice(0, 8)}`);
    } else {
      const headers = [
        'Family_ID', 'Head_of_Household', 'DOB', 'Household_Size',
        'Annual_Income', 'Voucher_Number', 'Voucher_Type',
        'Move_In_Date', 'Bedroom_Size', 'Gross_Rent',
        'Utility_Allowance', 'HAP_Amount', 'Tenant_Rent',
        'Total_Monthly_Rent', 'Lease_Start', 'Lease_End',
        'Disability_Status', 'Race_Ethnicity'
      ];

      const rows = leases.map((l: any) => {
        const p = profileMap[l.tenant_id] || {};
        const v = voucherMap[l.tenant_id] || {};
        return [
          l.tenant_id?.slice(0, 8) || '',
          p.full_name || '',
          p.date_of_birth || '',
          p.household_size || '',
          p.annual_income || '',
          v.voucher_number || '',
          v.voucher_type || '',
          p.move_in_date || l.lease_start || '',
          l.bedroom_count || '',
          l.total_monthly_rent || '',
          l.utility_allowance || '0',
          l.hap_amount || '',
          l.tenant_portion || '',
          l.total_monthly_rent || '',
          l.lease_start || '',
          l.lease_end || '',
          p.disability_status || '',
          p.race_ethnicity || '',
        ];
      });

      setRecordCount(rows.length);
      exportCSV([headers, ...rows], `HUD-50058-Export-${agencyId.slice(0, 8)}`);
    }

    setLoading(false);
  };

  return { fetchAndExport, loading, recordCount, validationWarnings };
}
