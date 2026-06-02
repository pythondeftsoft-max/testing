
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlacementFeesMetrics {
  pendingCount: number;
  pendingAmount: number;
  paidThisMonth: number;
  paidThisMonthAmount: number;
  avgFeeAmount: number;
  totalPaidFees: number;
  overdueCount: number;
  overdueAmount: number;
  totalPlacements: number;
  paymentMethodBreakdown: {
    stripe: number;
    plaid: number;
    check: number;
    wire: number;
    ach: number;
    cash: number;
    other: number;
  };
  adminListedCount: number;
  selfListedCount: number;
}

export const usePlacementFeesAnalytics = () => {
  return useQuery({
    queryKey: ['placement-fees-analytics'],
    queryFn: async (): Promise<PlacementFeesMetrics> => {
      const { data: fees, error } = await supabase
        .from('landlord_placement_fees')
        .select('fee_amount, due_date, payment_status, payment_date, payment_method, stripe_payment_intent_id, plaid_transaction_id, admin_listed');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const twentyOneDaysAgo = new Date(today);
      twentyOneDaysAgo.setDate(today.getDate() - 21);
      
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      let pendingCount = 0;
      let pendingAmount = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      let paidThisMonth = 0;
      let paidThisMonthAmount = 0;
      let totalFeeAmount = 0;
      let totalPaidAmount = 0;
      let adminListedCount = 0;
      let selfListedCount = 0;

      const paymentMethodBreakdown = {
        stripe: 0,
        plaid: 0,
        check: 0,
        wire: 0,
        ach: 0,
        cash: 0,
        other: 0
      };

      fees?.forEach((fee) => {
        totalFeeAmount += fee.fee_amount || 0;

        // Track admin vs self-listed
        if (fee.admin_listed) {
          adminListedCount++;
        } else {
          selfListedCount++;
        }

        if (fee.payment_status === 'pending') {
          pendingCount++;
          pendingAmount += fee.fee_amount || 0;
          
          const dueDate = new Date(fee.due_date);
          if (dueDate < twentyOneDaysAgo) {
            overdueCount++;
            overdueAmount += fee.fee_amount || 0;
          }
        }

        if (fee.payment_status === 'paid') {
          totalPaidAmount += fee.fee_amount || 0;
          
          // Track payment methods
          if (fee.stripe_payment_intent_id) {
            paymentMethodBreakdown.stripe++;
          } else if (fee.plaid_transaction_id) {
            paymentMethodBreakdown.plaid++;
          } else if (fee.payment_method) {
            const method = fee.payment_method.toLowerCase();
            if (method === 'check') paymentMethodBreakdown.check++;
            else if (method === 'wire') paymentMethodBreakdown.wire++;
            else if (method === 'ach') paymentMethodBreakdown.ach++;
            else if (method === 'cash') paymentMethodBreakdown.cash++;
            else paymentMethodBreakdown.other++;
          }
          
          if (fee.payment_date) {
            const paymentDate = new Date(fee.payment_date);
            if (paymentDate >= currentMonth && paymentDate < nextMonth) {
              paidThisMonth++;
              paidThisMonthAmount += fee.fee_amount || 0;
            }
          }
        }
      });

      const avgFeeAmount = fees?.length ? totalFeeAmount / fees.length : 0;
      const totalPlacements = fees?.length || 0;

      return {
        pendingCount,
        pendingAmount,
        paidThisMonth,
        paidThisMonthAmount,
        avgFeeAmount,
        totalPaidFees: totalPaidAmount,
        overdueCount,
        overdueAmount,
        totalPlacements,
        paymentMethodBreakdown,
        adminListedCount,
        selfListedCount,
      };
    },
    retry: (failureCount, error) => {
      if ((error as any)?.code === 'PGRST301') return false;
      return failureCount < 3;
    },
  });
};
