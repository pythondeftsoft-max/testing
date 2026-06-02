import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Building2, Loader2, CalendarCheck, CheckCircle2 } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CurrencyDisplay } from "@/components/ui/currency-display";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentMethodSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseAmount: number;
  propertyId: string;
  userId: string;
  rentDueDay?: number;
  onPaymentSuccess?: () => void;
}

export const PaymentMethodSelectionModal = ({
  open,
  onOpenChange,
  baseAmount,
  propertyId,
  userId,
  rentDueDay,
  onPaymentSuccess,
}: PaymentMethodSelectionModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'us_bank_account'>('us_bank_account');
  const [saveAsAutopay, setSaveAsAutopay] = useState(false);
  const [step, setStep] = useState<'select' | 'checkout' | 'success'>('select');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const { data: platformConfig, isLoading: configLoading } = usePlatformConfig();
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setClientSecret(null);
      setIsCreatingSession(false);
    }
  }, [open]);

  // Get fee rates from platform config
  const getFeeRates = () => {
    const defaultRates = {
      card: { processingFee: 3.4, tenantPays: 50 },
      ach: { processingFee: 1.3, tenantPays: 50 },
    };

    if (!platformConfig?.config_value) return defaultRates;

    const config = platformConfig.config_value;
    
    return {
      card: {
        processingFee: (config.card?.stripe_processing_fee || 2.9) + (config.card?.platform_revenue_fee || 0.5),
        tenantPays: config.card?.tenant_pays_percent || 50,
      },
      ach: {
        processingFee: (config.ach?.stripe_processing_fee || 0.8) + (config.ach?.platform_revenue_fee || 0.5),
        tenantPays: config.ach?.tenant_pays_percent || 50,
      },
    };
  };

  const feeRates = getFeeRates();

  const calculateFees = (method: 'card' | 'us_bank_account') => {
    const rates = method === 'card' ? feeRates.card : feeRates.ach;
    const totalFee = baseAmount * (rates.processingFee / 100);
    const tenantPortion = totalFee * (rates.tenantPays / 100);
    const total = baseAmount + tenantPortion;
    
    return {
      processingFee: rates.processingFee,
      totalFee,
      tenantPortion,
      tenantPaysPercent: rates.tenantPays,
      total,
    };
  };

  const cardFees = calculateFees('card');
  const achFees = calculateFees('us_bank_account');
  const selectedFees = selectedMethod === 'card' ? cardFees : achFees;

  const getMethodLabel = () => {
    return selectedMethod === 'card' ? 'card' : 'bank account';
  };

  const getNextDueDate = (dueDay: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const thisMonthDueDate = new Date(currentYear, currentMonth, dueDay);
    
    if (today > thisMonthDueDate) {
      return new Date(currentYear, currentMonth + 1, dueDay);
    }
    return thisMonthDueDate;
  };

  // Fetch client secret for embedded checkout
  const fetchClientSecret = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    
    if (!jwt) {
      throw new Error('Please log in to make a payment.');
    }

    const { data, error } = await supabase.functions.invoke('create-rent-checkout', {
      body: {
        propertyId,
        amount: baseAmount,
        tenantFeeAmount: selectedFees.tenantPortion,
        totalAmount: selectedFees.total,
        paymentMethod: selectedMethod,
        dueDate: rentDueDay 
          ? getNextDueDate(rentDueDay).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        enableAutopay: saveAsAutopay,
        embedded: true  // Request embedded mode
      },
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.clientSecret) {
      throw new Error('Failed to create checkout session');
    }

    return data.clientSecret;
  }, [propertyId, baseAmount, selectedFees, selectedMethod, rentDueDay, saveAsAutopay]);

  const handleContinueToPayment = async () => {
    try {
      setIsCreatingSession(true);

      // Handle autopay schedule creation/update
      if (saveAsAutopay) {
        const nextPaymentDate = getNextDueDate(rentDueDay || 1);
        
        const { data: existingSchedule } = await supabase
          .from('autopay_schedules')
          .select('id')
          .eq('tenant_id', userId)
          .eq('property_id', propertyId)
          .maybeSingle();

        if (existingSchedule) {
          await supabase
            .from('autopay_schedules')
            .update({
              payment_method_type: selectedMethod,
              amount: selectedFees.total,
              autopay_day: rentDueDay || 1,
              next_payment_date: nextPaymentDate.toISOString().split('T')[0],
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSchedule.id);
        } else {
          await supabase
            .from('autopay_schedules')
            .insert({
              tenant_id: userId,
              property_id: propertyId,
              payment_method_type: selectedMethod,
              payment_method_id: 'pending',
              amount: selectedFees.total,
              autopay_day: rentDueDay || 1,
              next_payment_date: nextPaymentDate.toISOString().split('T')[0],
              status: 'active'
            });
        }
      }

      // Get client secret for embedded checkout
      const secret = await fetchClientSecret();
      setClientSecret(secret);
      setStep('checkout');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment session';
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCheckoutComplete = () => {
    setStep('success');
    if (saveAsAutopay) {
      toast({
        title: "Autopay Preference Saved",
        description: `Your ${getMethodLabel()} will be charged automatically each month.`,
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (step === 'success') {
      onPaymentSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 'checkout' ? "sm:max-w-4xl w-full" : "sm:max-w-md"}>
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Choose Payment Method</DialogTitle>
              <DialogDescription>
                Select how you'd like to pay. Processing fees are split 50/50 between you and your landlord.
              </DialogDescription>
            </DialogHeader>

            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <RadioGroup
                  value={selectedMethod}
                  onValueChange={(value) => setSelectedMethod(value as 'card' | 'us_bank_account')}
                  className="space-y-3"
                >
                  {/* Bank Account Option */}
                  <div 
                    className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'us_bank_account' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod('us_bank_account')}
                  >
                    <RadioGroupItem value="us_bank_account" id="ach" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="ach" className="flex items-center gap-2 cursor-pointer font-medium">
                        <Building2 className="h-4 w-4" />
                        Bank Account (ACH)
                      </Label>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Processing fee:</span>
                          <CurrencyDisplay amount={achFees.tenantPortion} />
                        </div>
                        <div className="flex justify-between font-medium text-foreground">
                          <span>Total:</span>
                          <span className="text-primary"><CurrencyDisplay amount={achFees.total} /></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Option */}
                  <div 
                    className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'card' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedMethod('card')}
                  >
                    <RadioGroupItem value="card" id="card" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer font-medium">
                        <CreditCard className="h-4 w-4" />
                        Credit or Debit Card
                      </Label>
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Processing fee:</span>
                          <CurrencyDisplay amount={cardFees.tenantPortion} />
                        </div>
                        <div className="flex justify-between font-medium text-foreground">
                          <span>Total:</span>
                          <span className="text-primary"><CurrencyDisplay amount={cardFees.total} /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base rent amount:</span>
                    <CurrencyDisplay amount={baseAmount} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing fee:</span>
                    <span>+ <CurrencyDisplay amount={selectedFees.tenantPortion} /></span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>You pay:</span>
                    <span className="text-primary"><CurrencyDisplay amount={selectedFees.total} /></span>
                  </div>
                </div>

                {/* Save as Autopay Checkbox */}
                <div 
                  className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    saveAsAutopay 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-muted/30 hover:border-primary/50'
                  }`}
                  onClick={() => setSaveAsAutopay(!saveAsAutopay)}
                >
                  <Checkbox 
                    id="save-autopay" 
                    checked={saveAsAutopay}
                    onCheckedChange={(checked) => setSaveAsAutopay(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="save-autopay" className="flex items-center gap-2 font-medium cursor-pointer">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                      Save as my autopay preference
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your {getMethodLabel()} will be charged <CurrencyDisplay amount={selectedFees.total} /> automatically 
                      {rentDueDay ? ` on the ${rentDueDay}${getOrdinalSuffix(rentDueDay)} of each month` : ' each month on the due date'}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleContinueToPayment} 
                  className="w-full" 
                  size="lg"
                  disabled={isCreatingSession}
                >
                  {isCreatingSession ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && clientSecret && (
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Payment</DialogTitle>
              <DialogDescription>
                Securely pay <CurrencyDisplay amount={selectedFees.total} /> via {selectedMethod === 'card' ? 'card' : 'bank account'}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 max-h-[70vh] overflow-y-auto" id="checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ 
                  clientSecret,
                  onComplete: handleCheckoutComplete
                }}
              >
                <EmbeddedCheckout className="min-h-[400px]" />
              </EmbeddedCheckoutProvider>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Payment Successful!
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-lg"><CurrencyDisplay amount={selectedFees.total} /> paid</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your rent payment has been processed successfully.
                </p>
                {saveAsAutopay && (
                  <p className="text-sm text-primary mt-2">
                    Autopay has been set up for future payments.
                  </p>
                )}
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
