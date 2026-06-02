import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HAPStatementLineItem {
  property_name: string;
  unit_number: string;
  hap_amount: number;
  adjustment_amount: number;
  net_payment: number;
  tenant_ref: string; // anonymized
}

export interface HAPStatement {
  id: string;
  landlord_id: string;
  agency_id: string;
  statement_month: string;
  line_items: HAPStatementLineItem[];
  total_amount: number;
  pdf_path: string | null;
  generated_by: string | null;
  created_at: string;
}

export function useHAPStatements(landlordId: string | null) {
  const [statements, setStatements] = useState<HAPStatement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatements = useCallback(async () => {
    if (!landlordId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('landlord_hap_statements')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('statement_month', { ascending: false });

    if (error) {
      console.error('Failed to load HAP statements:', error);
    }
    setStatements((data as unknown as HAPStatement[]) || []);
    setLoading(false);
  }, [landlordId]);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  return { statements, loading, refetch: fetchStatements };
}

export function useAgencyHAPStatements(agencyId: string) {
  const [statements, setStatements] = useState<HAPStatement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('landlord_hap_statements')
      .select('*')
      .eq('agency_id', agencyId)
      .order('statement_month', { ascending: false });

    if (error) {
      console.error('Failed to load HAP statements:', error);
    }
    setStatements((data as unknown as HAPStatement[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  const generateStatement = async (
    landlordId: string,
    statementMonth: string,
    lineItems: HAPStatementLineItem[],
    totalAmount: number,
    staffId: string
  ) => {
    const { error } = await supabase
      .from('landlord_hap_statements')
      .insert({
        landlord_id: landlordId,
        agency_id: agencyId,
        statement_month: statementMonth,
        line_items: lineItems as any,
        total_amount: totalAmount,
        generated_by: staffId,
      });

    if (error) {
      toast.error('Failed to generate statement');
      return false;
    }
    toast.success('Statement generated');
    await fetchStatements();
    return true;
  };

  return { statements, loading, generateStatement, refetch: fetchStatements };
}
