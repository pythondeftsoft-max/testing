import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Download, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF, type ReceiptData } from '@/utils/receiptGenerator';
import { toast } from 'sonner';

interface ConfirmResponse {
  success: boolean;
  paid: boolean;
  found?: boolean;
  placement_fee_id?: string;
  amount?: number;
  payment_date?: string;
  property_address?: string | null;
  tenant_name?: string | null;
}

const PlacementFeePaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const placementFeeId = searchParams.get('pf');

  const [status, setStatus] = useState<'polling' | 'confirmed' | 'pending'>('polling');
  const [data, setData] = useState<ConfirmResponse | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const MAX_ATTEMPTS = 15; // ~30s at 2s interval
    const INTERVAL_MS = 2000;
    let attempts = 0;

    const poll = async () => {
      while (!cancelledRef.current && attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
          const { data: resp } = await supabase.functions.invoke<ConfirmResponse>(
            'confirm-placement-fee-payment',
            {
              body: {
                session_id: sessionId || undefined,
                placement_fee_id: placementFeeId || undefined,
              },
            }
          );

          if (resp?.paid) {
            setData(resp);
            setStatus('confirmed');
            return;
          }
          if (resp && resp.found) {
            setData(resp);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
      }
      if (!cancelledRef.current) setStatus('pending');
    };

    if (sessionId || placementFeeId) {
      poll();
    } else {
      setStatus('pending');
    }

    return () => {
      cancelledRef.current = true;
    };
  }, [sessionId, placementFeeId]);

  const handleDownloadReceipt = async () => {
    if (!data) return;
    try {
      const receipt: ReceiptData = {
        transactionId: data.placement_fee_id || sessionId || 'placement-fee',
        propertyName: data.property_address || 'Placement Fee',
        amount: data.amount || 0,
        currency: 'USD',
        date: data.payment_date || new Date().toISOString(),
        description: `Placement Fee${data.tenant_name ? ` — ${data.tenant_name}` : ''}`,
        paymentMethod: 'Stripe',
      };
      await generateReceiptPDF(receipt);
      toast.success('Receipt downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Could not generate receipt');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="pt-8 pb-8">
          {status === 'polling' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-semibold">Confirming your payment…</h1>
              <p className="text-muted-foreground">
                Hang tight — this usually takes just a few seconds.
              </p>
            </div>
          )}

          {status === 'confirmed' && data && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-9 w-9 text-green-600" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">Thank you!</h1>
                <p className="text-muted-foreground">
                  Your placement fee payment was received.
                </p>
              </div>

              <div className="bg-muted rounded-lg p-5 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount paid</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(data.amount || 0)}
                  </span>
                </div>
                {data.property_address && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property</span>
                    <span className="font-medium text-right max-w-[60%]">
                      {data.property_address}
                    </span>
                  </div>
                )}
                {data.tenant_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant</span>
                    <span className="font-medium">{data.tenant_name}</span>
                  </div>
                )}
                {data.payment_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{formatDate(data.payment_date)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleDownloadReceipt} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Receipt
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                A confirmation email is on its way. You can safely close this page.
              </p>
            </div>
          )}

          {status === 'pending' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-9 w-9 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold">Payment received</h1>
              <p className="text-muted-foreground">
                Confirmation is taking a little longer than usual. Your payment went through —
                you'll receive an email receipt shortly. You can safely close this page.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Questions? support@openkeyhousing.com</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlacementFeePaymentSuccess;
