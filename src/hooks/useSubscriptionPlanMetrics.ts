import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlanMetrics {
  planType: string;
  activeSubscribers: number;
  monthlyRevenue: number;
  percentageOfTotal: number;
}

export const useSubscriptionPlanMetrics = () => {
  return useQuery({
    queryKey: ['subscription-plan-metrics'],
    queryFn: async () => {
      // Fetch all active subscriptions
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('status', 'active');

      if (error) throw error;

      // Group by plan_type and calculate metrics
      const planCounts: Record<string, number> = {};
      subscriptions?.forEach((sub) => {
        const planType = sub.plan_type || 'free';
        planCounts[planType] = (planCounts[planType] || 0) + 1;
      });

      const totalSubscribers = subscriptions?.length || 0;

      // Calculate metrics for each plan
      const metrics: PlanMetrics[] = Object.entries(planCounts).map(([planType, count]) => {
        const prices: Record<string, number> = {
          free: 0,
          tenant_pro: 9.99,
          basic: 29,
          pro: 99,
          premium: 199,
          white_label: 499,
        };

        return {
          planType,
          activeSubscribers: count,
          monthlyRevenue: count * (prices[planType] || 0),
          percentageOfTotal: totalSubscribers > 0 ? (count / totalSubscribers) * 100 : 0,
        };
      });

      // Calculate totals
      const totalMRR = metrics.reduce((sum, m) => sum + m.monthlyRevenue, 0);
      const totalARR = totalMRR * 12;

      return {
        metrics,
        totals: {
          totalSubscribers,
          totalMRR,
          totalARR,
        },
      };
    },
  });
};
