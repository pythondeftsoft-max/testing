import { useState } from 'react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { CustomerPlanCard } from './CustomerPlanCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LandlordSubscriptionPlansGridProps {
  userId: string;
  currentPlanId?: string;
}

export const LandlordSubscriptionPlansGrid = ({ userId, currentPlanId }: LandlordSubscriptionPlansGridProps) => {
  const { data: plans, isLoading } = useSubscriptionPlans('landlord');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planId: string) => {
    setSubscribingPlanId(planId);
    
    try {
      const plan = plans?.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Handle free plans - direct activation
      if (plan.price === 0) {
        toast({
          title: "Free Plan",
          description: "Contact support to activate your free plan.",
        });
        setSubscribingPlanId(null);
        return;
      }

      // Handle Stripe-integrated plans
      if (plan.stripe_product_id && plan.stripe_price_id) {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            planId: plan.id,
            priceId: plan.stripe_price_id,
            userId: userId,
          }
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } else {
        // Manually managed plans
        toast({
          title: "Manual Plan",
          description: "This plan requires manual activation. Please contact support to subscribe.",
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Failed",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive"
      });
    } finally {
      setSubscribingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No subscription plans available at this time.</p>
      </div>
    );
  }

  // Filter for landlord and 'both' role plans, only show active paid plans (exclude free and white label)
  const landlordPlans = plans.filter(p => 
    (p.role === 'landlord' || p.role === 'both') && 
    p.is_active && 
    p.price > 0 && // Exclude free plans
    !p.name.toLowerCase().includes('white label') // Exclude white label (has its own tab)
  );

  // Sort plans by price
  const sortedPlans = [...landlordPlans].sort((a, b) => a.price - b.price);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Available Plans</h3>
        <p className="text-sm text-muted-foreground">
          Choose the plan that best fits your property management needs
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPlans.map((plan) => (
          <CustomerPlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlanId === plan.id}
            onSubscribe={handleSubscribe}
            isSubscribing={subscribingPlanId === plan.id}
          />
        ))}
      </div>
    </div>
  );
};
