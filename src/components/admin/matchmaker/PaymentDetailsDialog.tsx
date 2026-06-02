import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Loader2, RefreshCw, Send, Eye, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useResendPaymentLink } from '@/hooks/useResendPaymentLink';
import { format } from 'date-fns';
import { ConfirmPlacementFeeDialog } from './ConfirmPlacementFeeDialog';

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  propertyAddress?: string;
  tenantName?: string;
  placementFeeAmount?: number;
  tenantId?: string;
  propertyId?: string;
  unitId?: string;
}

export const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps> = ({
  open,
  onOpenChange,
  applicationId,
  propertyAddress,
  tenantName,
  placementFeeAmount,
  tenantId,
  propertyId,
  unitId,
}) => {
  const resend = useResendPaymentLink();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment-details', applicationId],
    enabled: open && !!applicationId,
    queryFn: async () => {
      const { data: fees } = await supabase
        .from('landlord_placement_fees')
        .select('*')
        .or(
          `marketplace_application_id.eq.${applicationId},property_application_id.eq.${applicationId},property_push_id.eq.${applicationId}`
        )
        .order('created_at', { ascending: false })
        .limit(1);

      const fee = fees?.[0] as any;
      if (!fee) return { fee: null, link: null };

      const { data: links } = await supabase
        .from('placement_fee_payment_links')
        .select('*')
        .eq('placement_fee_id', fee.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return { fee, link: links?.[0] || null };
    },
  });

  const fee = data?.fee;
  const link = data?.link;
  const url: string | undefined = fee?.stripe_checkout_url;
  const status = fee?.payment_status || fee?.status || (fee?.link_status === 'active' ? 'awaiting_payment' : fee?.link_status);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Payment link copied');
  };

  const open_ = () => url && window.open(url, '_blank');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription>
              {propertyAddress && <span>{propertyAddress}</span>}
              {tenantName && <span> · Tenant: {tenantName}</span>}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Amount</span>
                  <span className="font-semibold">${Number(fee?.fee_amount ?? placementFeeAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={status === 'paid' ? 'default' : 'secondary'}>{status || 'no link yet'}</Badge>
                </div>
                {fee?.stripe_checkout_created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created</span>
                    <span>{format(new Date(fee.stripe_checkout_created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
                {link?.expires_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{format(new Date(link.expires_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {link && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Views</span>
                    <span>
                      {link.accessed_count ?? 0}
                      {link.last_accessed_at && (
                        <span className="text-muted-foreground ml-1">· last {format(new Date(link.last_accessed_at), 'MMM d')}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {url ? (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Stripe checkout URL</p>
                  <p className="text-xs font-mono break-all">{url}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={copy} className="flex-1">
                      <Copy className="h-4 w-4 mr-1.5" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={open_} className="flex-1">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Open
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No payment link generated yet. Use "Resend / Generate link" below.
                </p>
              )}

              <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <span>Once Stripe receives payment, this row auto-advances to <strong>Paid &amp; Housed</strong> — no manual action needed.</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {applicationId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => resend.mutate(applicationId, { onSuccess: () => refetch() })}
                    disabled={resend.isPending}
                    className="flex-1 min-w-[140px]"
                  >
                    {resend.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {url ? 'Resend email' : 'Generate & send link'}
                  </Button>
                )}
                {applicationId && url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resend.mutate(applicationId, { onSuccess: () => refetch() })}
                    disabled={resend.isPending}
                    title="Generate a new Stripe link"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!tenantId || !propertyId}
                >
                  Confirm payment manually (bank tag / check / other)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {confirmOpen && tenantId && propertyId && (
        <ConfirmPlacementFeeDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); refetch(); }}
          entityType="property"
          entityId={propertyId}
          entityName={propertyAddress || tenantName || 'Placement'}
          placementFeeAmount={placementFeeAmount || 0}
          applicationId={applicationId}
          tenantId={tenantId}
          propertyId={propertyId}
          unitId={unitId}
        />
      )}
    </>
  );
};
