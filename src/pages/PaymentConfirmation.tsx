import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PaymentDetails {
  id: string;
  amount: number;
  currency_code: string;
  status: string;
  created_at: string;
  payment_period_start: string;
  payment_period_end: string;
  asset_name?: string;
  charge_description?: string;
}

export const PaymentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');
  const success = searchParams.get('success');

  useEffect(() => {
    if (success && sessionId) {
      confirmPayment(sessionId);
    } else {
      setLoading(false);
    }
  }, [success, sessionId]);

  const confirmPayment = async (sessionId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('confirm-asset-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      setPaymentDetails(data);
      
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "Failed to confirm payment status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="w-8 h-8 text-success" />;
      case 'processing':
        return <Clock className="w-8 h-8 text-warning" />;
      default:
        return <AlertCircle className="w-8 h-8 text-danger" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'default' as const;
      case 'processing':
        return 'secondary' as const;
      default:
        return 'destructive' as const;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Confirming your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!success || !sessionId || !paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-6 text-danger" />
            <h2 className="text-2xl font-bold mb-4">Payment Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the payment information you're looking for.
            </p>
            <Button onClick={() => navigate('/pay-rent')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {getStatusIcon(paymentDetails.status)}
          </div>
          <CardTitle className="text-3xl font-bold mb-2">
            Payment {paymentDetails.status === 'completed' || paymentDetails.status === 'paid' ? 'Successful' : 'Processing'}
          </CardTitle>
          <Badge variant={getStatusVariant(paymentDetails.status)} className="mx-auto">
            {paymentDetails.status}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Payment Amount */}
          <div className="text-center py-6 bg-muted rounded-lg">
            <div className="text-4xl font-bold text-primary mb-2">
              {paymentDetails.currency_code} {paymentDetails.amount}
            </div>
            <p className="text-muted-foreground">Payment Amount</p>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {paymentDetails.asset_name && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Property</p>
                  <p className="font-semibold">{paymentDetails.asset_name}</p>
                </div>
              )}
              
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Payment Date</p>
                <p className="font-semibold">
                  {format(new Date(paymentDetails.created_at), 'PPP')}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Payment Period</p>
                <p className="font-semibold">
                  {format(new Date(paymentDetails.payment_period_start), 'MMM dd')} - {format(new Date(paymentDetails.payment_period_end), 'MMM dd, yyyy')}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-xs break-all">{paymentDetails.id}</p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {(paymentDetails.status === 'completed' || paymentDetails.status === 'paid') && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-success font-medium text-center">
                ✅ Your payment has been successfully processed and recorded.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate('/pay-rent')} 
              variant="outline" 
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};