import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RentCalculation {
  id: string;
  agency_id: string;
  tenant_id: string;
  lease_id: string | null;
  calculation_type: string;
  annual_gross_income: number;
  allowances: {
    dependent: number;
    elderly_disabled: number;
    childcare: number;
    medical: number;
  };
  annual_adjusted_income: number;
  monthly_adjusted_income: number;
  ttp: number;
  utility_allowance: number;
  payment_standard: number;
  gross_rent: number;
  hap_amount: number;
  tenant_portion: number;
  passes_40pct_rule: boolean;
  calculated_by: string | null;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

export interface RentCalcInput {
  tenant_id: string;
  lease_id?: string;
  calculation_type: string;
  annual_gross_income: number;
  num_dependents: number;
  is_elderly_disabled: boolean;
  childcare_expense: number;
  medical_expense: number;
  utility_allowance: number;
  payment_standard: number;
  gross_rent: number;
  effective_date: string;
  notes?: string;
}

export function computeHudRent(input: RentCalcInput) {
  const dependentAllowance = input.num_dependents * 480;
  const elderlyDisabledAllowance = input.is_elderly_disabled ? 400 : 0;
  const childcareAllowance = input.childcare_expense;
  
  // Medical: only amount exceeding 3% of gross income (elderly/disabled only)
  const medicalThreshold = input.is_elderly_disabled ? input.annual_gross_income * 0.03 : 0;
  const medicalAllowance = input.is_elderly_disabled 
    ? Math.max(0, input.medical_expense - medicalThreshold) 
    : 0;

  const totalAllowances = dependentAllowance + elderlyDisabledAllowance + childcareAllowance + medicalAllowance;
  const annualAdjustedIncome = Math.max(0, input.annual_gross_income - totalAllowances);
  const monthlyAdjustedIncome = annualAdjustedIncome / 12;

  // TTP = greater of 30% of monthly adjusted income or 10% of monthly gross income
  const ttp30 = monthlyAdjustedIncome * 0.30;
  const ttp10 = (input.annual_gross_income / 12) * 0.10;
  const ttp = Math.max(ttp30, ttp10);

  // HAP = lesser of (payment standard - TTP) or (gross rent - TTP)
  const hapFromStandard = Math.max(0, input.payment_standard - ttp);
  const hapFromRent = Math.max(0, input.gross_rent - ttp);
  const hap_amount = Math.min(hapFromStandard, hapFromRent);

  // Tenant portion = gross rent - HAP
  const tenant_portion = Math.max(0, input.gross_rent - hap_amount);

  // 40% rule: at initial lease-up, tenant portion cannot exceed 40% of monthly adjusted income
  const maxTenantPortion = monthlyAdjustedIncome * 0.40;
  const passes_40pct_rule = input.calculation_type !== 'initial' || tenant_portion <= maxTenantPortion;

  return {
    allowances: {
      dependent: dependentAllowance,
      elderly_disabled: elderlyDisabledAllowance,
      childcare: childcareAllowance,
      medical: medicalAllowance,
    },
    annual_adjusted_income: Math.round(annualAdjustedIncome * 100) / 100,
    monthly_adjusted_income: Math.round(monthlyAdjustedIncome * 100) / 100,
    ttp: Math.round(ttp * 100) / 100,
    hap_amount: Math.round(hap_amount * 100) / 100,
    tenant_portion: Math.round(tenant_portion * 100) / 100,
    passes_40pct_rule,
  };
}

export function useRentCalculations(agencyId: string) {
  const [calculations, setCalculations] = useState<RentCalculation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalcs = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('rent_calculations')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) toast.error('Failed to load rent calculations');
    setCalculations((data as unknown as RentCalculation[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchCalcs(); }, [fetchCalcs]);

  const saveCalculation = async (input: RentCalcInput, staffId: string) => {
    const computed = computeHudRent(input);
    const record = {
      agency_id: agencyId,
      tenant_id: input.tenant_id,
      lease_id: input.lease_id || null,
      calculation_type: input.calculation_type as any,
      annual_gross_income: input.annual_gross_income,
      allowances: computed.allowances as any,
      annual_adjusted_income: computed.annual_adjusted_income,
      monthly_adjusted_income: computed.monthly_adjusted_income,
      ttp: computed.ttp,
      utility_allowance: input.utility_allowance,
      payment_standard: input.payment_standard,
      gross_rent: input.gross_rent,
      hap_amount: computed.hap_amount,
      tenant_portion: computed.tenant_portion,
      passes_40pct_rule: computed.passes_40pct_rule,
      calculated_by: staffId,
      effective_date: input.effective_date,
      notes: input.notes || null,
    };

    const { error } = await supabase.from('rent_calculations').insert(record as any);
    if (error) { toast.error('Failed to save rent calculation'); return false; }
    toast.success('Rent calculation saved');

    // Auto-sync to active HAP contract for this tenant
    const hapUpdated = await syncToHapContract(input.tenant_id, {
      hap_amount: computed.hap_amount,
      tenant_rent: computed.tenant_portion,
      gross_rent: input.gross_rent,
      utility_allowance: input.utility_allowance,
    });

    fetchCalcs();
    return hapUpdated;
  };

  const syncToHapContract = async (
    tenantId: string,
    updates: { hap_amount: number; tenant_rent: number; gross_rent: number; utility_allowance: number }
  ): Promise<boolean> => {
    const { data: contracts, error: fetchErr } = await supabase
      .from('agency_hap_contracts')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (fetchErr || !contracts || contracts.length === 0) {
      toast.info('No active HAP contract found for this tenant — HAP amounts not auto-updated');
      return false;
    }

    const { error: updateErr } = await supabase
      .from('agency_hap_contracts')
      .update({
        hap_amount: updates.hap_amount,
        tenant_rent: updates.tenant_rent,
        gross_rent: updates.gross_rent,
        utility_allowance: updates.utility_allowance,
      })
      .eq('agency_id', agencyId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (updateErr) {
      toast.error('Failed to update HAP contract');
      return false;
    }

    toast.success('HAP contract auto-updated with new amounts');
    return true;
  };

  return { calculations, loading, refetch: fetchCalcs, saveCalculation };
}
