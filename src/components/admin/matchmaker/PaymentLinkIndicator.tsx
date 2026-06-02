import React, { useState } from 'react';
import { Link as LinkIcon, Eye, RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PaymentLinkIndicatorProps {
  createdAt: string;
  expiresAt: string;
  accessedCount: number | null;
  lastAccessedAt: string | null;
  placementFeeId?: string;
}

export const PaymentLinkIndicator: React.FC<PaymentLinkIndicatorProps> = ({
  createdAt,
  expiresAt,
  accessedCount,
  lastAccessedAt,
  placementFeeId,
}) => {
  const [checking, setChecking] = useState(false);
  const queryClient = useQueryClient();

  const daysActive = differenceInDays(new Date(), new Date(createdAt));
  const expiresInDays = differenceInDays(new Date(expiresAt), new Date());

  const getColorClass = () => {
    if (daysActive <= 3) return 'text-success';
    if (daysActive <= 7) return 'text-warning';
    return 'text-destructive';
  };

  const colorClass = getColorClass();

  const handleRecheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!placementFeeId) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-placement-fee-payment', {
        body: { placement_fee_id: placementFeeId },
      });
      if (error) throw error;
      if (data?.alreadyProcessed) {
        toast.info('Already marked as paid — refreshing.');
      } else if (data?.success) {
        toast.success('Payment confirmed via Stripe — moved to Housed – Paid.');
      } else {
        toast.warning(data?.error || 'Stripe says this session is not paid yet.');
      }
      queryClient.invalidateQueries();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('not completed')) {
        toast.warning('Stripe says this session has not been paid yet.');
      } else {
        toast.error(`Re-check failed: ${msg}`);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${colorClass} cursor-help`}>
              <LinkIcon className="h-3 w-3" />
              <span>Payment link: {daysActive} {daysActive === 1 ? 'day' : 'days'} active</span>
              {accessedCount !== null && accessedCount > 0 && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] border-current">
                  <Eye className="h-2.5 w-2.5 mr-0.5" />
                  {accessedCount}x
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p><strong>Created:</strong> {new Date(createdAt).toLocaleDateString()}</p>
              <p><strong>Expires in:</strong> {expiresInDays} days</p>
              {lastAccessedAt && (
                <p><strong>Last viewed:</strong> {new Date(lastAccessedAt).toLocaleDateString()}</p>
              )}
              {accessedCount === 0 && (
                <p className="text-warning">⚠️ Link not opened yet</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {placementFeeId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs gap-1"
                disabled={checking}
                onClick={handleRecheck}
              >
                <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking…' : 'Re-check'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Ask Stripe whether this link was actually paid. If yes, the tenant + unit will move to "Housed – Paid".
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
