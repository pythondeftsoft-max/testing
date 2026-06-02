import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LiveCustomerStats {
  tenants: number;
  landlords: number;
  staff: number;
  contract: {
    id: string;
    monthly_rate: number | null;
    setup_fee: number | null;
    billing_cycle: string | null;
    billing_day_of_month: number | null;
    term_months: number | null;
    contract_start: string | null;
    contract_end: string | null;
    auto_renew: boolean | null;
    signed_pdf_url: string | null;
    signed_at: string | null;
    billing_contact_name: string | null;
    billing_contact_email: string | null;
    po_number: string | null;
    payment_terms: string | null;
    status: string | null;
  } | null;
  staffByRole: Record<string, number>;
  lastInvoice: {
    id: string;
    invoice_number: string | null;
    amount: number | null;
    status: string | null;
    issued_date: string | null;
    due_date: string | null;
    paid_date: string | null;
  } | null;
  recentInvoices: Array<{
    id: string;
    invoice_number: string | null;
    amount: number | null;
    status: string | null;
    issued_date: string | null;
    paid_date: string | null;
  }>;
}

export function useLiveCustomerStats(agencyId?: string | null) {
  return useQuery({
    queryKey: ['live-customer-stats', agencyId],
    enabled: !!agencyId,
    staleTime: 60_000,
    queryFn: async (): Promise<LiveCustomerStats> => {
      if (!agencyId) throw new Error('no agency');

      const tenantsCountRes = await (supabase as any)
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('assigned_agency_id', agencyId);

      const [landlordsRes, staffRes, contractRes, invoicesRes] = await Promise.all([
        supabase
          .from('agency_landlord_links')
          .select('landlord_id')
          .eq('agency_id', agencyId)
          .eq('status', 'active'),
        supabase
          .from('agency_staff')
          .select('role')
          .eq('agency_id', agencyId)
          .eq('is_active', true),
        supabase
          .from('agency_contracts')
          .select('id, monthly_rate, setup_fee, billing_cycle, billing_day_of_month, term_months, contract_start, contract_end, auto_renew, signed_pdf_url, signed_at, billing_contact_name, billing_contact_email, po_number, payment_terms, status')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('agency_invoices')
          .select('id, invoice_number, amount, status, issued_date, due_date, paid_date')
          .eq('agency_id', agencyId)
          .order('issued_date', { ascending: false, nullsFirst: false })
          .limit(3),
      ]);

      const distinctLandlords = new Set((landlordsRes.data || []).map((r: any) => r.landlord_id)).size;
      const staffByRole: Record<string, number> = {};
      (staffRes.data || []).forEach((s: any) => {
        const k = s.role || 'unknown';
        staffByRole[k] = (staffByRole[k] || 0) + 1;
      });

      const recent = invoicesRes.data || [];
      return {
        tenants: tenantsCountRes.count || 0,
        landlords: distinctLandlords,
        staff: (staffRes.data || []).length,
        staffByRole,
        contract: (contractRes.data as any) || null,
        lastInvoice: (recent[0] as any) || null,
        recentInvoices: recent as any,
      };
    },
  });
}
