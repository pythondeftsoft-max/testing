import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Receipt, Home, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { generateReceiptPDF, type ReceiptData } from '@/utils/receiptGenerator';

interface PaymentData {
  transaction: any;
  asset: any;
}

export const PaymentConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast: hookToast } = useToast();

  const handleDownloadReceipt = async (transaction: any, asset: any) => {
    try {
      const receiptData: ReceiptData = {
        transactionId: transaction.id,
        propertyName: asset.asset_name,
        amount: transaction.amount,
        currency: transaction.currency_code || 'USD',
        date: transaction.payment_date,
        description: 'Rent Payment',
        paymentMethod: 'Card Payment'
      };

      await generateReceiptPDF(receiptData);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  useEffect(() => {
    const confirmPayment = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
          'confirm-asset-payment',
          {
            body: { session_id: sessionId },
          }
        );

        if (confirmError) {
          throw confirmError;
        }

        if (confirmData?.error) {
          throw new Error(confirmData.error);
        }

        setData(confirmData);
        hookToast({
          title: "Payment Confirmed!",
          description: "Your payment has been processed successfully.",
        });

      } catch (err) {
        console.error('Payment confirmation error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        hookToast({
          title: "Payment Confirmation Failed",
          description: "There was an issue confirming your payment.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [sessionId, hookToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Confirming your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Payment Confirmation Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate('/dashboard')}>
                <Home className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Payment Successful!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {data && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-medium">{data.asset?.asset_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: data.transaction?.currency_code || 'USD'
                  }).format(data.transaction?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-xs">{data.transaction?.id}</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            {data && (
              <Button 
                onClick={() => handleDownloadReceipt(data.transaction, data.asset)}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
            )}

            <Button onClick={() => navigate('/payments/history')} variant="outline">
              <Receipt className="mr-2 h-4 w-4" />
              View Payment History
            </Button>
            
            <Button onClick={() => navigate('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};