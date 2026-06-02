import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VendorPaymentRecord {
  id: string;
  amount: number;
  paid_at: string | null;
  payment_method: string | null;
  memo: string | null;
  recipient_name: string | null;
  vendor_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  maintenance_request_id: string | null;
  request_title?: string;
  request_status?: string;
  property_address?: string;
  vendor_name?: string;
}

export interface VendorCostSummary {
  vendor_name: string;
  total_cost: number;
  payment_count: number;
}

export interface VendorPaymentAnalyticsData {
  payments: VendorPaymentRecord[];
  vendorSummaries: VendorCostSummary[];
  totalSpend: number;
  paymentCount: number;
  topVendor: string | null;
  avgCostPerRequest: number;
  vendors: { id: string; name: string }[];
}

export const useVendorPaymentAnalytics = (userId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['vendor-payment-analytics', userId, portfolioId],
    queryFn: async (): Promise<VendorPaymentAnalyticsData> => {
      // Fetch vendor payment records with related data
      let query = supabase
        .from('vendor_payment_records')
        .select(`
          *,
          maintenance_requests (
            title,
            status
          ),
          properties (
            address
          ),
          maintenance_vendors (
            company_name
          )
        `)
        .eq('landlord_id', userId)
        .order('paid_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: paymentsData, error: paymentsError } = await query;

      if (paymentsError) throw paymentsError;

      // Transform data
      const payments: VendorPaymentRecord[] = (paymentsData || []).map((p: any) => ({
        id: p.id,
        amount: p.amount || 0,
        paid_at: p.paid_at,
        payment_method: p.payment_method,
        memo: p.memo,
        recipient_name: p.recipient_name,
        vendor_id: p.vendor_id,
        property_id: p.property_id,
        unit_id: p.unit_id,
        maintenance_request_id: p.maintenance_request_id,
        request_title: p.maintenance_requests?.title,
        request_status: p.maintenance_requests?.status,
        property_address: p.properties?.address,
        vendor_name: p.maintenance_vendors?.company_name || p.recipient_name,
      }));

      // Calculate vendor summaries
      const vendorMap = new Map<string, VendorCostSummary>();
      payments.forEach(p => {
        const vendorName = p.vendor_name || p.recipient_name || 'Unknown Vendor';
        const existing = vendorMap.get(vendorName);
        if (existing) {
          existing.total_cost += p.amount;
          existing.payment_count += 1;
        } else {
          vendorMap.set(vendorName, {
            vendor_name: vendorName,
            total_cost: p.amount,
            payment_count: 1,
          });
        }
      });

      const vendorSummaries = Array.from(vendorMap.values())
        .sort((a, b) => b.total_cost - a.total_cost);

      // Calculate stats
      const totalSpend = payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentCount = payments.length;
      const topVendor = vendorSummaries.length > 0 ? vendorSummaries[0].vendor_name : null;
      const avgCostPerRequest = paymentCount > 0 ? totalSpend / paymentCount : 0;

      // Get unique vendors for filter
      const vendors = vendorSummaries.map(v => ({
        id: v.vendor_name,
        name: v.vendor_name,
      }));

      return {
        payments,
        vendorSummaries,
        totalSpend,
        paymentCount,
        topVendor,
        avgCostPerRequest,
        vendors,
      };
    },
    enabled: !!userId,
  });
};
