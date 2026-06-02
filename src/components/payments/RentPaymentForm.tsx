import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Home, CheckCircle, Clock, CalendarCheck, AlertCircle, Building, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePaymentData } from "@/hooks/usePaymentData";
import { PaymentMethodSelectionModal } from "./PaymentMethodSelectionModal";
import { AddPaymentMethodModal } from "@/components/AddPaymentMethodModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface RentPaymentFormProps {
  userId: string;
  properties: any[];
}

export const RentPaymentForm = ({ userId, properties }: RentPaymentFormProps) => {
  const [currentPropertyId, setCurrentPropertyId] = useState<string>("");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { balance, rentSplits, property, isLoading: paymentDataLoading, refetch } = usePaymentData(currentPropertyId, userId);

  // Use demo property as fallback for testing when no properties exist
  const effectiveProperties = properties.length > 0 ? properties : [{
    id: 'demo-property-' + userId,
    address: '123 Demo Street, Demo City',
    monthly_rent: 1200,
    user_role: 'tenant'
  }];

  useEffect(() => {
    if (effectiveProperties.length > 0 && !currentPropertyId) {
      const tenantProperty = effectiveProperties.find(p => p.user_role === 'tenant');
      const selectedProperty = tenantProperty || effectiveProperties[0];
      setCurrentPropertyId(selectedProperty.id);
    }
  }, [effectiveProperties, currentPropertyId]);

  // Query for saved payment method (default one for user)
  const { data: savedPaymentMethod, refetch: refetchPaymentMethod } = useQuery({
    queryKey: ['saved-payment-method', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Query for autopay status
  const { data: autopaySchedule, refetch: refetchAutopay } = useQuery({
    queryKey: ['autopay-status', currentPropertyId, userId],
    queryFn: async () => {
      if (!currentPropertyId || currentPropertyId.startsWith('demo-')) return null;
      
      const { data } = await supabase
        .from('autopay_schedules')
        .select('*')
        .eq('property_id', currentPropertyId)
        .eq('tenant_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!currentPropertyId && !currentPropertyId.startsWith('demo-'),
  });

  // Query for completed payments this billing period
  const { data: paidThisPeriod } = useQuery({
    queryKey: ['paid-this-period', currentPropertyId, userId],
    queryFn: async () => {
      if (!currentPropertyId || currentPropertyId.startsWith('demo-')) return false;
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const { data } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('property_id', currentPropertyId)
        .eq('tenant_id', userId)
        .eq('status', 'completed')
        .gte('payment_date', startOfMonth.toISOString().split('T')[0])
        .lte('payment_date', endOfMonth.toISOString().split('T')[0])
        .limit(1);
      
      return (data?.length || 0) > 0;
    },
    enabled: !!currentPropertyId && !currentPropertyId.startsWith('demo-'),
  });

  const getTenantPaymentAmount = () => {
    const currentProp = effectiveProperties.find(p => p.id === currentPropertyId);
    const defaultRent = currentProp?.monthly_rent || 0;
    
    const fullRentAmount = balance?.balance_remaining > 0 
      ? balance.balance_remaining 
      : (balance?.total_due || defaultRent);
    
    if (rentSplits && rentSplits.tenant_portion) {
      return rentSplits.tenant_portion;
    }
    
    return fullRentAmount || 0;
  };

  const tenantPortion = getTenantPaymentAmount() || 0;
  const baseAmount = Number(tenantPortion) || 0;

  const formatCurrency = (value: number | null | undefined): string => {
    return (Number(value) || 0).toFixed(2);
  };

  // Calculate next due date
  const rentDueDay = property?.rent_due_day || 1;
  const today = new Date();
  let nextDueDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay);
  
  // If we've already paid this month or date passed, next due is next month
  if (nextDueDate <= today || paidThisPeriod) {
    nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, rentDueDay);
  }

  // Calculate if within 5 days of due date
  const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const canPayNow = daysUntilDue <= 5;
  const paymentAvailableDate = new Date(nextDueDate.getTime() - (5 * 24 * 60 * 60 * 1000));

  const handleOpenPaymentModal = () => {
    if (!currentPropertyId || baseAmount <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please select a property with a valid payment amount.",
        variant: "destructive"
      });
      return;
    }
    setShowPaymentMethodModal(true);
  };

  const handlePaymentSuccess = () => {
    refetch();
    toast({
      title: "Payment Complete",
      description: "Your rent payment has been processed.",
    });
  };

  const handlePaymentMethodSuccess = () => {
    refetchPaymentMethod();
    refetchAutopay();
    queryClient.invalidateQueries({ queryKey: ['autopay-status'] });
    toast({
      title: "Payment Method Saved",
      description: "Your payment method has been updated and autopay is active.",
    });
  };

  // Get the processing fee rate based on payment method type
  const getProcessingFeeRate = (type: string) => {
    return type === 'card' ? '3.4%' : '1.3%';
  };

  // Format payment method display
  const getPaymentMethodDisplay = () => {
    if (!savedPaymentMethod) return null;
    
    const brand = savedPaymentMethod.brand || 'Card';
    const lastFour = savedPaymentMethod.last_four || '****';
    const type = savedPaymentMethod.type || 'card';
    
    return {
      icon: type === 'us_bank_account' ? Building : CreditCard,
      label: type === 'us_bank_account' ? `Bank ••••${lastFour}` : `${brand} ••••${lastFour}`,
      feeRate: getProcessingFeeRate(type),
      type,
    };
  };

  const paymentMethodInfo = getPaymentMethodDisplay();

  // Loading states
  if (paymentDataLoading && currentPropertyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading payment information...</p>
      </div>
    );
  }

  if (properties.length > 0 && !currentPropertyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentProp = effectiveProperties.find(p => p.id === currentPropertyId);

  // Render payment method section
  const renderPaymentMethodSection = () => {
    if (!savedPaymentMethod || !paymentMethodInfo) {
      return (
        <div className="p-4 border border-dashed rounded-lg text-center space-y-3">
          <CreditCard className="w-8 h-8 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No payment method on file</p>
            <p className="text-xs text-muted-foreground">Add a card or bank account to enable autopay</p>
          </div>
          <Button 
            onClick={() => setShowAddMethodModal(true)}
            variant="outline"
            size="sm"
          >
            Add Payment Method
          </Button>
        </div>
      );
    }

    const IconComponent = paymentMethodInfo.icon;

    return (
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{paymentMethodInfo.label}</p>
              <p className="text-xs text-muted-foreground">
                {paymentMethodInfo.feeRate} processing fee
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAddMethodModal(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Swap
          </Button>
        </div>
        
        {autopaySchedule && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs">
              <CalendarCheck className="w-3 h-3 mr-1" />
              Autopay Active
            </Badge>
            <span className="text-xs text-muted-foreground">
              Charged on the {rentDueDay}{rentDueDay === 1 ? 'st' : rentDueDay === 2 ? 'nd' : rentDueDay === 3 ? 'rd' : 'th'}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Determine which state to show
  const renderPaymentContent = () => {
    // Already paid this period
    if (paidThisPeriod) {
      return (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-700">Payment Complete</h3>
            <p className="text-muted-foreground mt-1">
              You're all set for this month!
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm text-muted-foreground">Next payment due</p>
            <p className="text-lg font-semibold">
              {nextDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      );
    }

    // Autopay is active
    if (autopaySchedule) {
      const autopayDate = new Date(autopaySchedule.next_payment_date);
      return (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <CalendarCheck className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-700">Autopay Active</h3>
            <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 bg-blue-50">
              <Clock className="w-3 h-3 mr-1" />
              Scheduled
            </Badge>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium"><CurrencyDisplay amount={autopaySchedule.amount} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next charge date</span>
              <span className="font-medium">
                {autopayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your payment will be automatically processed on the due date.
          </p>
        </div>
      );
    }

    // Too early to pay
    if (!canPayNow) {
      return (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-700">Payment Not Yet Available</h3>
            <p className="text-muted-foreground mt-1">
              Payments can be made within 5 days of your due date.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due date</span>
              <span className="font-medium">
                {nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment available</span>
              <span className="font-medium">
                {paymentAvailableDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount due</span>
              <span className="font-medium text-primary"><CurrencyDisplay amount={baseAmount} /></span>
            </div>
          </div>
          {!savedPaymentMethod && (
            <p className="text-xs text-muted-foreground">
              Add a payment method to enable autopay!
            </p>
          )}
        </div>
      );
    }

    // Normal payment form - within 5 days of due date
    return (
      <>
        {/* Payment Summary */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due date</span>
            <span className="font-medium">
              {nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          
          {rentSplits?.pha_portion && rentSplits.pha_portion > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Rent</span>
                <CurrencyDisplay amount={rentSplits.total_rent} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">HAP Portion (PHA)</span>
                <span className="text-green-600">-<CurrencyDisplay amount={rentSplits.pha_portion} /></span>
              </div>
              <Separator />
            </>
          )}
          
          <div className="flex justify-between font-semibold">
            <span>Your Payment</span>
            <span className="text-primary text-lg"><CurrencyDisplay amount={baseAmount} /></span>
          </div>

          {balance?.balance_remaining > 0 && balance.balance_remaining !== baseAmount && (
            <p className="text-xs text-amber-600 mt-1">
              This is your remaining balance after previous payments.
            </p>
          )}
        </div>

        <Button 
          onClick={handleOpenPaymentModal}
          className="w-full" 
          size="lg"
          disabled={baseAmount <= 0}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Pay <CurrencyDisplay amount={baseAmount} className="ml-1" />
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {savedPaymentMethod 
            ? "Payment will be charged to your saved payment method"
            : "You'll choose your payment method on the next screen"
          }
        </p>
      </>
    );
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Make a Payment</span>
          </CardTitle>
          <CardDescription>
            Pay your rent securely with Stripe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property Selection */}
          {effectiveProperties.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Property</label>
              <Select 
                value={currentPropertyId} 
                onValueChange={(value) => setCurrentPropertyId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveProperties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4" />
                        <span>{prop.address}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Property Info */}
          {currentProp && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{currentProp.address}</span>
              </div>
            </div>
          )}

          {/* Payment Method on File */}
          {renderPaymentMethodSection()}

          <Separator />

          {renderPaymentContent()}
        </CardContent>
      </Card>

      {/* Payment Method Selection Modal (for payments) */}
      <PaymentMethodSelectionModal
        open={showPaymentMethodModal}
        onOpenChange={setShowPaymentMethodModal}
        baseAmount={baseAmount}
        propertyId={currentPropertyId}
        userId={userId}
        rentDueDay={property?.rent_due_day}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Add/Swap Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddMethodModal}
        onClose={() => setShowAddMethodModal(false)}
        onSuccess={handlePaymentMethodSuccess}
      />
    </>
  );
};