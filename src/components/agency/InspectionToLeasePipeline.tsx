import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight, FileSignature, Home, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type LeaseStatus = 'not_started' | 'pending_lease' | 'lease_sent' | 'executed';

interface PipelineItem {
  inspectionId: string;
  rftaPacketId: string | null;
  hapContractId: string | null;
  propertyAddress: string;
  tenantName: string;
  tenantId: string | null;
  landlordId: string | null;
  inspectionDate: string;
  leaseStatus: LeaseStatus;
}

const statusLabels: Record<LeaseStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  not_started: { label: 'Awaiting Lease', variant: 'destructive' },
  pending_lease: { label: 'Lease Pending', variant: 'secondary' },
  lease_sent: { label: 'Sent to Tenant', variant: 'outline' },
  executed: { label: 'Lease Executed', variant: 'default' },
};

/**
 * Derives lease status from the HAP contract record (if any).
 * No HAP contract → not_started.
 * HAP exists but not active → pending_lease.
 * HAP active → executed.
 */
function deriveLeaseStatus(hapStatus: string | null | undefined): LeaseStatus {
  if (!hapStatus) return 'not_started';
  const s = hapStatus.toLowerCase();
  if (s === 'active' || s === 'executed') return 'executed';
  if (s === 'sent' || s === 'pending_signature') return 'lease_sent';
  return 'pending_lease';
}

const InspectionToLeasePipeline: React.FC<{ agencyId: string }> = ({ agencyId }) => {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Pull recent passed inspections for this agency
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select('id, rfta_packet_id, hap_contract_id, tenant_id, completed_date, scheduled_date')
        .eq('agency_id', agencyId)
        .eq('result', 'pass')
        .order('completed_date', { ascending: false, nullsFirst: false })
        .limit(25);

      if (error) throw error;
      const list = inspections || [];
      if (list.length === 0) { setItems([]); return; }

      const rftaIds = Array.from(new Set(list.map(i => i.rfta_packet_id).filter(Boolean))) as string[];
      const hapIds = Array.from(new Set(list.map(i => i.hap_contract_id).filter(Boolean))) as string[];
      const tenantIds = Array.from(new Set(list.map(i => i.tenant_id).filter(Boolean))) as string[];

      const fetchRows = async <T,>(p: PromiseLike<{ data: T[] | null }> | null): Promise<T[]> => {
        if (!p) return [];
        const r = await p;
        return (r.data as T[]) || [];
      };

      const rftaData = await fetchRows<any>(
        rftaIds.length ? supabase.from('rfta_packets').select('id, landlord_id, tenant_data, packet_data').in('id', rftaIds) : null
      );
      const hapData = await fetchRows<any>(
        hapIds.length ? supabase.from('agency_hap_contracts').select('id, status, property_address, tenant_id, landlord_id').in('id', hapIds) : null
      );
      let profileData: any[] = [];
      if (tenantIds.length) {
        const profQ: any = supabase.from('profiles');
        const { data: pData } = await profQ.select('user_id, full_name').in('user_id', tenantIds);
        profileData = (pData as any[]) || [];
      }

      const rftaMap = new Map(rftaData.map((r: any) => [r.id, r]));
      const hapMap = new Map(hapData.map((h: any) => [h.id, h]));
      const profileMap = new Map(profileData.map((p: any) => [p.user_id, p]));

      const mapped: PipelineItem[] = list.map((insp: any) => {
        const rfta = insp.rfta_packet_id ? rftaMap.get(insp.rfta_packet_id) : null;
        const hap = insp.hap_contract_id ? hapMap.get(insp.hap_contract_id) : null;
        const profile = insp.tenant_id ? profileMap.get(insp.tenant_id) : null;

        const tenantName =
          profile?.full_name ||
          rfta?.tenant_data?.full_name ||
          rfta?.tenant_data?.name ||
          'Tenant';

        const propertyAddress =
          hap?.property_address ||
          rfta?.packet_data?.property_address ||
          rfta?.packet_data?.address ||
          'Address unavailable';

        return {
          inspectionId: insp.id,
          rftaPacketId: insp.rfta_packet_id ?? null,
          hapContractId: insp.hap_contract_id ?? null,
          propertyAddress,
          tenantName,
          tenantId: insp.tenant_id ?? hap?.tenant_id ?? null,
          landlordId: hap?.landlord_id ?? rfta?.landlord_id ?? null,
          inspectionDate: (insp.completed_date || insp.scheduled_date || '').toString().slice(0, 10),
          leaseStatus: deriveLeaseStatus(hap?.status),
        };
      });

      setItems(mapped);
    } catch (e: any) {
      console.error('InspectionToLeasePipeline load error', e);
      toast.error('Failed to load lease pipeline');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { if (agencyId) load(); }, [agencyId, load]);

  const handlePromptLease = async (item: PipelineItem) => {
    setActingId(item.inspectionId);
    try {
      // If a HAP contract already exists, bump it to pending; otherwise notify the landlord.
      if (item.hapContractId) {
        const { error } = await supabase
          .from('agency_hap_contracts')
          .update({ status: 'pending_signature' })
          .eq('id', item.hapContractId);
        if (error) throw error;
      }

      if (item.landlordId) {
        await supabase.from('notifications').insert({
          user_id: item.landlordId,
          type: 'lease_prompt',
          title: 'Lease ready to draft',
          description: `Inspection passed for ${item.propertyAddress}. Please prepare and send the lease.`,
          category: 'leasing',
          priority: 'high',
          related_entity_type: 'inspection',
          related_entity_id: item.inspectionId,
          metadata: {
            rfta_packet_id: item.rftaPacketId,
            hap_contract_id: item.hapContractId,
          },
        } as any);
      }

      toast.success('Landlord notified — lease generation prompted');
      // Optimistic update
      setItems(prev => prev.map(i =>
        i.inspectionId === item.inspectionId ? { ...i, leaseStatus: 'pending_lease' } : i
      ));
    } catch (e: any) {
      console.error('promptLease error', e);
      toast.error(e?.message || 'Could not prompt lease');
    } finally {
      setActingId(null);
    }
  };

  const awaitingCount = items.filter(i => i.leaseStatus === 'not_started').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Inspection → Lease Pipeline
          </CardTitle>
          {awaitingCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {awaitingCount} awaiting lease
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading pipeline…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No passed inspections pending lease execution</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const status = statusLabels[item.leaseStatus];
              const isActing = actingId === item.inspectionId;
              return (
                <div key={item.inspectionId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.tenantName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" /> {item.propertyAddress}
                      </p>
                      {item.inspectionDate && (
                        <p className="text-xs text-muted-foreground">Passed: {item.inspectionDate}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {item.leaseStatus === 'not_started' && (
                      <Button size="sm" disabled={isActing} onClick={() => handlePromptLease(item)}>
                        {isActing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                        Prompt Lease
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectionToLeasePipeline;
