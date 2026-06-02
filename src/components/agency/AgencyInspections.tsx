import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, Plus, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import InspectionDetail from './InspectionDetail';
import ScheduleInspectionDialog from './ScheduleInspectionDialog';
import InspectionScheduleRules from './inspections/InspectionScheduleRules';
import HudFormButton from './hud-pdfs/HudFormButton';
import { supabase } from '@/integrations/supabase/client';

interface Inspection {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  property_id: string | null;
  inspector_id: string | null;
}

interface AgencyInspectionsProps {
  inspections: Inspection[];
  loading: boolean;
  canManage: boolean;
  agencyId: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRefresh: () => void;
}

const statusVariant = (s: string): "default" | "warning" | "success" | "destructive" | "secondary" => {
  switch (s) {
    case 'scheduled': return 'warning';
    case 'in_progress': return 'default';
    case 'completed': return 'success';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

const resultVariant = (r: string | null): "success" | "destructive" | "warning" | "secondary" => {
  switch (r) {
    case 'pass': return 'success';
    case 'fail': return 'destructive';
    case 'conditional': return 'warning';
    default: return 'secondary';
  }
};

const AgencyInspections: React.FC<AgencyInspectionsProps> = ({ inspections, loading, canManage, agencyId, onUpdate, onRefresh }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [overdueDeficiencies, setOverdueDeficiencies] = useState(0);

  // Fetch overdue deficiency count
  useEffect(() => {
    if (!agencyId) return;
    const fetchOverdue = async () => {
      const inspectionIds = inspections.map(i => i.id);
      if (!inspectionIds.length) return;
      const { count } = await supabase
        .from('hqs_inspection_items')
        .select('id', { count: 'exact', head: true })
        .in('inspection_id', inspectionIds)
        .eq('passed', false)
        .lt('follow_up_date', new Date().toISOString())
        .not('follow_up_date', 'is', null);
      setOverdueDeficiencies(count || 0);
    };
    fetchOverdue();
  }, [agencyId, inspections]);

  // Pipeline counts
  const scheduled = inspections.filter(i => i.status === 'scheduled').length;
  const inProgress = inspections.filter(i => i.status === 'in_progress').length;
  const passed = inspections.filter(i => i.status === 'completed' && i.result === 'pass').length;
  const failed = inspections.filter(i => i.status === 'completed' && i.result === 'fail').length;
  const failedInspections = inspections.filter(i => i.status === 'completed' && i.result === 'fail');

  if (selectedId) {
    return (
      <InspectionDetail
        inspectionId={selectedId}
        onBack={() => { setSelectedId(null); onRefresh(); }}
        canManage={canManage}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Inspections ({inspections.length})
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setScheduleOpen(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Schedule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Pipeline Summary */}
          {!loading && inspections.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-lg font-bold">{scheduled}</p><p className="text-xs text-muted-foreground">Scheduled</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <div><p className="text-lg font-bold">{inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <div><p className="text-lg font-bold text-primary">{passed}</p><p className="text-xs text-muted-foreground">Passed</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <XCircle className="h-4 w-4 text-destructive" />
                <div><p className="text-lg font-bold text-destructive">{failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
              </div>
            </div>
          )}

          {/* Overdue Deficiency Alert */}
          {overdueDeficiencies > 0 && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-sm font-medium text-destructive">{overdueDeficiencies} overdue deficiency follow-up{overdueDeficiencies > 1 ? 's' : ''} require attention</span>
            </div>
          )}

          {/* Failed Needing Re-inspection */}
          {failedInspections.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="text-xs font-semibold text-destructive mb-2">Failed — Needs Re-Inspection ({failedInspections.length})</p>
              <div className="space-y-1">
                {failedInspections.slice(0, 5).map(fi => (
                  <button key={fi.id} onClick={() => setSelectedId(fi.id)} className="text-xs text-muted-foreground hover:text-foreground flex gap-2 items-center">
                    <span className="font-mono">{fi.id.slice(0, 8)}...</span>
                    <span>{fi.scheduled_date ? new Date(fi.scheduled_date).toLocaleDateString() : '—'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Notes</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.length ? inspections.map(i => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedId(i.id)}>
                      <TableCell className="font-mono text-xs">{i.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm">{i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        {i.result ? <Badge variant={resultVariant(i.result)}>{i.result}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{i.notes || '—'}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <HudFormButton formNumber="52580" entityId={i.id} agencyName="Housing Authority" variant="ghost" />
                            {i.status === 'scheduled' && (
                              <Button size="sm" variant="outline" onClick={() => onUpdate(i.id, { status: 'in_progress' })}>
                                Start
                              </Button>
                            )}
                            {i.status === 'in_progress' && (
                              <>
                                <Button size="sm" variant="default" onClick={() => onUpdate(i.id, { status: 'completed', result: 'pass', completed_date: new Date().toISOString() })}>
                                  Pass
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => onUpdate(i.id, { status: 'completed', result: 'fail', completed_date: new Date().toISOString() })}>
                                  Fail
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No inspections found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && <InspectionScheduleRules agencyId={agencyId} canManage={canManage} />}

      <ScheduleInspectionDialog open={scheduleOpen} onOpenChange={setScheduleOpen} agencyId={agencyId} onCreated={onRefresh} />
    </>
  );
};

export default AgencyInspections;
