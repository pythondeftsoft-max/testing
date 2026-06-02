import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SubscriptionStatus from '@/components/SubscriptionStatus';

import PropertyLimitWarning from '@/components/PropertyLimitWarning';
import { featureFlags } from '@/config/featureFlags';
import { AddPaymentMethodModal } from '@/components/AddPaymentMethodModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Calendar, AlertTriangle, CheckCircle, Settings, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutopay } from '@/hooks/useAutopay';
import { SubscriptionAutopayStatusCard } from '@/components/SubscriptionAutopayStatusCard';
import { SubscriptionAutopaySetupModal } from '@/components/SubscriptionAutopaySetupModal';
import { BackgroundCheckPurchaseCard } from '@/components/BackgroundCheckPurchaseCard';
import { LandlordSubscriptionPlansGrid } from '@/components/subscriptions/LandlordSubscriptionPlansGrid';
import { useHasActivePlans } from '@/hooks/useHasActivePlans';

interface SubscriptionManagerProps {
  userId: string;
  userType: string;
}

const SubscriptionManager = ({ userId, userType }: SubscriptionManagerProps) => {
  // Hide landlord subscription UI when feature flag is disabled
  if (userType === 'landlord' && !featureFlags.landlordSubscriptionUiEnabled) {
    return null;
  }
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autopaySchedules, setAutopaySchedules] = useState<any[]>([]);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showSubscriptionAutopayModal, setShowSubscriptionAutopayModal] = useState(false);
  const [editingSubscriptionSchedule, setEditingSubscriptionSchedule] = useState<any>(null);
  const { toast } = useToast();
  const { 
    paymentMethods, 
    subscriptionAutopaySchedules, 
    refreshData,
    setupSubscriptionAutopay,
    updateSubscriptionAutopaySchedule,
    deleteSubscriptionAutopaySchedule,
    toggleSubscriptionAutopayStatus
  } = useAutopay();
  const { data: hasActivePlans } = useHasActivePlans(userType === 'tenant' ? 'tenant' : 'landlord');

  useEffect(() => {
    if (userId) {
      fetchSubscription();
      fetchAutopaySchedules();
      refreshData();
    }
  }, [userId]);

  const fetchSubscription = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const role = userProfile?.user_type === 'tenant' ? 'tenant' : 'landlord';

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data?.[0] || null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchAutopaySchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_autopay_schedules')
        .select(`
          *,
          subscriptions!inner(
            id,
            plan_type,
            status
          )
        `)
        .eq('subscriptions.user_id', userId);

      if (!error && data) {
        setAutopaySchedules(data);
      }
    } catch (error) {
      console.error('Error fetching autopay schedules:', error);
    }
  };

  const handleSetupSubscriptionAutopay = async (planType: string, amount: number) => {
    if (!subscription || paymentMethods.length === 0) {
      toast({
        title: "Setup Required",
        description: "Please add a payment method first.",
        variant: "destructive"
      });
      return;
    }

    setShowSubscriptionAutopayModal(true);
  };

  const handleEditSubscriptionAutopay = (schedule: any) => {
    setEditingSubscriptionSchedule(schedule);
    setShowSubscriptionAutopayModal(true);
  };

  const handleToggleSubscriptionAutopay = async (scheduleId: string, isActive: boolean) => {
    await toggleSubscriptionAutopayStatus(scheduleId, isActive ? 'active' : 'paused');
  };

  const handleDeleteSubscriptionAutopay = async (scheduleId: string) => {
    await deleteSubscriptionAutopaySchedule(scheduleId);
  };

  const handleSubscriptionAutopaySuccess = () => {
    refreshData();
    fetchSubscription();
    setEditingSubscriptionSchedule(null);
  };

  const toggleAutopayStatus = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('subscription_autopay_schedules')
        .update({ status: newStatus })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Autopay Updated",
        description: `Autopay has been ${newStatus === 'active' ? 'activated' : 'paused'}.`,
      });

      fetchAutopaySchedules();
    } catch (error) {
      console.error('Error updating autopay:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update autopay status.",
        variant: "destructive"
      });
    }
  };

  const handleSubscribeFromWarning = () => {
    const subscriptionElement = document.getElementById('subscription-card');
    if (subscriptionElement) {
      subscriptionElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const role = userType === 'tenant' ? 'tenant' : 'landlord';
  const currentAutopay = autopaySchedules.find(schedule => schedule.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-black">Subscription Management</h2>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="autopay">Autopay</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {role === 'tenant' && (
            <>
              <SubscriptionStatus 
                userId={userId} 
                userType={role}
              />
            </>
          )}

          {role === 'landlord' && (
            <PropertyLimitWarning 
              userId={userId}
              userType={userType}
              onSubscribe={handleSubscribeFromWarning}
            />
          )}

          {hasActivePlans ? (
            <LandlordSubscriptionPlansGrid
              userId={userId}
              currentPlanId={subscription?.plan_type}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No subscription plans are currently available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="autopay" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Methods</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{method.brand} •••• {method.last_four}</p>
                            <p className="text-sm text-muted-foreground">{method.type}</p>
                          </div>
                          {method.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentMethodModal(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Payment Method
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a payment method to set up autopay for your subscription
                  </p>
                  <Button 
                    onClick={() => setShowPaymentMethodModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Autopay Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionAutopaySchedules.length > 0 ? (
                <div className="space-y-4">
                  {subscriptionAutopaySchedules.map((schedule) => (
                    <SubscriptionAutopayStatusCard
                      key={schedule.id}
                      schedule={schedule}
                      subscriptionPlan={subscription?.plan_type || 'Pro'}
                      onEdit={handleEditSubscriptionAutopay}
                      onToggle={handleToggleSubscriptionAutopay}
                      onDelete={handleDeleteSubscriptionAutopay}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Autopay Set Up</h3>
                  <p className="text-gray-600 mb-4">
                    Set up autopay to ensure your subscription never expires
                  </p>
                  {subscription && paymentMethods.length > 0 ? (
                    <Button 
                      onClick={() => handleSetupSubscriptionAutopay(subscription.plan_type, 29.99)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Set Up Autopay
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        Please add a payment method first to set up autopay
                      </p>
                      <Button 
                        onClick={() => setShowPaymentMethodModal(true)}
                        variant="outline"
                      >
                        Add Payment Method
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {autopaySchedules.filter(s => s.status === 'paused').map((schedule) => (
            <Card key={schedule.id} className="border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">Autopay Paused</p>
                      <p className="text-sm text-yellow-700">
                        Your subscription autopay is currently paused
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAutopayStatus(schedule.id, schedule.status)}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  >
                    Reactivate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                    <p className="text-lg font-bold">{subscription.plan_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                    <p className="text-lg font-bold">
                      {subscription.current_period_end ? 
                        new Date(subscription.current_period_end).toLocaleDateString() : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Methods</p>
                    <p className="text-lg font-bold">
                      {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''} saved
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <LandlordSubscriptionPlansGrid 
            userId={userId}
            currentPlanId={subscription?.subscription_plan_id}
          />
        </TabsContent>
      </Tabs>

      <AddPaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSuccess={() => {
          refreshData();
          setShowPaymentMethodModal(false);
        }}
      />

      <SubscriptionAutopaySetupModal
        isOpen={showSubscriptionAutopayModal}
        onClose={() => {
          setShowSubscriptionAutopayModal(false);
          setEditingSubscriptionSchedule(null);
        }}
        onSuccess={handleSubscriptionAutopaySuccess}
        subscriptionPlan={subscription?.plan_type || 'Pro'}
        subscriptionAmount={29.99}
        editMode={!!editingSubscriptionSchedule}
        existingSchedule={editingSubscriptionSchedule}
      />
    </div>
  );
};

export default SubscriptionManager;