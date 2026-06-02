import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, Banknote, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  agencyId: string;
}

/**
 * Optional check: surface whether a Checkbook/NACHA rail is connected.
 * Doesn't block onboarding — agencies can configure later from Admin → Integrations → Payment Rails.
 */
export const PaymentRailsStep: React.FC<Props> = ({ agencyId }) => {
  const [loading, setLoading] = useState(true);
  const [rails, setRails] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('agency_payment_rails')
        .select('id, rail_type, display_name, verification_status, is_default')
        .eq('agency_id', agencyId)
        .eq('is_active', true);
      setRails(data || []);
      setLoading(false);
    };
    load();
  }, [agencyId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const hasVerified = rails.some(r => r.verification_status === 'verified');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect a payment processor so HAP disbursements can flow to landlords. You can finish this later — onboarding doesn't require it.
      </p>

      {rails.length === 0 ? (
        <Card>
          <CardContent className="p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm">No payment rails connected</div>
              <p className="text-xs text-muted-foreground mt-1">
                HAP batches can be drafted but won't disburse until a rail is connected (Checkbook, NACHA, etc.).
              </p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <a href="/agency?tab=admin" target="_blank" rel="noopener" className="inline-flex items-center gap-1">
                  Configure rails <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-2">
            {rails.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2.5 rounded border bg-card">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{r.display_name}</span>
                  <Badge variant="outline" className="text-xs">{r.rail_type}</Badge>
                  {r.is_default && <Badge className="text-xs">Default</Badge>}
                </div>
                {r.verification_status === 'verified' ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                ) : r.verification_status === 'failed' ? (
                  <Badge variant="destructive">Verification failed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            ))}
            {!hasVerified && (
              <p className="text-xs text-muted-foreground pt-2">
                ⚠️ At least one rail should be verified before processing live HAP batches.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Manage rails anytime under <strong>Admin → Integrations → Payment Rails</strong>.
      </p>
    </div>
  );
};

export default PaymentRailsStep;
