import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PushStatusBadge } from './SubStageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, X } from 'lucide-react';
import { UnsendPushConfirmDialog } from './UnsendPushConfirmDialog';
import { useUnsendPropertyPush } from '@/hooks/useUnsendPropertyPush';
import { RowActionsMenu } from './RowActionsMenu';
import { ManualFillSlotDialog } from './ManualFillSlotDialog';

interface PushStatusCellProps {
  entityType: 'property' | 'tenant';
  entityId: string;
}

interface PushWithDetails {
  id: string;
  status: string;
  pushed_at: string;
  expires_at: string;
  tenant_id: string;
  property_id: string;
  unit_id?: string;
  tenant_name?: string;
  property_address?: string;
}

const MAX_PUSH_SLOTS = 3;

// Relative time helper
const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const PushStatusCell: React.FC<PushStatusCellProps> = ({ entityType, entityId }) => {
  const [unsendTarget, setUnsendTarget] = useState<PushWithDetails | null>(null);
  const [manualFillOpen, setManualFillOpen] = useState(false);
  const { mutate, isPending, invalidateQueries } = useUnsendPropertyPush();

  // Fetch unit pipeline_stage + rent for property view (used by RowActionsMenu)
  const { data: unitMeta } = useQuery({
    queryKey: ['push-cell-unit-meta', entityId],
    enabled: entityType === 'property',
    queryFn: async () => {
      const { data } = await supabase
        .from('property_units')
        .select('pipeline_stage, monthly_rent, unit_number, properties(admin_listed)')
        .eq('id', entityId)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: tenantMeta } = useQuery({
    queryKey: ['push-cell-tenant-meta', entityId],
    enabled: entityType === 'tenant',
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('pipeline_stage')
        .eq('id', entityId)
        .maybeSingle();
      return data;
    },
  });

  // For property: fetch up to 3 pushes. For tenant: fetch 1.
  const { data: pushes, isLoading } = useQuery({
    queryKey: ['push-status', entityType, entityId],
    queryFn: async (): Promise<PushWithDetails[]> => {
      if (entityType === 'property') {
        const { data, error } = await supabase
          .from('property_pushes')
          .select('id, status, pushed_at, expires_at, tenant_id, property_id, unit_id')
          .eq('unit_id', entityId)
          .neq('status', 'denied')
          .order('pushed_at', { ascending: false })
          .limit(MAX_PUSH_SLOTS);

        if (error || !data?.length) return [];

        // Filter expired push_sent
        const active = data.filter(p =>
          p.status !== 'push_sent' || new Date(p.expires_at) >= new Date()
        );
        if (!active.length) return [];

        // Fetch tenant names in batch
        const tenantIds = [...new Set(active.map(p => p.tenant_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', tenantIds);

        const nameMap = new Map(
          (profiles || []).map(p => [
            p.id,
            `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown',
          ])
        );

        return active.map(p => ({ ...p, tenant_name: nameMap.get(p.tenant_id) || 'Unknown' }));
      } else {
        // Tenant: single push
        const { data, error } = await supabase
          .from('property_pushes')
          .select('id, status, pushed_at, expires_at, tenant_id, property_id, unit_id')
          .eq('tenant_id', entityId)
          .neq('status', 'denied')
          .order('pushed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) return [];
        if (data.status === 'push_sent' && new Date(data.expires_at) < new Date()) return [];

        let propertyAddress = 'Unknown Property';
        if (data.unit_id) {
          const { data: unitData } = await supabase
            .from('property_units')
            .select('properties(street_address, city, state)')
            .eq('id', data.unit_id)
            .single();
          const property = (unitData as any)?.properties;
          if (property) {
            propertyAddress = `${property.street_address || 'Unknown'}${property.city ? `, ${property.city}` : ''}`;
          }
        } else if (data.property_id) {
          const { data: propData } = await supabase
            .from('properties')
            .select('street_address, city, state')
            .eq('id', data.property_id)
            .single();
          if (propData) {
            propertyAddress = `${propData.street_address || 'Unknown'}${propData.city ? `, ${propData.city}` : ''}`;
          }
        }

        return [{ ...data, property_address: propertyAddress }];
      }
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const handleUnsend = (push: PushWithDetails) => {
    mutate(
      { pushId: push.id, tenantName: push.tenant_name || push.property_address },
      {
        onSettled: () => {
          setUnsendTarget(null);
          setTimeout(() => invalidateQueries(), 400);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        Loading...
      </Badge>
    );
  }

  const activePushes = pushes || [];

  // Build push options for kebab menu (used by both views in property)
  const pushOptions = activePushes.map(p => ({
    id: p.id,
    tenant_id: p.tenant_id,
    tenant_name: p.tenant_name || 'Unknown',
    status: p.status,
    pushed_at: p.pushed_at,
  }));

  // --- TENANT VIEW ---
  if (entityType === 'tenant') {
    const push = activePushes[0];
    if (!push) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
            <Clock className="h-3 w-3" />
            Not Pushed
          </Badge>
          <RowActionsMenu
            entityType="tenant"
            entityId={entityId}
            pushes={[]}
            currentStage={tenantMeta?.pipeline_stage}
          />
        </div>
      );
    }
    const canUnsend = ['push_sent', 'interested', 'landlord_review'].includes(push.status);
    return (
      <>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <PushStatusBadge status={push.status} size="sm" />
            {canUnsend && (
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setUnsendTarget(push); }} title="Unsend push">
                <X className="h-3 w-3" />
              </Button>
            )}
            <RowActionsMenu
              entityType="tenant"
              entityId={entityId}
              pushes={[]}
              currentStage={tenantMeta?.pipeline_stage}
            />
          </div>
          {push.property_address && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowLeft className="h-2.5 w-2.5" />
              <span className="truncate max-w-[100px]" title={push.property_address}>{push.property_address}</span>
            </div>
          )}
        </div>
        {unsendTarget && (
          <UnsendPushConfirmDialog
            open={!!unsendTarget}
            onOpenChange={(open) => !open && setUnsendTarget(null)}
            tenantName={unsendTarget.tenant_name || 'Unknown Tenant'}
            propertyAddress={unsendTarget.property_address}
            onConfirm={() => handleUnsend(unsendTarget)}
            isPending={isPending}
          />
        )}
      </>
    );
  }

  // --- PROPERTY VIEW: show up to 3 slots ---
  const slotCount = activePushes.length;
  const unitLabel = unitMeta?.unit_number ? `Unit ${unitMeta.unit_number}` : undefined;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {/* Slot usage badge + kebab */}
        <div className="flex items-center gap-1">
          <Badge
            variant={slotCount === 0 ? 'outline' : slotCount >= MAX_PUSH_SLOTS ? 'secondary' : 'default'}
            className="text-[10px] w-fit"
          >
            {slotCount}/{MAX_PUSH_SLOTS} pushed
          </Badge>
          <RowActionsMenu
            entityType="property"
            entityId={entityId}
            pushes={pushOptions}
            currentStage={unitMeta?.pipeline_stage}
            unitLabel={unitLabel}
            defaultRent={unitMeta?.monthly_rent}
            isAdminListed={!!(unitMeta as any)?.properties?.admin_listed}
          />
        </div>

        {/* Active push rows */}
        {activePushes.map((push) => {
          const canUnsend = ['push_sent', 'interested', 'landlord_review'].includes(push.status);
          const isBackup = push.status === 'matched';
          return (
            <div key={push.id} className="flex items-center gap-1.5 text-xs">
              <PushStatusBadge status={push.status} size="sm" />
              {isBackup && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">backup</Badge>
              )}
              <span className="font-medium truncate max-w-[100px]" title={push.tenant_name}>
                {push.tenant_name}
              </span>
              <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                {timeAgo(push.pushed_at)}
              </span>
              {canUnsend && (
                <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setUnsendTarget(push); }} title="Unsend push">
                  <X className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          );
        })}

        {/* Empty slot placeholders — clickable to open manual fill */}
        {Array.from({ length: MAX_PUSH_SLOTS - slotCount }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); setManualFillOpen(true); }}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-foreground hover:underline text-left"
            title="Manually fill this slot from an off-platform match"
          >
            <Clock className="h-3 w-3" />
            <span>Slot open — fill manually</span>
          </button>
        ))}
      </div>

      <ManualFillSlotDialog
        open={manualFillOpen}
        onOpenChange={setManualFillOpen}
        unitId={entityId}
        unitLabel={unitLabel}
        defaultRent={unitMeta?.monthly_rent}
      />

      {unsendTarget && (
        <UnsendPushConfirmDialog
          open={!!unsendTarget}
          onOpenChange={(open) => !open && setUnsendTarget(null)}
          tenantName={unsendTarget.tenant_name || 'Unknown Tenant'}
          propertyAddress={unsendTarget.property_address}
          onConfirm={() => handleUnsend(unsendTarget)}
          isPending={isPending}
        />
      )}
    </>
  );
};

export default PushStatusCell;
