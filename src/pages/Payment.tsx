import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import StripePaymentForm from '@/components/StripePaymentForm';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get payment details from navigation state
  const { amount, propertyId } = location.state || {};

  useEffect(() => {
    if (!amount || !propertyId) {
      toast({
        title: "Payment Error",
        description: "Missing payment information. Redirecting back.",
        variant: "destructive"
      });
      navigate('/rent-payments');
      return;
    }

    const createPaymentIntent = async () => {
      try {
        // Get user session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        
        if (!jwt) {
          throw new Error('Authentication required. Please log in to make a payment.');
        }

        const { data, error } = await supabase.functions.invoke('create-rent-payment', {
          body: {
            propertyId,
            amount
          },
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        });

        if (error) {
          throw new Error(`Payment setup error: ${error.message}`);
        }

        if (data?.client_secret) {
          setClientSecret(data.client_secret);
        } else {
          throw new Error('No client secret returned from payment function');
        }
      } catch (error) {
        console.error('Error creating payment:', error);
        toast({
          title: "Payment Error",
          description: error instanceof Error ? error.message : "Failed to initialize payment.",
          variant: "destructive"
        });
        navigate('/rent-payments');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, propertyId, navigate, toast]);

  const handlePaymentSuccess = (paymentIntentId?: string) => {
    // Trigger payment history refresh in the background
    localStorage.setItem('payment_completed', 'true');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'payment_completed',
      newValue: 'true'
    }));

    navigate('/rent-payment-confirmation', {
      state: { paymentIntentId },
    });
  };

  const handleBack = () => {
    navigate('/rent-payments');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Setting up payment...</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to initialize payment</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rent Payments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="p-2 mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Complete Payment</h1>
          </div>
        </div>
      </header>

      {/* Payment Form */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="mb-6 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium text-primary">Payment Amount</p>
            <p className="text-3xl font-bold text-primary">${amount?.toFixed(2)}</p>
          </div>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: 'hsl(var(--primary))',
                  colorBackground: 'hsl(var(--background))',
                  colorText: 'hsl(var(--foreground))',
                  colorDanger: 'hsl(var(--destructive))',
                  fontFamily: 'Inter, system-ui, sans-serif',
                },
              },
            }}
          >
            <StripePaymentForm
              amount={amount}
              propertyId={propertyId}
              clientSecret=""
              onSuccess={handlePaymentSuccess}
              onCancel={handleBack}
            />
          </Elements>
        </div>
      </main>
    </div>
  );
};

export default Payment;