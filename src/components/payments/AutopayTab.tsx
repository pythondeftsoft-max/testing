import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, CreditCard, Building2, Trash2, Loader2, Plus, Circle, CheckCircle2 } from "lucide-react";
import { useAutopay, type AutopaySchedule } from "@/hooks/useAutopay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddPaymentMethodModal } from "@/components/AddPaymentMethodModal";

interface AutopayTabProps {
  userId: string;
  properties: any[];
}

export const AutopayTab = ({ userId, properties }: AutopayTabProps) => {
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [removingMethodId, setRemovingMethodId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [togglingMethodId, setTogglingMethodId] = useState<string | null>(null);
  
  const { 
    autopaySchedules, 
    paymentMethods,
    refreshData: refreshAutopayData,
    toggleAutopayStatus,
    loading 
  } = useAutopay();
  const { toast } = useToast();

  // Handle URL params for success/cancel from Stripe Checkout (legacy support)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setupSuccess = urlParams.get('autopay_setup_success');
    const sessionId = urlParams.get('session_id');
    const propertyId = urlParams.get('property_id');

    if (setupSuccess === 'true' && sessionId && propertyId) {
      handleSetupSuccess(sessionId, propertyId);
      const newUrl = window.location.pathname + '?tab=Autopay';
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleSetupSuccess = async (sessionId: string, propertyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-autopay-setup-success', {
        body: { session_id: sessionId, property_id: propertyId }
      });

      if (error) throw error;

      toast({
        title: "Payment Method Updated",
        description: "Your autopay payment method has been updated successfully.",
      });

      refreshAutopayData();
    } catch (error) {
      console.error('Error handling setup success:', error);
      toast({
        title: "Error",
        description: "Failed to update payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch rent due days for all properties from recurring_charges
  const { data: recurringCharges } = useQuery({
    queryKey: ['recurring-charges-due-days', properties.map(p => p.id)],
    queryFn: async () => {
      const propertyIds = properties.map(p => p.id);
      const { data, error } = await supabase
        .from('recurring_charges')
        .select('property_id, start_date')
        .in('property_id', propertyIds)
        .eq('is_active', true)
        .eq('charge_type', 'rent');
      
      if (error) return {};
      
      const dueDayMap: Record<string, number> = {};
      data?.forEach(charge => {
        if (charge.start_date) {
          dueDayMap[charge.property_id] = new Date(charge.start_date).getUTCDate();
        }
      });
      return dueDayMap;
    },
    enabled: properties.length > 0,
  });

  const getPropertyAutopaySchedule = (propertyId: string) => {
    return autopaySchedules.find(schedule => schedule.property_id === propertyId);
  };

  const getActiveAutopayMethod = () => {
    const activeSchedule = autopaySchedules.find(s => s.status === 'active');
    if (!activeSchedule) return null;
    return paymentMethods.find(pm => 
      pm.stripe_payment_method_id === activeSchedule.payment_method_id || 
      pm.id === activeSchedule.payment_method_id
    );
  };

  const getPropertyDueDay = (propertyId: string) => {
    return recurringCharges?.[propertyId] || properties.find(p => p.id === propertyId)?.rent_due_day || 1;
  };

  const formatBrandName = (method: any) => {
    if (method?.brand) {
      return method.brand
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return method?.type === 'us_bank_account' ? 'Bank Account' : 'Card';
  };

  const getFeeRate = (paymentMethodType: string) => {
    return paymentMethodType === 'us_bank_account' ? '1.3%' : '3.4%';
  };

  const getPaymentMethodIcon = (type: string) => {
    return type === 'us_bank_account' ? Building2 : CreditCard;
  };

  const isMethodSelectedForAutopay = (methodId: string) => {
    const activeSchedule = autopaySchedules.find(s => s.status === 'active');
    if (!activeSchedule) return false;
    return activeSchedule.payment_method_id === methodId || 
           paymentMethods.find(pm => pm.id === methodId)?.stripe_payment_method_id === activeSchedule.payment_method_id;
  };

  const handleEnableAutopayForMethod = async (methodId: string) => {
    if (!properties[0]) return;
    
    setTogglingMethodId(methodId);
    try {
      const method = paymentMethods.find(pm => pm.id === methodId);
      const stripePaymentMethodId = method?.stripe_payment_method_id || methodId;
      
      // Find existing schedule for the property
      const existingSchedule = getPropertyAutopaySchedule(properties[0].id);
      
      if (existingSchedule) {
        // Update the existing schedule with new payment method and set to active
        const { error } = await supabase
          .from('autopay_schedules')
          .update({ 
            payment_method_id: stripePaymentMethodId,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSchedule.id);
        
        if (error) throw error;
      } else {
        // Create new autopay schedule
        const { error } = await supabase
          .from('autopay_schedules')
          .insert({
            tenant_id: userId,
            property_id: properties[0].id,
            payment_method_id: stripePaymentMethodId,
            payment_method_type: method?.type || 'card',
            amount: properties[0].monthly_rent || 0,
            next_payment_date: new Date().toISOString(),
            status: 'active'
          });
        
        if (error) throw error;
      }

      toast({
        title: "Autopay Enabled",
        description: `Autopay is now active using ${formatBrandName(method)} ••••${method?.last_four}`,
      });

      refreshAutopayData();
    } catch (error) {
      console.error('Error enabling autopay:', error);
      toast({
        title: "Error",
        description: "Failed to enable autopay. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTogglingMethodId(null);
    }
  };

  const handleDisableAutopay = async () => {
    const activeSchedule = autopaySchedules.find(s => s.status === 'active');
    if (!activeSchedule) return;
    
    try {
      await toggleAutopayStatus(activeSchedule.id, 'paused');
      toast({
        title: "Autopay Disabled",
        description: "Automatic payments have been paused.",
      });
    } catch (error) {
      console.error('Error disabling autopay:', error);
    }
  };

  const handleRemovePaymentMethod = async () => {
    if (!removingMethodId) return;
    
    setIsRemoving(true);
    try {
      const method = paymentMethods.find(pm => pm.id === removingMethodId);
      
      // Call edge function to remove from Stripe
      const { error } = await supabase.functions.invoke('remove-payment-method', {
        body: { payment_method_id: method?.stripe_payment_method_id || removingMethodId }
      });

      if (error) throw error;

      toast({
        title: "Payment Method Removed",
        description: "The payment method has been removed.",
      });

      refreshAutopayData();
    } catch (error) {
      console.error('Error removing payment method:', error);
      toast({
        title: "Error",
        description: "Failed to remove payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setRemovingMethodId(null);
    }
  };

  const activeAutopayMethod = getActiveAutopayMethod();
  const activeSchedule = autopaySchedules.find(s => s.status === 'active');
  const firstProperty = properties[0];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Autopay Settings</span>
              </CardTitle>
              <CardDescription>
                Manage automatic rent payments
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowAddPaymentModal(true)}
              title="Add Payment Method"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Methods List */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Payment Methods</p>
              {paymentMethods.map((method) => {
                const isSelected = isMethodSelectedForAutopay(method.id);
                const PaymentIcon = getPaymentMethodIcon(method.type);
                const isToggling = togglingMethodId === method.id;

                return (
                  <div 
                    key={method.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-muted/20 border-border hover:bg-muted/30'
                    }`}
                  >
                    {/* Selection Dot */}
                    <button
                      onClick={() => !isSelected && handleEnableAutopayForMethod(method.id)}
                      disabled={isToggling || loading}
                      className="flex-shrink-0 focus:outline-none"
                      title={isSelected ? "Currently selected for autopay" : "Select for autopay"}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    {/* Payment Method Icon */}
                    <div className="p-2 bg-background rounded-full border flex-shrink-0">
                      <PaymentIcon className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Payment Method Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatBrandName(method)}</span>
                        {method.last_four && (
                          <span className="text-muted-foreground">••••{method.last_four}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Fee: {getFeeRate(method.type)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDisableAutopay}
                          disabled={loading}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Disable Autopay
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEnableAutopayForMethod(method.id)}
                          disabled={isToggling || loading}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          {isToggling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Enable Autopay"
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemovingMethodId(method.id)}
                        disabled={isRemoving}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remove payment method"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg bg-muted/10">
              <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">No payment methods saved</p>
              <Button onClick={() => setShowAddPaymentModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}

          {/* Autopay Schedule Info */}
          {activeSchedule && firstProperty && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">Active Autopay</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Property</span>
                  <p className="font-medium truncate">{firstProperty.address}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date</span>
                  <p className="font-medium">{getPropertyDueDay(firstProperty.id)}th of each month</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Next Payment</span>
                  <p className="font-medium">
                    {activeSchedule.next_payment_date 
                      ? format(new Date(activeSchedule.next_payment_date), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p className="font-medium">${activeSchedule.amount?.toFixed(2)}</p>
                </div>
              </div>

              {/* Failure Warning */}
              {activeSchedule.failure_count > 0 && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    Last payment failed: {activeSchedule.last_failure_reason || 'Unknown error'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={() => {
          setShowAddPaymentModal(false);
          refreshAutopayData();
        }}
      />

      {/* Remove Payment Method Confirmation Dialog */}
      <AlertDialog open={!!removingMethodId} onOpenChange={() => setRemovingMethodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              This payment method will be removed from your account. If it's currently used for autopay, autopay will be disabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemovePaymentMethod} 
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
