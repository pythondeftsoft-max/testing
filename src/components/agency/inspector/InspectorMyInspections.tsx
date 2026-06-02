import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ListChecks, CalendarDays, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MyInspection } from '@/hooks/useInspectorMyWork';
import DeclineInspectionDialog from '@/components/agency/inspections/DeclineInspectionDialog';

interface Props {
  inspections: MyInspection[];
  onRefresh: () => void;
}

const InspectorMyInspections: React.FC<Props> = ({ inspections, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<{ id: string; userId: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || ''));
  }, []);

  const filtered = useMemo(() => {
    return inspections.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const haystack = `${i.property_id || ''} ${i.unit_id || ''} ${i.notes || ''}`.toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [inspections, statusFilter, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const handleBulkReschedule = async () => {
    if (!bulkDate || !bulkReason) { toast.error('Date and reason required'); return; }
    setSubmitting(true);
    const { error } = await supabase
      .from('inspections')
      .update({ scheduled_date: bulkDate, status: 'scheduled', reschedule_reason: bulkReason })
      .in('id', Array.from(selected));
    setSubmitting(false);
    if (error) { toast.error('Bulk reschedule failed'); return; }
    toast.success(`Rescheduled ${selected.size} inspection${selected.size === 1 ? '' : 's'}`);
    setSelected(new Set());
    setBulkOpen(false);
    setBulkDate('');
    setBulkReason('');
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> My Inspections ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Input placeholder="Search property/unit/notes" value={search} onChange={e => setSearch(e.target.value)} className="h-8 w-56" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <CalendarDays className="h-3 w-3 mr-1" /> Reschedule {selected.size}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inspections match.</TableCell></TableRow>
              ) : filtered.map(i => (
                <TableRow key={i.id}>
                  <TableCell><Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggle(i.id)} /></TableCell>
                  <TableCell className="text-sm">{i.scheduled_date ? format(parseISO(i.scheduled_date), 'MMM d, yyyy h:mm a') : '—'}</TableCell>
                  <TableCell className="text-sm">
                    <div>{i.property_id ? `Property ${i.property_id.slice(0, 8)}…` : '—'}</div>
                    {i.unit_id && <div className="text-xs text-muted-foreground">Unit {i.unit_id.slice(0, 8)}…</div>}
                  </TableCell>
                  <TableCell><Badge variant={i.status === 'completed' ? 'success' : i.status === 'in_progress' ? 'default' : 'secondary'}>{i.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>{i.result ? <Badge variant={i.result === 'pass' ? 'success' : i.result === 'fail' ? 'destructive' : 'warning'}>{i.result}</Badge> : '—'}</TableCell>
                  <TableCell className="text-sm">{i.completed_date ? format(parseISO(i.completed_date), 'MMM d') : '—'}</TableCell>
                  <TableCell>
                    {(i.status === 'scheduled' || i.status === 'in_progress') && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeclineTarget({ id: i.id, userId: currentUserId })} title="Decline">
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk reschedule {selected.size} inspection{selected.size === 1 ? '' : 's'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>New scheduled date</Label>
              <Input type="datetime-local" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Input placeholder="e.g. inspector unavailable" value={bulkReason} onChange={e => setBulkReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReschedule} disabled={submitting}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {declineTarget && (
        <DeclineInspectionDialog
          open={!!declineTarget}
          onOpenChange={(o) => { if (!o) setDeclineTarget(null); }}
          inspectionId={declineTarget.id}
          inspectorUserId={declineTarget.userId}
          onDeclined={onRefresh}
        />
      )}
    </Card>
  );
};

export default InspectorMyInspections;
