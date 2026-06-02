import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyLimits } from '@/hooks/usePropertyLimits';

interface SubscriptionPlanCardProps {
  role: 'tenant' | 'landlord';
  isCurrentPlan?: boolean;
  hasActiveSubscription?: boolean;
  loading?: boolean;
  userId?: string;
  userType?: string;
}

const PLANS = {
  tenant: {
    name: "Tenant Plus Plan",
    price: 15,
    description: "Unlimited applications and priority placement for faster housing matches",
    features: [
      "Unlimited property applications",
      "Priority placement in application queue", 
      "Enhanced profile visibility to landlords",
      "No weekly application limits",
      "Priority customer support"
    ]
  },
  landlord: {
    name: "OpenKey Landlord Per-Unit",
    price: 1.43,
    description: "Pay per property over your 10 free properties",
    features: [
      "First 10 properties free",
      "$1.43/month per additional property",
      "Request tenant functionality",
      "Cash flow tracking widgets",
      "Portfolio metrics dashboard", 
      "Advanced property analytics",
      "Tenant application management"
    ]
  }
};

const SubscriptionPlanCard = ({ 
  role, 
  isCurrentPlan = false, 
  hasActiveSubscription = false,
  loading = false,
  userId,
  userType
}: SubscriptionPlanCardProps) => {
  const { toast } = useToast();
  const plan = PLANS[role];
  const { propertyLimits } = usePropertyLimits(userId, userType);
  
  // Calculate dynamic pricing for landlords
  const getDynamicPrice = () => {
    if (role === 'tenant') return plan.price;
    
    if (propertyLimits?.billable_units_count) {
      return (propertyLimits.billable_units_count * plan.price).toFixed(2);
    }
    
    return plan.price.toFixed(2);
  };
  
  const getPriceDescription = () => {
    if (role === 'tenant') return '/month';
    
    if (propertyLimits?.billable_units_count && propertyLimits.billable_units_count > 0) {
      return `/month for ${propertyLimits.billable_units_count} billable ${propertyLimits.billable_units_count === 1 ? 'property' : 'properties'}`;
    }
    
    return '/month per property over 10';
  };

  const handleSubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { role }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
      {isCurrentPlan && (
        <Badge 
          variant="default" 
          className="absolute -top-2 left-1/2 transform -translate-x-1/2"
        >
          Current Plan
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {plan.name}
          {role === 'tenant' && (
            <Badge variant="secondary">Popular</Badge>
          )}
        </CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold">${getDynamicPrice()}</span>
          <span className="text-muted-foreground">{getPriceDescription()}</span>
        </CardDescription>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        {isCurrentPlan ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleManageSubscription}
            disabled={loading}
          >
            Manage Subscription
          </Button>
        ) : hasActiveSubscription ? (
          <Button variant="outline" className="w-full" disabled>
            <Lock className="h-4 w-4 mr-2" />
            Different Plan Active
          </Button>
        ) : (
          <Button 
            className="w-full"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Subscribe Now'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionPlanCard;