import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Building, Calendar, DollarSign, Plus } from 'lucide-react';
import { useAutopay, type PaymentMethod, type SubscriptionAutopaySchedule } from '@/hooks/useAutopay';
import { AddPaymentMethodModal } from '@/components/AddPaymentMethodModal';

interface SubscriptionAutopaySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  subscriptionPlan: string;
  subscriptionAmount: number;
  editMode?: boolean;
  existingSchedule?: SubscriptionAutopaySchedule;
}

export function SubscriptionAutopaySetupModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  subscriptionPlan, 
  subscriptionAmount,
  editMode = false,
  existingSchedule
}: SubscriptionAutopaySetupModalProps) {
  const [step, setStep] = useState<'method' | 'schedule'>(editMode ? 'schedule' : 'method');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [renewalDay, setRenewalDay] = useState('1');
  const [amount, setAmount] = useState(subscriptionAmount.toString());
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  
  const { 
    paymentMethods, 
    loading, 
    setupSubscriptionAutopay,
    updateSubscriptionAutopaySchedule,
    refreshData
  } = useAutopay();

  // Pre-populate form fields in edit mode
  useEffect(() => {
    if (editMode && existingSchedule) {
      setSelectedPaymentMethodId(existingSchedule.payment_method_id);
      setRenewalDay(existingSchedule.renewal_day.toString());
      setAmount(existingSchedule.amount.toString());
      setStep('schedule');
    }
  }, [editMode, existingSchedule]);

  const handlePaymentMethodAdded = () => {
    refreshData();
    setShowAddPaymentModal(false);
  };

  const handleSetupAutopay = async () => {
    try {
      if (editMode && existingSchedule) {
        await updateSubscriptionAutopaySchedule(existingSchedule.id, {
          renewal_day: parseInt(renewalDay),
          amount: parseFloat(amount),
          payment_method_id: selectedPaymentMethodId
        });
      } else {
        await setupSubscriptionAutopay({
          payment_method_id: selectedPaymentMethodId,
          renewal_day: parseInt(renewalDay),
          amount: parseFloat(amount)
        });
      }
      onClose();
      onSuccess?.(); // Call success callback to refresh parent data
    } catch (error) {
      console.error('Error setting up subscription autopay:', error);
    }
  };

  const renderPaymentMethodStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Choose Payment Method</h3>
        <p className="text-muted-foreground">
          Select an existing payment method or add a new one
        </p>
      </div>

      {paymentMethods.length > 0 && (
        <div className="space-y-3">
          <Label>Existing Payment Methods</Label>
          {paymentMethods.map((method) => (
            <Card 
              key={method.id} 
              className={`cursor-pointer border-2 transition-colors ${
                selectedPaymentMethodId === method.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => {
                setSelectedPaymentMethodId(method.id);
                setStep('schedule');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {method.type === 'card' ? (
                      <CreditCard className="h-5 w-5" />
                    ) : (
                      <Building className="h-5 w-5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {method.type === 'card' ? 'Card' : 'Bank Account'} 
                        ending in {method.last_four}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {method.brand}
                      </p>
                    </div>
                  </div>
                  {method.is_default && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <Label>Add New Payment Method</Label>
        <p className="text-sm text-muted-foreground">
          Add a new payment method securely using Stripe's payment form.
        </p>
        <Button
          onClick={() => setShowAddPaymentModal(true)}
          variant="outline"
          className="w-full flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Payment Method</span>
        </Button>
      </div>
    </div>
  );

  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Schedule Subscription Autopay</h3>
        <p className="text-muted-foreground">
          Configure when and how much to pay automatically
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan:</span>
            <span className="font-medium">{subscriptionPlan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Amount:</span>
            <span className="font-medium">${subscriptionAmount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <Label htmlFor="renewal-day">Renewal Day</Label>
          <Select value={renewalDay} onValueChange={setRenewalDay}>
            <SelectTrigger>
              <SelectValue placeholder="Select day of month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setStep('method')}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          onClick={handleSetupAutopay}
          disabled={loading || !amount}
          className="flex-1"
        >
          {loading ? (editMode ? 'Saving...' : 'Setting up...') : (editMode ? 'Save Changes' : 'Setup Autopay')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editMode ? 'Edit Subscription Autopay' : 'Setup Subscription Autopay'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1 pb-4">
            {step === 'method' ? renderPaymentMethodStep() : renderScheduleStep()}
          </div>
        </DialogContent>
      </Dialog>

      <AddPaymentMethodModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={handlePaymentMethodAdded}
      />
    </>
  );
}