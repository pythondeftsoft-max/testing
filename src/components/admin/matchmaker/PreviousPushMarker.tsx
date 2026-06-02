import React, { useState } from 'react';
import { useTenantLatestPushesByUnit } from '@/hooks/usePropertyPushHistory';
import { History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PushTimelineDrawer } from './finder/PushTimelineDrawer';

interface PreviousPushMarkerProps {
  tenantId: string | null | undefined;
  unitId?: string | null;
  propertyId?: string | null;
  tenantName?: string;
  propertyAddress?: string;
  className?: string;
}

const getStatusLabel = (status: string, isExpired: boolean) => {
  if (status === 'denied' || status === 'rejected') return 'declined';
  if (status === 'interested') return 'interested';
  if (status === 'landlord_review' || status === 'primary_applicant') return 'with landlord';
  if (isExpired) return 'expired';
  return 'awaiting';
};

/**
 * Tiny inline marker — shows when a unit/property has previously been pushed to a tenant.
 * Renders nothing if no prior push exists. Click opens the full timeline drawer.
 */
export const PreviousPushMarker: React.FC<PreviousPushMarkerProps> = ({
  tenantId,
  unitId,
  propertyId,
  tenantName,
  propertyAddress,
  className,
}) => {
  const { data: pushMap } = useTenantLatestPushesByUnit(tenantId || undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!tenantId) return null;
  const key = unitId || propertyId;
  if (!key) return null;

  const push = pushMap?.get(key);
  if (!push) return null;

  const ago = formatDistanceToNow(new Date(push.pushed_at), { addSuffix: true });
  const label = getStatusLabel(push.status, push.is_expired);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border',
          'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors',
          className
        )}
        title="View full push history"
      >
        <History className="w-2.5 h-2.5" />
        Previously pushed {ago} · {label}
      </button>
      <PushTimelineDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tenantUserId={tenantId}
        unitId={unitId || null}
        propertyId={propertyId || null}
        tenantName={tenantName}
        propertyAddress={propertyAddress}
      />
    </>
  );
};
