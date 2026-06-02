import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox, UserPlus, Sparkles, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import AssignInspectorDialog from './AssignInspectorDialog';

interface Props { agencyId: string; }

interface Row {
  id: string;
  inspection_type: string;
  status: string;
  scheduled_date: string | null;
  requested_at: string | null;
  request_reason: string | null;
  urgency: string | null;
  property_id: string | null;
  unit_id: string | null;
  hap_contract_id: string | null;
  declined_by: string | null;
  decline_reason: string | null;
  property_address?: string | null;
}

const UnassignedInspectionsQueue: React.FC<Props> = ({ agencyId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchRunning, setBatchRunning] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ id: string; zip: string | null } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspections')
      .select('id, inspection_type, status, scheduled_date, requested_at, request_reason, urgency, property_id, unit_id, hap_contract_id, declined_by, decline_reason, created_at')
      .eq('agency_id', agencyId)
      .is('inspector_id', null)
      .in('status', ['scheduled', 'requested'])
      .order('requested_at', { ascending: true, nullsFirst: false });

    // Resolve property addresses (best-effort) via hap contract
    const list = (data || []) as any[];
    const hapIds = list.map(r => r.hap_contract_id).filter(Boolean);
    let hapMap = new Map<string, string>();
    if (hapIds.length) {
      const { data: haps } = await supabase
        .from('agency_hap_contracts')
        .select('id, property_address')
        .in('id', hapIds);
      (haps || []).forEach((h: any) => hapMap.set(h.id, h.property_address || ''));
    }
    setRows(list.map(r => ({ ...r, property_address: r.hap_contract_id ? hapMap.get(r.hap_contract_id) : null })));
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const runBatch = async () => {
    setBatchRunning(true);
    const { data, error } = await supabase.functions.invoke('auto-assign-inspections', {
      body: { agencyId, batch: true },
    });
    setBatchRunning(false);
    if (error || !data?.success) {
      toast.error(data?.error || 'Auto-assign failed');
      return;
    }
    const a = data.assigned?.length || 0;
    const s = data.skipped?.length || 0;
    toast.success(`Auto-assigned ${a} · skipped ${s}`);
    fetchRows();
  };

  const autoAssignOne = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('auto-assign-inspections', {
      body: { inspectionId: id },
    });
    if (error || !data?.success) { toast.error(data?.error || 'Failed'); return; }
    if (data.assigned?.length) toast.success(`Assigned to ${data.assigned[0].inspector_name}`);
    else toast.error(data.skipped?.[0]?.reason || 'No eligible inspector');
    fetchRows();
  };

  const extractZipFromAddr = (addr?: string | null): string | null => {
    if (!addr) return null;
    const m = addr.match(/\b(\d{5})(?:-\d{4})?\b/);
    return m ? m[1] : null;
  };

  const urgencyBadge = (u: string | null) => {
    if (!u) return null;
    const variant = u === 'high' ? 'destructive' : u === 'medium' ? 'warning' : 'secondary';
    return <Badge variant={variant as any} className="text-xs">{u}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4" /> Unassigned Queue ({rows.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={runBatch} disabled={batchRunning || !rows.length}>
              {batchRunning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Auto-assign all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nothing in the unassigned queue. Nice work.
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Property / ZIP</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const created = r.requested_at || r.scheduled_date;
                  const zip = extractZipFromAddr(r.property_address);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{created ? format(parseISO(created), 'MMM d') : '—'}</TableCell>
                      <TableCell className="text-sm capitalize">{r.inspection_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm">
                        {r.property_address ? (
                          <div>
                            <div className="truncate max-w-[200px]">{r.property_address}</div>
                            {zip && <span className="text-xs text-muted-foreground">ZIP {zip}</span>}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-1">
                          {urgencyBadge(r.urgency)}
                          {r.decline_reason && (
                            <div className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Declined: {r.decline_reason}
                            </div>
                          )}
                          {r.request_reason && <span className="text-muted-foreground line-clamp-1">{r.request_reason}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {created ? formatDistanceToNow(parseISO(created), { addSuffix: false }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => autoAssignOne(r.id)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Auto
                          </Button>
                          <Button size="sm" onClick={() => setAssignTarget({ id: r.id, zip })}>
                            <UserPlus className="h-3 w-3 mr-1" /> Assign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {assignTarget && (
        <AssignInspectorDialog
          open={!!assignTarget}
          onOpenChange={(o) => { if (!o) setAssignTarget(null); }}
          agencyId={agencyId}
          inspectionId={assignTarget.id}
          propertyZip={assignTarget.zip}
          onAssigned={fetchRows}
        />
      )}
    </Card>
  );
};

export default UnassignedInspectionsQueue;
