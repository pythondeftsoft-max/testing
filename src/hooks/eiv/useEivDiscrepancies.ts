import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EivDiscrepancy {
  id: string;
  agency_id: string;
  eiv_record_id: string | null;
  import_id: string | null;
  tenant_id: string | null;
  tenant_display_name: string | null;
  declared_amount: number;
  eiv_amount: number;
  variance_amount: number;
  variance_pct: number;
  status: 'open' | 'under_review' | 'resolved' | 'false_positive';
  assigned_caseworker_id: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EivImport {
  id: string;
  agency_id: string;
  file_name: string;
  period_label: string | null;
  tax_year: number | null;
  quarter: number | null;
  row_count: number;
  matched_count: number;
  discrepancy_count: number;
  status: string;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
}

export const useEivDiscrepancies = (agencyId: string, statusFilter?: string) => {
  return useQuery({
    queryKey: ['eiv-discrepancies', agencyId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('agency_eiv_discrepancies')
        .select('*')
        .eq('agency_id', agencyId)
        .order('variance_pct', { ascending: false });
      if (statusFilter && statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EivDiscrepancy[];
    },
    enabled: !!agencyId,
  });
};

export const useEivImports = (agencyId: string) => {
  return useQuery({
    queryKey: ['eiv-imports', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_eiv_imports')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EivImport[];
    },
    enabled: !!agencyId,
  });
};

export const useResolveDiscrepancy = (agencyId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: EivDiscrepancy['status'];
      notes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('agency_eiv_discrepancies')
        .update({
          status,
          resolution_notes: notes ?? null,
          resolved_by: status === 'resolved' || status === 'false_positive' ? u.user?.id : null,
          resolved_at: status === 'resolved' || status === 'false_positive' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eiv-discrepancies', agencyId] });
      toast.success('Discrepancy updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });
};

export const useCreateEivImport = (agencyId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      file_name: string;
      period_label?: string;
      tax_year?: number;
      quarter?: number;
      records: Array<{
        tenant_ssn_last_four?: string;
        tenant_first_name?: string;
        tenant_last_name?: string;
        reported_employer?: string;
        reported_amount: number;
        income_source?: string;
        period_label?: string;
      }>;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: imp, error: e1 } = await supabase
        .from('agency_eiv_imports')
        .insert({
          agency_id: agencyId,
          file_name: params.file_name,
          period_label: params.period_label,
          tax_year: params.tax_year,
          quarter: params.quarter,
          row_count: params.records.length,
          status: 'processing',
          uploaded_by: u.user?.id,
        })
        .select()
        .single();
      if (e1) throw e1;

      if (params.records.length > 0) {
        const { error: e2 } = await supabase.from('agency_eiv_records').insert(
          params.records.map(r => ({
            agency_id: agencyId,
            import_id: imp.id,
            ...r,
          }))
        );
        if (e2) throw e2;
      }

      await supabase
        .from('agency_eiv_imports')
        .update({ status: 'completed' })
        .eq('id', imp.id);

      return imp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eiv-imports', agencyId] });
      qc.invalidateQueries({ queryKey: ['eiv-discrepancies', agencyId] });
      toast.success('EIV import completed');
    },
    onError: (e: any) => toast.error(e.message || 'Import failed'),
  });
};
