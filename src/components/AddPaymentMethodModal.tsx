import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Building } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAutopay } from '@/hooks/useAutopay';
import { useToast } from '@/hooks/use-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { confirmPaymentMethod } = useAutopay();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    
    try {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (setupIntent) {
        // Confirm with our backend
        await confirmPaymentMethod(setupIntent.id);
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error confirming setup:', error);
      toast({
        title: "Error",
        description: "Failed to save payment method",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      
      <div className="flex space-x-3">
        <Button 
          type="button"
          variant="outline" 
          onClick={onClose}
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Add Payment Method'}
        </Button>
      </div>
    </form>
  );
}

export function AddPaymentMethodModal({ isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) {
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'us_bank_account'>('card');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [setupIntentId, setSetupIntentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { setupPaymentMethod } = useAutopay();
  const { toast } = useToast();

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      
      const response = await setupPaymentMethod([paymentMethodType]);
      
      if (response?.client_secret && response?.setup_intent_id) {
        setClientSecret(response.client_secret);
        setSetupIntentId(response.setup_intent_id);
      } else {
        throw new Error('Failed to create setup intent');
      }
    } catch (error) {
      console.error('Error starting setup:', error);
      toast({
        title: "Error",
        description: "Failed to initialize payment method setup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClientSecret('');
    setSetupIntentId('');
    setPaymentMethodType('card');
    onClose();
  };

  const handleSuccessAndRefresh = () => {
    setClientSecret('');
    setSetupIntentId('');
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
        </DialogHeader>
        
        {!clientSecret ? (
          <div className="space-y-6">
            <div className="text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Choose Payment Type</h3>
              <p className="text-muted-foreground">
                Select the type of payment method you'd like to add
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-type">Payment Method Type</Label>
                <Select 
                  value={paymentMethodType} 
                  onValueChange={(value: 'card' | 'us_bank_account') => setPaymentMethodType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Credit/Debit Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="us_bank_account">
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>Bank Account</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartSetup}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Setting up...' : 'Continue'}
              </Button>
            </div>
          </div>
        ) : (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <PaymentForm onSuccess={handleSuccessAndRefresh} onClose={handleClose} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}