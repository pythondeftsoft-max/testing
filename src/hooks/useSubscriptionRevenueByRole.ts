import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_PRICING } from './useSubscriptionPricing';

interface RevenueByRole {
  tenant: {
    count: number;
    revenue: number;
  };
  landlord: {
    count: number;
    revenue: number;
  };
  total: {
    count: number;
    revenue: number;
  };
}

export const useSubscriptionRevenueByRole = () => {
  return useQuery({
    queryKey: ['subscription-revenue-by-role'],
    queryFn: async (): Promise<RevenueByRole> => {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          plan_type,
          subscription_units,
          profiles!inner (user_type)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const result: RevenueByRole = {
        tenant: { count: 0, revenue: 0 },
        landlord: { count: 0, revenue: 0 },
        total: { count: 0, revenue: 0 }
      };

      subscriptions?.forEach((sub: any) => {
        const planType = sub.plan_type?.toLowerCase() || 'free_landlord';
        const pricingInfo = PLAN_PRICING[planType as keyof typeof PLAN_PRICING];
        const units = sub.subscription_units || 1;
        
        let revenue = 0;
        if (pricingInfo) {
          revenue = pricingInfo.isPerUnit 
            ? pricingInfo.perUnit * units 
            : pricingInfo.base;
        }

        const userType = sub.profiles?.user_type;
        
        if (userType === 'tenant') {
          result.tenant.count++;
          result.tenant.revenue += revenue;
        } else if (userType === 'landlord') {
          result.landlord.count++;
          result.landlord.revenue += revenue;
        }

        result.total.count++;
        result.total.revenue += revenue;
      });

      return result;
    },
  });
};
