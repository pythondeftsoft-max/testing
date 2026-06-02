import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Home, User, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openStripeLink, copyStripeLink } from '@/utils/stripeLinks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlacementFeeMessageCardProps {
  message: any;
  isSender: boolean;
}

const PlacementFeeMessageCard: React.FC<PlacementFeeMessageCardProps> = ({ 
  message, 
  isSender 
}) => {
  // Extract data from message payload
  const feeAmount = message.payload?.fee_amount || 0;
  const dueDate = message.payload?.due_date;
  const paymentUrl = message.payload?.payment_url;
  const propertyAddress = message.payload?.property_address || 'Property Address';
  const tenantName = message.payload?.tenant_name || 'Tenant';
  const placementFeeId = message.payload?.placement_fee_id;
  const applicationId = message.payload?.application_id;

  // Query the actual placement fee status from the database
  const { data: placementFee } = useQuery({
    queryKey: ['placement-fee-status', placementFeeId],
    queryFn: async () => {
      if (!placementFeeId) return null;
      const { data } = await supabase
        .from('landlord_placement_fees')
        .select('payment_status, fee_amount, link_status')
        .eq('id', placementFeeId)
        .single();
      return data;
    },
    enabled: !!placementFeeId,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60000, // Refetch every 60 seconds while component is mounted
  });

  const isPaid = placementFee?.payment_status === 'paid';
  const isExpired = placementFee?.link_status === 'expired' || placementFee?.link_status === 'cancelled';
  const actualFeeAmount = placementFee?.fee_amount || feeAmount;

  const handlePayNow = () => {
    if (paymentUrl) {
      openStripeLink(paymentUrl, {
        buttonText: 'Payment page',
        onCopyFallback: () => copyStripeLink(paymentUrl, 'Payment link')
      });
    }
  };

  const handleCopyLink = () => {
    if (paymentUrl) {
      copyStripeLink(paymentUrl, 'Payment link');
    }
  };

  return (
    <div className={cn("flex w-full", isSender ? "justify-end" : "justify-start")}>
      <Card className={cn(
        "w-full max-w-2xl border-l-4 transition-colors",
        isPaid 
          ? "bg-muted/50 border-l-green-500 opacity-75" 
          : isExpired
            ? "bg-yellow-50/50 border-l-yellow-500"
            : "hover:bg-accent/30 border-l-blue-500"
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-lg">💰 Placement Fee Payment</h4>
            </div>
            {isPaid ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" /> Paid
              </Badge>
            ) : isExpired ? (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertCircle className="h-3 w-3 mr-1" /> Link Expired
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Payment Due
              </Badge>
            )}
          </div>
          
          {/* Message Text */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {message.message_text}
          </p>
          
          {/* Payment Details */}
          <div className="space-y-3 mb-4 bg-accent/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Amount Due:</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(actualFeeAmount)}</span>
            </div>
            
            {dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span className="font-medium">{formatDate(dueDate)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Property:</span>
              <span className="font-medium">{propertyAddress}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tenant:</span>
              <span className="font-medium">{tenantName}</span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Sent {formatDate(new Date(message.created_at))}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            </div>
            
            {isPaid ? (
              <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Payment Complete
              </div>
            ) : isExpired ? (
              <div className="text-sm text-yellow-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Link expired - contact support
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handlePayNow}
                  className="shrink-0 bg-primary hover:bg-primary/90"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlacementFeeMessageCard;
