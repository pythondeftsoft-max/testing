
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Minus, CreditCard } from 'lucide-react';
import { useTenantSubscription } from '@/hooks/useTenantSubscription';

interface AdminSubscriptionManagerProps {
  tenantId: string;
  onUpdated: () => void;
}

export const AdminSubscriptionManager: React.FC<AdminSubscriptionManagerProps> = ({
  tenantId,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState('tenant_pro');
  const [months, setMonths] = useState(1);
  const { toast } = useToast();
  const { data: subscription, refetch } = useTenantSubscription(tenantId);

  const handleGrantSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_grant_tenant_subscription', {
        p_user_id: tenantId,
        p_plan_type: planType,
        p_months: months
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${planType} subscription granted for ${months} month(s).`,
      });

      refetch();
      onUpdated();
    } catch (error) {
      console.error('Error granting subscription:', error);
      toast({
        title: "Error",
        description: "Failed to grant subscription.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_cancel_subscription', {
        p_subscription_id: subscription.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription has been canceled.",
      });

      refetch();
      onUpdated();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{subscription.plan_type}</span>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {subscription.current_period_end ? (
                    <>Expires: {new Date(subscription.current_period_end).toLocaleDateString()}</>
                  ) : (
                    'No expiration date'
                  )}
                </div>
                {subscription.stripe_subscription_id && (
                  <div className="text-xs text-gray-500 mt-1">
                    Stripe ID: {subscription.stripe_subscription_id}
                  </div>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={loading || subscription.status !== 'active'}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No active subscription</p>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Grant New Subscription</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan_type">Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_pro">Tenant Pro</SelectItem>
                  <SelectItem value="tenant_basic">Tenant Basic</SelectItem>
                  <SelectItem value="tenant_premium">Tenant Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="months">Duration (Months)</Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="12"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <Button
            className="w-full mt-3"
            onClick={handleGrantSubscription}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Grant Subscription
          </Button>
        </div>

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
          <strong>Note:</strong> For Stripe-managed subscriptions, use the customer portal or Stripe dashboard for modifications.
          Manual subscriptions created here are for administrative purposes only.
        </div>
      </CardContent>
    </Card>
  );
};
