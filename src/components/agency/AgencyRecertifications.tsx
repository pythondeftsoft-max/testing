import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefreshCw, AlertTriangle, Clock, FileCheck, CheckCircle2, Plus, Zap, Workflow } from 'lucide-react';
import { useAgencyRecertifications } from '@/hooks/useAgencyRecertifications';
import { differenceInDays, parseISO, addYears, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RecipientPicker from '@/components/agency/RecipientPicker';
import RecertificationWorkflowPanel from './RecertificationWorkflowPanel';
import ProgramFilter, { HousingProgramType } from './ProgramFilter';
import { useEnabledPrograms } from '@/hooks/useEnabledPrograms';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  canManage: boolean;
  userRole?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "warning" | "success" | "destructive" }> = {
  upcoming: { label: 'Upcoming', variant: 'secondary' },
  documents_requested: { label: 'Docs Requested', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
};

const workflowStepBadge: Record<string, string> = {
  initiated: '🔵 Initiated',
  notice_sent: '📨 Notice Sent',
  docs_requested: '📄 Docs Requested',
  under_review: '🔍 Under Review',
  supervisor_review: '🛡 Supervisor Review',
  completed: '✅ Completed',
  voucher_reissued: '🏆 Voucher Reissued',
};

const dueDateBadge = (dueDate: string) => {
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return <Badge variant="destructive">Overdue ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge variant="destructive">{days}d left</Badge>;
  if (days <= 60) return <Badge variant="warning">{days}d left</Badge>;
  if (days <= 90) return <Badge variant="secondary">{days}d left</Badge>;
  return <span className="text-sm text-muted-foreground">{days}d left</span>;
};

const AgencyRecertifications: React.FC<Props> = ({ agencyId, canManage, userRole }) => {
  const { recertifications, loading, updateStatus, create, refetch, advanceWorkflow } = useAgencyRecertifications(agencyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [newType, setNewType] = useState('annual');
  const [newDueDate, setNewDueDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [workflowRecertId, setWorkflowRecertId] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<HousingProgramType>('all');
  const { data: enabledPrograms } = useEnabledPrograms(agencyId);

  const isSupervisor = userRole === 'agency_admin' || userRole === 'executive_director';

  const visibleRecerts = programFilter === 'all'
    ? recertifications
    : recertifications.filter(r => (r as any).program_type === programFilter);

  const counts = {
    upcoming: recertifications.filter(r => r.status === 'upcoming').length,
    documents_requested: recertifications.filter(r => r.status === 'documents_requested').length,
    under_review: recertifications.filter(r => r.status === 'under_review').length,
    completed: recertifications.filter(r => r.status === 'completed').length,
    overdue: recertifications.filter(r => r.status === 'overdue').length,
  };

  const handleCreate = async () => {
    if (!newTenantId || !newDueDate) return;
    await create(newTenantId, newType, newDueDate);
    setDialogOpen(false);
    setNewTenantId('');
    setNewDueDate('');
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const bulkRequestDocs = async () => {
    for (const id of selectedIds) {
      const r = recertifications.find(r => r.id === id);
      if (r && r.status === 'upcoming') {
        await updateStatus(id, 'documents_requested');
      }
    }
    setSelectedIds(new Set());
  };

  const autoGenerateRecerts = async () => {
    setGenerating(true);
    try {
      const { data: leases, error: leaseErr } = await supabase
        .from('tenant_leases')
        .select('tenant_id, lease_start, last_recert_generated')
        .eq('agency_id', agencyId)
        .eq('status', 'active' as any) as any;

      if (leaseErr) throw leaseErr;
      if (!leases?.length) {
        toast.info('No active leases found');
        setGenerating(false);
        return;
      }

      const existingTenantIds = new Set(
        recertifications
          .filter(r => r.status !== 'completed')
          .map(r => r.tenant_id)
      );

      const today = new Date();
      let created = 0;

      for (const lease of leases) {
        if (existingTenantIds.has(lease.tenant_id)) continue;
        const leaseStart = parseISO(lease.lease_start);
        let nextAnniversary = leaseStart;
        while (nextAnniversary <= today) {
          nextAnniversary = addYears(nextAnniversary, 1);
        }
        const daysUntil = differenceInDays(nextAnniversary, today);
        if (daysUntil <= 90) {
          const { error } = await supabase.from('agency_recertifications').insert({
            agency_id: agencyId,
            tenant_id: lease.tenant_id,
            type: 'annual' as any,
            due_date: format(nextAnniversary, 'yyyy-MM-dd'),
          } as any);
          if (!error) created++;
        }
      }

      if (created > 0) {
        toast.success(`Generated ${created} upcoming recertification(s)`);
        refetch();
      } else {
        toast.info('No new recertifications needed');
      }
    } catch (err: any) {
      toast.error('Failed to auto-generate: ' + (err.message || 'Unknown error'));
    }
    setGenerating(false);
  };

  const workflowRecert = recertifications.find(r => r.id === workflowRecertId);

  return (
    <div className="space-y-4">
      {/* Workflow Panel */}
      {workflowRecert && (
        <RecertificationWorkflowPanel
          recertId={workflowRecert.id}
          currentStep={workflowRecert.workflow_step || 'initiated'}
          workflowHistory={Array.isArray(workflowRecert.workflow_history) ? workflowRecert.workflow_history : []}
          canManage={canManage}
          isSupervisor={isSupervisor}
          onAdvance={async (id, step, note) => {
            await advanceWorkflow(id, step, note);
          }}
          onClose={() => setWorkflowRecertId(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
          {[
            { key: 'upcoming', icon: Clock, label: 'Upcoming' },
            { key: 'documents_requested', icon: FileCheck, label: 'Docs Requested' },
            { key: 'under_review', icon: RefreshCw, label: 'Under Review' },
            { key: 'completed', icon: CheckCircle2, label: 'Completed' },
            { key: 'overdue', icon: AlertTriangle, label: 'Overdue' },
          ].map(({ key, icon: Icon, label }) => (
            <Card key={key}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {canManage && (
          <>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Schedule Recert</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Recertification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <RecipientPicker
                      value={newTenantId || null}
                      onChange={(r) => setNewTenantId(r?.id || '')}
                      placeholder="Search tenant by name or email..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="interim">Interim</SelectItem>
                        <SelectItem value="biennial">Biennial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
                  </div>
                  <Button onClick={handleCreate} disabled={!newTenantId || !newDueDate} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={autoGenerateRecerts} disabled={generating}>
              <Zap className="w-4 h-4 mr-1" />
              {generating ? 'Generating...' : 'Auto-Generate Recerts'}
            </Button>
          </>
        )}
        {selectedIds.size > 0 && (
          <Button size="sm" variant="outline" onClick={bulkRequestDocs}>
            Request Docs ({selectedIds.size})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Recertifications ({visibleRecerts.length})</CardTitle>
            <ProgramFilter value={programFilter} onChange={setProgramFilter} enabledPrograms={enabledPrograms} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManage && <TableHead className="w-8"></TableHead>}
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workflow</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecerts.length ? visibleRecerts.map(r => (
                    <TableRow key={r.id}>
                      {canManage && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="rounded"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{r.tenant_id.slice(0, 8)}...</TableCell>
                      <TableCell className="capitalize text-sm">{r.type}</TableCell>
                      <TableCell className="text-sm">{new Date(r.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>{dueDateBadge(r.due_date)}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[r.status]?.variant || 'secondary'}>
                          {statusConfig[r.status]?.label || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setWorkflowRecertId(r.id === workflowRecertId ? null : r.id)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          <Workflow className="h-3.5 w-3.5" />
                          <span>{workflowStepBadge[r.workflow_step] || r.workflow_step}</span>
                        </button>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === 'upcoming' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'documents_requested')}>
                                Request Docs
                              </Button>
                            )}
                            {r.status === 'documents_requested' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'under_review')}>
                                Review
                              </Button>
                            )}
                            {r.status === 'under_review' && isSupervisor && (
                              <Button size="sm" variant="default" onClick={() => updateStatus(r.id, 'completed')}>
                                Complete
                              </Button>
                            )}
                            {r.status === 'under_review' && !isSupervisor && (
                              <span className="text-xs text-muted-foreground">Awaiting supervisor</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 8 : 6} className="text-center py-8 text-muted-foreground">
                        No recertifications found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyRecertifications;
