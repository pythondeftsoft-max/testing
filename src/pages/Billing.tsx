import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featureFlags } from '@/config/featureFlags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, CreditCard, History, Settings, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAutopay } from '@/hooks/useAutopay';
import { PaymentMethodsManager } from '@/components/PaymentMethodsManager';
import { LandlordSubscriptionPlansGrid } from '@/components/subscriptions/LandlordSubscriptionPlansGrid';
import { AutopayStatusCard } from '@/components/AutopayStatusCard';
import { SubscriptionAutopayStatusCard } from '@/components/SubscriptionAutopayStatusCard';
import { SubscriptionAutopaySetupModal } from '@/components/SubscriptionAutopaySetupModal';
import { AutopaySetupModal } from '@/components/AutopaySetupModal';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { useHasActivePlans } from '@/hooks/useHasActivePlans';

import { Link } from 'react-router-dom';

interface SubscriptionTransaction {
  id: string;
  amount: number;
  processed_at: string;
  status: string;
  stripe_payment_intent_id?: string;
  failure_reason?: string;
}

const Billing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [showSubscriptionAutopayModal, setShowSubscriptionAutopayModal] = useState(false);
  const [showRentAutopayModal, setShowRentAutopayModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const { subscription, hasAccess, isLoading: subscriptionLoading } = useSubscription(user?.id, profile?.user_type);
  const { 
    autopaySchedules, 
    subscriptionAutopaySchedules, 
    refreshData,
    deleteSubscriptionAutopaySchedule,
    toggleSubscriptionAutopayStatus
  } = useAutopay();
  const { data: hasActivePlans } = useHasActivePlans('landlord');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        setUser(user);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
        
        // Fetch subscription autopay transactions
        if (profileData) {
          const { data: transactionData } = await supabase
            .from('subscription_autopay_transactions')
            .select(`
              id,
              amount,
              processed_at,
              status,
              stripe_payment_intent_id,
              failure_reason
            `)
            .order('processed_at', { ascending: false })
            .limit(10);

          setTransactions(transactionData || []);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Set page title
    document.title = 'Billing & Payments - OpenKey';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Manage your billing, payments, and subscription settings');
    }
  }, [navigate]);

  const handleEditSubscriptionAutopay = (schedule: any) => {
    setEditingSchedule(schedule);
    setShowSubscriptionAutopayModal(true);
  };

  const handleDeleteSubscriptionAutopay = async (scheduleId: string) => {
    await deleteSubscriptionAutopaySchedule(scheduleId);
    refreshData();
  };

  const handleToggleSubscriptionAutopay = async (scheduleId: string, isActive: boolean) => {
    await toggleSubscriptionAutopayStatus(scheduleId, isActive ? 'active' : 'paused');
    refreshData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access your billing information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Billing & Payments</h1>
              <p className="text-muted-foreground">Manage your subscription and payment settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="autopay" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Autopay
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tax Center Quick Access */}
          <CardEnhanced>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Tax Center</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage 1099 forms and IRS e-filing for your portfolios
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                <Link
                  to="/tax/sample-portfolio-id"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Tax Management</p>
                    <p className="text-sm text-muted-foreground">Access tax center for portfolio management</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </CardEnhanced>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Your current plan and billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Plan:</span>
                      <Badge variant="default">{subscription.plan_type || 'Unknown'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>
                    {subscription.current_period_end && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Next billing:</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active subscription</p>
                )}
              </CardContent>
            </Card>

            {profile?.user_type === 'landlord' && featureFlags.landlordSubscriptionUiEnabled && hasActivePlans && (
              <LandlordSubscriptionPlansGrid
                userId={user.id}
                currentPlanId={subscription?.id}
              />
            )}
            
            {profile?.user_type === 'landlord' && featureFlags.landlordSubscriptionUiEnabled && hasActivePlans === false && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No subscription plans are currently available.</p>
                </CardContent>
              </Card>
            )}
          </div>
          </TabsContent>

          <TabsContent value="autopay" className="space-y-6">
            <div className="grid gap-6">
              {(profile?.user_type === 'tenant' || featureFlags.landlordSubscriptionUiEnabled) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Autopay</CardTitle>
                    <CardDescription>
                      Automatically renew your subscription to avoid service interruptions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {subscriptionAutopaySchedules.length > 0 ? (
                      <div className="space-y-4">
                        {subscriptionAutopaySchedules.map((schedule) => (
                          <SubscriptionAutopayStatusCard
                            key={schedule.id}
                            schedule={schedule}
                            subscriptionPlan={subscription?.plan_type || 'Unknown'}
                            onEdit={handleEditSubscriptionAutopay}
                            onToggle={handleToggleSubscriptionAutopay}
                            onDelete={handleDeleteSubscriptionAutopay}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No subscription autopay set up</p>
                        <Button onClick={() => setShowSubscriptionAutopayModal(true)}>
                          Set Up Subscription Autopay
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {profile?.user_type === 'tenant' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rent Autopay</CardTitle>
                    <CardDescription>
                      Automatically pay your rent on time every month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {autopaySchedules.length > 0 ? (
                      <div className="space-y-4">
                        {autopaySchedules.map((schedule) => (
                          <AutopayStatusCard
                            key={schedule.id}
                            schedule={schedule}
                            propertyAddress="Property Address" // You might want to fetch this
                            onEdit={() => {/* Implement edit logic */}}
                            onToggle={() => {/* Implement toggle logic */}}
                            onDelete={() => {/* Implement delete logic */}}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No rent autopay set up</p>
                        <Button onClick={() => setShowRentAutopayModal(true)}>
                          Set Up Rent Autopay
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payment-methods">
            <PaymentMethodsManager />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Recent subscription payments and charges</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            Subscription Payment
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(transaction.processed_at)}
                          </span>
                          {transaction.failure_reason && (
                            <span className="text-sm text-destructive">
                              {transaction.failure_reason}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </div>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'destructive'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transaction history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <SubscriptionAutopaySetupModal
        isOpen={showSubscriptionAutopayModal}
        onClose={() => {
          setShowSubscriptionAutopayModal(false);
          setEditingSchedule(null);
        }}
        onSuccess={() => {
          setShowSubscriptionAutopayModal(false);
          setEditingSchedule(null);
          refreshData();
        }}
        subscriptionPlan={subscription?.plan_type || 'Unknown'}
        subscriptionAmount={1000} // This should come from subscription data
        editMode={!!editingSchedule}
        existingSchedule={editingSchedule}
      />

      <AutopaySetupModal
        isOpen={showRentAutopayModal}
        onClose={() => setShowRentAutopayModal(false)}
        onSuccess={() => {
          setShowRentAutopayModal(false);
          refreshData();
        }}
        propertyId="" // This would need to be passed based on user's property
        propertyAddress="Property Address"
        monthlyRent={0}
      />
    </div>
  );
};

export default Billing;