import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatusProps {
  userId: string;
  userType: string;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  role: string;
  current_period_end: string;
  stripe_customer_id?: string;
}

const SubscriptionStatus = ({ userId, userType }: SubscriptionStatusProps) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscription();
  }, [userId]);

  const fetchSubscription = async () => {
    try {
      const role = userType === 'tenant' ? 'tenant' : 'landlord';
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'past_due':
        return 'destructive';
      case 'canceled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CreditCard className="h-4 w-4" />;
      case 'past_due':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'tenant_pro':
        return 'OpenKey Tenant Pro';
      case 'landlord_starter':
        return 'OpenKey Landlord Starter';
      default:
        return planType;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading subscription...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to unlock premium features and get priority access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const expirationDate = new Date(subscription.current_period_end);
  const isExpiringSoon = expirationDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(subscription.status)}
          Current Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{getPlanDisplayName(subscription.plan_type)}</h3>
            <p className="text-sm text-muted-foreground">
              {subscription.status === 'active' ? 'Renews' : 'Expires'} on{' '}
              {expirationDate.toLocaleDateString()}
            </p>
          </div>
          <Badge variant={getStatusColor(subscription.status)}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>

        {isExpiringSoon && subscription.status === 'active' && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Subscription expiring soon
                </p>
                <p className="text-orange-700 dark:text-orange-300">
                  Your subscription will renew automatically on{' '}
                  {expirationDate.toLocaleDateString()}.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleManageSubscription}
        >
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;