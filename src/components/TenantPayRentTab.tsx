import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Clock, AlertCircle, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { AutopaySettings } from '@/components/AutopaySettings';

interface RecurringCharge {
  id: string;
  charge_type: string;
  amount: number;
  currency_code: string;
  cadence: string;
  due_day: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  description?: string;
  portfolio_assets: {
    id: string;
    asset_name: string;
  };
}

interface AssetMembership {
  id: string;
  role: string;
  portfolio_assets: {
    id: string;
    asset_name: string;
  };
}

export const TenantPayRentTab = () => {
  const [charges, setCharges] = useState<RecurringCharge[]>([]);
  const [memberships, setMemberships] = useState<AssetMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchTenantData();
    }

    // Check for successful payment session
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const success = urlParams.get('success');

    if (success && sessionId) {
      confirmPayment(sessionId);
    }
  }, [user]);

  const confirmPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-asset-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      toast({
        title: "Payment Successful",
        description: `Payment of ${data.currency_code} ${data.amount} has been processed.`,
      });

      // Clean up URL
      window.history.replaceState({}, '', '/pay-rent');
      
      // Refresh the data
      fetchTenantData();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "Failed to confirm payment status.",
        variant: "destructive",
      });
    }
  };

  const fetchTenantData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user's asset memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('portfolio_asset_memberships')
        .select(`
          id,
          role,
          portfolio_assets(
            id,
            asset_name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (membershipError) throw membershipError;
      setMemberships(membershipData || []);

      // Fetch recurring charges for assets where user has access
      const userMemberships = membershipData || [];
      const assetIds = userMemberships.map(m => m.portfolio_assets.id);

      if (assetIds.length > 0) {
        const { data: chargesData, error: chargesError } = await supabase
          .from('asset_recurring_charges')
          .select(`
            id,
            charge_type,
            amount,
            currency_code,
            cadence,
            due_day,
            start_date,
            end_date,
            is_active,
            notes,
            portfolio_assets(id, asset_name)
          `)
          .in('asset_id', assetIds)
          .eq('payer_user_id', user.id)
          .eq('is_active', true)
          .order('due_day');

        if (chargesError) throw chargesError;
        setCharges(chargesData || []);
      }
    } catch (error: any) {
      console.error('Error fetching tenant data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (charge: RecurringCharge) => {
    if (!user) return;

    try {
      setLoading(true);

      const nextDue = getNextDueDate(charge);
      const currentMonth = new Date();
      const paymentPeriodStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const paymentPeriodEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase.functions.invoke('create-asset-payment-session', {
        body: {
          recurring_charge_id: charge.id,
          amount: charge.amount,
          currency_code: charge.currency_code,
          asset_id: charge.portfolio_assets?.id || '',
          payment_period_start: paymentPeriodStart.toISOString().split('T')[0],
          payment_period_end: paymentPeriodEnd.toISOString().split('T')[0]
        }
      });

      if (error) throw error;

        // Redirect to payment confirmation page
        const currentUrl = new URL(window.location.href);
        const confirmationUrl = `${currentUrl.origin}/payment-confirmation?session_id=${data.session_id}&success=true`;
        window.location.href = confirmationUrl;

    } catch (error: any) {
      console.error('Error creating payment session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextDueDate = (charge: RecurringCharge) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Calculate next due date based on due_day
    let nextDue = new Date(currentYear, currentMonth, charge.due_day);
    
    // If due date has passed this month, move to next month
    if (isBefore(nextDue, today)) {
      nextDue = new Date(currentYear, currentMonth + 1, charge.due_day);
    }
    
    return nextDue;
  };

  const getPaymentStatus = (charge: RecurringCharge) => {
    const nextDue = getNextDueDate(charge);
    const today = new Date();
    const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return { status: 'overdue', variant: 'destructive' as const, text: 'Overdue' };
    } else if (daysUntilDue <= 3) {
      return { status: 'due_soon', variant: 'warning' as const, text: 'Due Soon' };
    } else if (daysUntilDue <= 7) {
      return { status: 'upcoming', variant: 'secondary' as const, text: 'Upcoming' };
    } else {
      return { status: 'current', variant: 'default' as const, text: 'Current' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>Loading payment information...</div>
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Active Leases</h3>
          <p className="text-muted-foreground">
            You don't have any active tenant leases at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Pay Rent</h2>
          <p className="text-muted-foreground">
            Manage your rent payments and view upcoming charges.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/payments/history')}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          View Payment History
        </Button>
      </div>

      {/* Summary Cards - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {charges.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${charges.reduce((sum, charge) => sum + Number(charge.amount), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {charges.length > 0 ? format(getNextDueDate(charges[0]), 'MMM dd') : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Charges */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Payments</h3>
        {charges.map((charge) => {
          const nextDue = getNextDueDate(charge);
          const paymentStatus = getPaymentStatus(charge);
          
          return (
            <Card key={charge.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h4 className="font-semibold text-base">
                        {charge.portfolio_assets.asset_name}
                      </h4>
                      <Badge variant={paymentStatus.variant} className="w-fit">
                        {paymentStatus.text}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Amount:</span> {charge.currency_code} {charge.amount}
                      </div>
                      <div>
                        <span className="font-medium">Due Date:</span> {format(nextDue, 'MMMM do, yyyy')}
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span> {charge.cadence}
                      </div>
                    </div>

                    {charge.description && (
                      <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-md">
                        {charge.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="default"
                      onClick={() => handlePayNow(charge)}
                      disabled={loading}
                      className="w-full sm:w-auto px-6 py-2 text-sm font-medium transition-all hover:scale-105"
                    >
                      {loading ? 'Processing...' : 'Pay Now'}
                    </Button>
                  </div>
                </div>
                
                {/* Autopay Settings for this charge */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <AutopaySettings
                    propertyId={charge.portfolio_assets.id}
                    propertyName={charge.portfolio_assets.asset_name}
                    monthlyAmount={charge.amount}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {charges.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Recurring Charges</h3>
            <p className="text-muted-foreground">
              No recurring payment charges have been set up for your leases.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};