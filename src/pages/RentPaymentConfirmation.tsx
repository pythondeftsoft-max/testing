import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, ArrowLeft, Receipt, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface RentPaymentRow {
  id: string;
  amount: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  payment_date: string;
  created_at: string | null;
  property_address: string | null;
  stripe_payment_intent_id: string | null;
}

const RentPaymentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const piFromQuery = searchParams.get('payment_intent') || searchParams.get('pi');
  const piFromState = (location.state as { paymentIntentId?: string } | null)?.paymentIntentId;
  const paymentIntentId = piFromQuery || piFromState;

  const [payment, setPayment] = useState<RentPaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollExhausted, setPollExhausted] = useState(false);

  // Notify the rent payments list to refresh
  useEffect(() => {
    localStorage.setItem('payment_completed', 'true');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'payment_completed',
      newValue: 'true',
    }));
  }, []);

  useEffect(() => {
    if (!paymentIntentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      const { data } = await supabase
        .from('rent_payments')
        .select('id, amount, status, payment_status, payment_method, payment_date, created_at, property_address, stripe_payment_intent_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setPayment(data as RentPaymentRow);
        setLoading(false);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setPollExhausted(true);
        setLoading(false);
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId]);

  const isACH = payment?.payment_method?.toLowerCase().includes('bank') ||
    payment?.payment_method?.toLowerCase().includes('ach') ||
    payment?.payment_method?.toLowerCase().includes('us_bank');

  const isProcessing = payment?.status === 'processing' || payment?.payment_status === 'processing';

  const showSuccess = payment && !isProcessing && !isACH;
  const showSubmitted = payment && (isACH || isProcessing);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            {loading ? (
              <>
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-2" />
                <CardTitle className="text-2xl">Confirming your payment…</CardTitle>
              </>
            ) : showSuccess ? (
              <>
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-2" />
                <CardTitle className="text-2xl">Payment Received</CardTitle>
              </>
            ) : showSubmitted ? (
              <>
                <Clock className="w-16 h-16 mx-auto text-yellow-600 mb-2" />
                <CardTitle className="text-2xl">Payment Submitted</CardTitle>
              </>
            ) : (
              <>
                <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-2xl">Payment Processing</CardTitle>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {showSubmitted && (
              <Alert>
                <AlertDescription>
                  Bank transfers typically take <strong>1–5 business days</strong> to clear. We'll
                  email you once the payment is confirmed.
                </AlertDescription>
              </Alert>
            )}

            {pollExhausted && !payment && (
              <Alert>
                <AlertDescription>
                  Your payment was sent to Stripe successfully. It may take a moment to appear in
                  your payment history. We'll email you once it's confirmed.
                </AlertDescription>
              </Alert>
            )}

            {payment && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-lg">
                    ${Number(payment.amount).toFixed(2)}
                  </span>
                </div>
                {payment.property_address && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Property</span>
                    <span className="font-medium text-right">{payment.property_address}</span>
                  </div>
                )}
                {payment.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium capitalize">
                      {payment.payment_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(new Date(payment.created_at || payment.payment_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={showSuccess ? 'default' : 'secondary'}>
                    {showSuccess ? 'Confirmed' : 'Processing'}
                  </Badge>
                </div>
                {payment.stripe_payment_intent_id && (
                  <div className="flex justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-muted-foreground">
                      {payment.stripe_payment_intent_id.slice(-12)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/rent-payments')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Rent Payments
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/rent-payments')}
              >
                <Receipt className="w-4 h-4 mr-2" />
                View Payment History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RentPaymentConfirmation;
