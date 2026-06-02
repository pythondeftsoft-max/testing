import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const invalidatePipeline = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['push-status'] });
  qc.invalidateQueries({ queryKey: ['pipeline'] });
  qc.invalidateQueries({ queryKey: ['admin-pipeline'] });
  qc.invalidateQueries({ queryKey: ['property-units'] });
  qc.invalidateQueries({ queryKey: ['tenants'] });
};

const isUnitAdminListed = async (unitId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('property_units')
    .select('properties(admin_listed)')
    .eq('id', unitId)
    .maybeSingle();
  return !!(data as any)?.properties?.admin_listed;
};

const maybeFireStripeLink = async (unitId: string, tenantId: string) => {
  try {
    if (await isUnitAdminListed(unitId)) {
      // Admin-listed: fee is admin-collected. Skip auto-link.
      return { skipped: true as const };
    }
    await supabase.functions.invoke('process-lease-signed-payment', {
      body: { unit_id: unitId, tenant_id: tenantId, source: 'admin_manual' },
    });
    return { skipped: false as const };
  } catch (e) {
    console.warn('process-lease-signed-payment failed (non-blocking)', e);
    return { skipped: false as const };
  }
};

export const useAdminManualFillPushSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      unitId: string;
      tenantId: string;
      targetStage: 'interested' | 'lease_signed' | 'housed_paid';
      leaseStart?: string | null;
      leaseEnd?: string | null;
      monthlyRent?: number | null;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_manual_fill_push_slot', {
        p_unit_id: params.unitId,
        p_tenant_id: params.tenantId,
        p_target_stage: params.targetStage,
        p_lease_start: params.leaseStart ?? null,
        p_lease_end: params.leaseEnd ?? null,
        p_monthly_rent: params.monthlyRent ?? null,
        p_reason: params.reason,
      });
      if (error) throw error;
      let skipped = false;
      if (params.targetStage === 'lease_signed') {
        const r = await maybeFireStripeLink(params.unitId, params.tenantId);
        skipped = r.skipped;
      }
      return { data, skipped };
    },
    onSuccess: (r: any) => {
      toast.success(
        r?.skipped
          ? 'Lease signed recorded. Manage the placement fee from House Hunter → Fees.'
          : 'Manual match recorded'
      );
      invalidatePipeline(qc);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to fill slot'),
  });
};

export const useAdminSetPrimaryAndAdvance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      unitId: string;
      tenantId: string;
      targetStage: 'in_process' | 'lease_signed' | 'housed_paid';
      demoteOthers?: boolean;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_set_primary_and_advance', {
        p_unit_id: params.unitId,
        p_tenant_id: params.tenantId,
        p_target_stage: params.targetStage,
        p_demote_others: params.demoteOthers ?? false,
        p_reason: params.reason ?? null,
      });
      if (error) throw error;
      let skipped = false;
      if (params.targetStage === 'lease_signed') {
        const r = await maybeFireStripeLink(params.unitId, params.tenantId);
        skipped = r.skipped;
      }
      return { data, skipped };
    },
    onSuccess: (r: any) => {
      toast.success(
        r?.skipped
          ? 'Primary set. Lease signed — manage the placement fee from House Hunter → Fees.'
          : 'Primary match set & pipeline advanced'
      );
      invalidatePipeline(qc);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to set primary'),
  });
};

export const useAdminOverrideStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      entityType: 'tenant' | 'unit';
      entityId: string;
      targetStage: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_override_stage', {
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_target_stage: params.targetStage,
        p_reason: params.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Stage overridden');
      invalidatePipeline(qc);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to override stage'),
  });
};
