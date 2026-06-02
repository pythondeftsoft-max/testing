import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';

interface CustomerPlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSubscribe: (planId: string) => void;
  isSubscribing?: boolean;
}

export const CustomerPlanCard = ({ plan, isCurrentPlan, onSubscribe, isSubscribing }: CustomerPlanCardProps) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const formatPrice = () => {
    if (plan.price === 0) return 'Free';
    return `$${(plan.price / 100).toFixed(2)}/${plan.billing_interval}`;
  };

  return (
    <Card className={`relative ${isCurrentPlan ? 'border-primary ring-2 ring-primary' : ''} ${!plan.is_active ? 'opacity-60' : ''}`}>
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {plan.name}
              {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
              <Badge variant="outline">{plan.role}</Badge>
            </CardTitle>
            <CardDescription>{plan.target_audience || 'No audience specified'}</CardDescription>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-2xl font-bold whitespace-nowrap">{formatPrice()}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        {plan.features && plan.features.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Features</h4>
            <ul className="text-sm space-y-1.5">
              {(showAllFeatures ? plan.features : plan.features.slice(0, 5)).map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            {plan.features.length > 5 && (
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="text-xs text-primary hover:text-primary/80 hover:underline mt-2 transition-colors"
              >
                {showAllFeatures 
                  ? '← Show less' 
                  : `Show ${plan.features.length - 5} more features →`
                }
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {plan.limits?.properties && (
            <Badge variant="secondary">
              Properties: {plan.limits.properties === 'unlimited' ? '∞' : plan.limits.properties}
            </Badge>
          )}
          {plan.limits?.applications && (
            <Badge variant="secondary">
              Applications: {plan.limits.applications === 'unlimited' ? '∞' : plan.limits.applications}
            </Badge>
          )}
          {plan.limits?.managementUnits && (
            <Badge variant="secondary">
              Management Units: {plan.limits.managementUnits === 'unlimited' ? '∞' : plan.limits.managementUnits}
            </Badge>
          )}
        </div>

        <div className="pt-2">
          {isCurrentPlan ? (
            <Button 
              variant="outline" 
              className="w-full" 
              disabled
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Current Plan
            </Button>
          ) : (
            <Button
              variant={plan.is_active ? "default" : "secondary"}
              className="w-full"
              onClick={() => onSubscribe(plan.id)}
              disabled={!plan.is_active || isSubscribing}
            >
              {isSubscribing ? 'Processing...' : 'Subscribe'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
