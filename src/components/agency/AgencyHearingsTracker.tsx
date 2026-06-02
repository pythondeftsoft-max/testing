import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import NewHearingDialog from './NewHearingDialog';
import { EmptyState } from '@/components/shared/EmptyState';

interface Hearing {
  id: string;
  agency_id: string;
  tenant_id: string;
  voucher_id: string | null;
  hearing_type: string;
  status: string;
  requested_at: string;
  scheduled_at: string | null;
  hearing_officer: string | null;
  decision: string | null;
  decision_date: string | null;
  decision_notes: string | null;
  notes: string | null;
}

const statusColor = (s: string): "default" | "warning" | "secondary" | "success" | "destructive" => {
  switch (s) {
    case 'requested': return 'warning';
    case 'scheduled': return 'default';
    case 'held': return 'secondary';
    case 'decision_issued': return 'success';
    case 'withdrawn': return 'destructive';
    default: return 'default';
  }
};

const decisionColor = (d: string | null): "success" | "destructive" | "warning" | "default" => {
  switch (d) {
    case 'upheld': return 'success';
    case 'overturned': return 'destructive';
    case 'modified': return 'warning';
    default: return 'default';
  }
};

interface Props {
  agencyId: string;
  canManage: boolean;
}

const AgencyHearingsTracker: React.FC<Props> = ({ agencyId, canManage }) => {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('agency_hearings').select('*').eq('agency_id', agencyId).order('requested_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) toast.error('Failed to load hearings');
    setHearings((data as unknown as Hearing[]) || []);
    setLoading(false);
  }, [agencyId, filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'scheduled') updates.scheduled_at = new Date().toISOString();
    const { error } = await supabase.from('agency_hearings').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Hearing ${status.replace('_', ' ')}`);
    fetch();
  };

  const recordDecision = async (id: string, decision: string) => {
    const { error } = await supabase.from('agency_hearings').update({
      status: 'decision_issued',
      decision,
      decision_date: new Date().toISOString().split('T')[0],
    } as any).eq('id', id);
    if (error) { toast.error('Failed to record decision'); return; }
    toast.success('Decision recorded');
    fetch();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4" /> Hearings ({hearings.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="decision_issued">Decision Issued</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> New Hearing
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : hearings.length === 0 ? (
            <EmptyState
              bare
              icon={Gavel}
              title="No hearings on record"
              description="Schedule informal hearings for terminations, rent disputes, or grievances. All decisions are tracked here for HUD audit compliance."
              primaryAction={canManage ? { label: 'Schedule a hearing', onClick: () => setDialogOpen(true) } : undefined}
            />
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Decision</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hearings.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-mono text-xs">{h.tenant_id.slice(0, 8)}…</TableCell>
                      <TableCell className="capitalize">{h.hearing_type.replace('_', ' ')}</TableCell>
                      <TableCell><Badge variant={statusColor(h.status)}>{h.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(h.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{h.scheduled_at ? new Date(h.scheduled_at).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        {h.decision ? (
                          <Badge variant={decisionColor(h.decision)}>{h.decision}</Badge>
                        ) : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {h.status === 'requested' && (
                              <>
                                <Button size="sm" variant="default" onClick={() => updateStatus(h.id, 'scheduled')}>Schedule</Button>
                                <Button size="sm" variant="secondary" onClick={() => updateStatus(h.id, 'withdrawn')}>Withdraw</Button>
                              </>
                            )}
                            {h.status === 'scheduled' && (
                              <Button size="sm" variant="default" onClick={() => updateStatus(h.id, 'held')}>Mark Held</Button>
                            )}
                            {h.status === 'held' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="default" onClick={() => recordDecision(h.id, 'upheld')}>Upheld</Button>
                                <Button size="sm" variant="destructive" onClick={() => recordDecision(h.id, 'overturned')}>Overturned</Button>
                                <Button size="sm" variant="secondary" onClick={() => recordDecision(h.id, 'modified')}>Modified</Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <NewHearingDialog open={dialogOpen} onOpenChange={setDialogOpen} agencyId={agencyId} onCreated={fetch} />
    </>
  );
};

export default AgencyHearingsTracker;
