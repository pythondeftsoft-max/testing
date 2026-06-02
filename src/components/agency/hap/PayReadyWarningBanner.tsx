import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePayReadiness } from '@/hooks/usePayReadiness';

interface Props {
  agencyId: string;
  landlordIds: string[]; // distinct landlord_id values from batch items
}

/**
 * Soft warning banner for HAP batch detail. When the agency has opted into
 * `hap_block_unready_landlords`, the banner switches to a hard-block tone and
 * the parent disables the advance button (enforced in HAPBatchDetail).
 */
const PayReadyWarningBanner: React.FC<Props> = ({ agencyId, landlordIds }) => {
  const { unready, hardBlock } = usePayReadiness(agencyId, landlordIds);

  if (unready.length === 0) return null;

  return (
    <Alert className={hardBlock ? 'border-destructive/50' : 'border-amber-400/60'}>
      <ShieldAlert className={`h-4 w-4 ${hardBlock ? 'text-destructive' : 'text-amber-600'}`} />
      <AlertTitle className="flex items-center gap-2">
        {hardBlock ? 'Disbursement blocked: landlords not pay-ready' : 'Heads up: landlords not pay-ready'}
        <Badge variant="outline" className="ml-1">{unready.length}</Badge>
      </AlertTitle>
      <AlertDescription>
        <p className="text-sm mb-2">
          {hardBlock
            ? 'Your agency requires all payees to be pay-ready before disbursement. Resolve the items below or have an admin override at the landlord level.'
            : 'These landlords have not completed the pay-ready checklist (W-9, bank verification, executed HAP contract). Disbursement will proceed, but funds may fail to settle.'}
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          {unready.slice(0, 5).map((l) => (
            <li key={l.id}>
              <span className="font-medium">{l.landlord_name}</span>
              {l.pay_hold_reason ? <span className="text-muted-foreground"> — {l.pay_hold_reason}</span> : null}
            </li>
          ))}
          {unready.length > 5 && (
            <li className="text-muted-foreground">…and {unready.length - 5} more</li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default PayReadyWarningBanner;
