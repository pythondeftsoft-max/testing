import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  type: 'tenant_rent' | 'hap_voucher';
  propertyAddress?: string;
  daysLate?: number;
  paymentSource?: string;
}

interface PaymentStats {
  totalPayments: number;
  onTimeRate: number;
  averageAmount: number;
  historySpanMonths: number;
  qualityBadge: 'excellent' | 'good' | 'limited' | 'none';
}

export const useTenantPaymentHistory = (tenantId: string) => {
  return useQuery({
    queryKey: ['tenant-payment-history', tenantId],
    queryFn: async () => {
      // Fetch rent payments
      const { data: rentPayments, error: rentError } = await supabase
        .from('rent_payments')
        .select(`
          id,
          amount,
          payment_date,
          status,
          payment_source,
          days_late,
          properties (
            street_address,
            city,
            state
          )
        `)
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });

      if (rentError) throw rentError;

      // Fetch HAP payments
      const { data: hapPayments, error: hapError } = await supabase
        .from('hap_payments')
        .select(`
          id,
          actual_amount,
          payment_date,
          payment_status,
          properties (
            street_address,
            city,
            state
          )
        `)
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });

      if (hapError) throw hapError;

      // Transform and combine payments
      const rentRecords: PaymentRecord[] = (rentPayments || []).map(p => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.payment_date,
        status: p.status,
        type: 'tenant_rent' as const,
        propertyAddress: p.properties 
          ? `${p.properties.street_address}, ${p.properties.city}, ${p.properties.state}`
          : 'Unknown Property',
        daysLate: p.days_late || 0,
        paymentSource: p.payment_source || 'Unknown'
      }));

      const hapRecords: PaymentRecord[] = (hapPayments || []).map(p => ({
        id: p.id,
        amount: p.actual_amount,
        paymentDate: p.payment_date,
        status: p.payment_status,
        type: 'hap_voucher' as const,
        propertyAddress: p.properties 
          ? `${p.properties.street_address}, ${p.properties.city}, ${p.properties.state}`
          : 'Unknown Property',
        paymentSource: 'HAP'
      }));

      // Combine and sort by date
      const allPayments = [...rentRecords, ...hapRecords].sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );

      // Calculate stats
      const totalPayments = allPayments.length;
      const completedPayments = allPayments.filter(p => 
        p.status === 'completed' || p.status === 'paid'
      );
      const onTimePayments = allPayments.filter(p => 
        (p.status === 'completed' || p.status === 'paid') && (p.daysLate || 0) <= 0
      );
      const onTimeRate = totalPayments > 0 ? (onTimePayments.length / totalPayments) * 100 : 0;
      
      const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const averageAmount = completedPayments.length > 0 
        ? totalAmount / completedPayments.length 
        : 0;

      // Calculate history span
      let historySpanMonths = 0;
      if (allPayments.length > 0) {
        const oldestDate = new Date(allPayments[allPayments.length - 1].paymentDate);
        const newestDate = new Date(allPayments[0].paymentDate);
        historySpanMonths = Math.round(
          (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
      }

      // Determine quality badge
      let qualityBadge: 'excellent' | 'good' | 'limited' | 'none' = 'none';
      if (totalPayments === 0) {
        qualityBadge = 'none';
      } else if (totalPayments < 6) {
        qualityBadge = 'limited';
      } else if (onTimeRate >= 95) {
        qualityBadge = 'excellent';
      } else if (onTimeRate >= 85) {
        qualityBadge = 'good';
      } else {
        qualityBadge = 'limited';
      }

      const stats: PaymentStats = {
        totalPayments,
        onTimeRate,
        averageAmount,
        historySpanMonths,
        qualityBadge
      };

      return {
        payments: allPayments,
        stats
      };
    },
    staleTime: 60000,
    enabled: !!tenantId
  });
};
