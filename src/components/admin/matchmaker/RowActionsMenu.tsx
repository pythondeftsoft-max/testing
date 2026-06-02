import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { ManualFillSlotDialog } from './ManualFillSlotDialog';
import { SelectPrimaryMatchDialog, PushOption } from './SelectPrimaryMatchDialog';
import { OverrideStageDialog } from './OverrideStageDialog';
import { useAdminSetPrimaryAndAdvance } from '@/hooks/useAdminManualPipeline';

interface Props {
  entityType: 'property' | 'tenant';
  entityId: string; // unit id OR tenant id
  pushes: PushOption[];
  currentStage?: string | null;
  unitLabel?: string;
  defaultRent?: number | null;
  isAdminListed?: boolean;
}

type AdvanceTarget = 'in_process' | 'lease_signed' | 'housed_paid';

export const RowActionsMenu: React.FC<Props> = ({
  entityType, entityId, pushes, currentStage, unitLabel, defaultRent, isAdminListed,
}) => {
  const [fillOpen, setFillOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [primaryDialog, setPrimaryDialog] = useState<AdvanceTarget | null>(null);

  const { mutate: setPrimary } = useAdminSetPrimaryAndAdvance();

  const isProperty = entityType === 'property';
  const activePushes = pushes.filter(p =>
    !['denied', 'withdrawn', 'expired'].includes(p.status)
  );

  const advance = (target: AdvanceTarget) => {
    if (!isProperty) return; // for tenants, override only
    if (activePushes.length === 0) {
      // No pushes — manual fill is the right path
      setFillOpen(true);
      return;
    }
    if (activePushes.length === 1) {
      setPrimary({
        unitId: entityId,
        tenantId: activePushes[0].tenant_id,
        targetStage: target,
        demoteOthers: false,
      });
      return;
    }
    setPrimaryDialog(target);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => e.stopPropagation()}
            title="Manual pipeline actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-60">
          <DropdownMenuLabel>Manual pipeline</DropdownMenuLabel>
          {isProperty && (
            <>
              <DropdownMenuItem onSelect={() => setFillOpen(true)}>
                Manually fill slot…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => advance('in_process')}>
                Move to In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => advance('lease_signed')}>
                {isAdminListed ? 'Mark Lease Signed (awaiting payment)' : 'Mark Lease Signed (send link)'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => advance('housed_paid')}>
                Mark Housed &amp; Paid
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => setOverrideOpen(true)}>
            Override stage…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isProperty && (
        <ManualFillSlotDialog
          open={fillOpen}
          onOpenChange={setFillOpen}
          unitId={entityId}
          unitLabel={unitLabel}
          defaultRent={defaultRent}
          isAdminListed={isAdminListed}
        />
      )}

      {isProperty && primaryDialog && (
        <SelectPrimaryMatchDialog
          open={!!primaryDialog}
          onOpenChange={(o) => !o && setPrimaryDialog(null)}
          unitId={entityId}
          unitLabel={unitLabel}
          pushes={activePushes}
          targetStage={primaryDialog}
        />
      )}

      <OverrideStageDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        entityType={isProperty ? 'unit' : 'tenant'}
        entityId={entityId}
        currentStage={currentStage}
      />
    </>
  );
};

export default RowActionsMenu;
