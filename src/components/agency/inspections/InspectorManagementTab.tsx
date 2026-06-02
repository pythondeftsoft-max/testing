import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, MapPin, Shuffle, Loader2, Inbox, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInspectionOversight } from '@/hooks/useInspectionOversight';
import InspectorRosterTable from './InspectorRosterTable';
import UnassignedInspectionsQueue from './UnassignedInspectionsQueue';
import AssignmentSettingsCard from './AssignmentSettingsCard';

interface Props {
  agencyId: string;
}

interface InspectorRow {
  id: string;
  full_name: string;
  territory_zips: string[] | null;
}

const InspectorManagementTab: React.FC<Props> = ({ agencyId }) => {
  const { roster, loading: oversightLoading } = useInspectionOversight(agencyId);
  const [inspectors, setInspectors] = useState<InspectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [territoryEditor, setTerritoryEditor] = useState<InspectorRow | null>(null);
  const [zipDraft, setZipDraft] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [fromInspector, setFromInspector] = useState('');
  const [toInspector, setToInspector] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInspectors = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agency_staff')
      .select('id, territory_zips, profiles!agency_staff_user_id_fkey(full_name)')
      .eq('agency_id', agencyId)
      .eq('role', 'inspector')
      .eq('is_active', true);
    const rows: InspectorRow[] = ((data as any[]) || []).map(r => ({
      id: r.id,
      full_name: r.profiles?.full_name || 'Unknown',
      territory_zips: r.territory_zips || null,
    }));
    setInspectors(rows);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchInspectors(); }, [fetchInspectors]);

  const openTerritory = (insp: InspectorRow) => {
    setTerritoryEditor(insp);
    setZipDraft((insp.territory_zips || []).join(', '));
  };

  const saveTerritory = async () => {
    if (!territoryEditor) return;
    const zips = zipDraft
      .split(',')
      .map(z => z.trim())
      .filter(z => /^\d{5}$/.test(z));
    setSubmitting(true);
    const { error } = await supabase
      .from('agency_staff')
      .update({ territory_zips: zips.length ? zips : null })
      .eq('id', territoryEditor.id);
    setSubmitting(false);
    if (error) { toast.error('Failed to save territory'); return; }
    toast.success(`Territory updated (${zips.length} ZIP${zips.length === 1 ? '' : 's'})`);
    setTerritoryEditor(null);
    fetchInspectors();
  };

  const handleReassign = async () => {
    if (!fromInspector || !toInspector || fromInspector === toInspector) {
      toast.error('Select two different inspectors'); return;
    }
    setSubmitting(true);
    const { error, count } = await supabase
      .from('inspections')
      .update({ inspector_id: toInspector }, { count: 'exact' })
      .eq('agency_id', agencyId)
      .eq('inspector_id', fromInspector)
      .in('status', ['scheduled', 'in_progress']);
    setSubmitting(false);
    if (error) { toast.error('Reassignment failed'); return; }
    toast.success(`Reassigned ${count ?? 0} open inspection${count === 1 ? '' : 's'}`);
    setReassignOpen(false);
    setFromInspector('');
    setToInspector('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Inspector Management
          </h2>
          <p className="text-sm text-muted-foreground">Queue, workload, territories, and assignment automation.</p>
        </div>
        <Button onClick={() => setReassignOpen(true)}>
          <Shuffle className="h-3.5 w-3.5 mr-1" /> Reassign Workload
        </Button>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="queue"><Inbox className="w-3.5 h-3.5 mr-1" /> Unassigned Queue</TabsTrigger>
          <TabsTrigger value="roster"><Users className="w-3.5 h-3.5 mr-1" /> Roster & Workload</TabsTrigger>
          <TabsTrigger value="territories"><MapPin className="w-3.5 h-3.5 mr-1" /> Territories</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="w-3.5 h-3.5 mr-1" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <UnassignedInspectionsQueue agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="roster">
          <InspectorRosterTable roster={roster} loading={oversightLoading} agencyId={agencyId} />
        </TabsContent>

        <TabsContent value="territories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Territories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : inspectors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No active inspectors.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inspector</TableHead>
                      <TableHead>ZIP territory</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspectors.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.full_name}</TableCell>
                        <TableCell>
                          {i.territory_zips && i.territory_zips.length ? (
                            <div className="flex flex-wrap gap-1">
                              {i.territory_zips.map(z => <Badge key={z} variant="secondary">{z}</Badge>)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No territory set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openTerritory(i)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <AssignmentSettingsCard agencyId={agencyId} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!territoryEditor} onOpenChange={(o) => { if (!o) setTerritoryEditor(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit territory · {territoryEditor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>ZIP codes (comma-separated, 5 digits each)</Label>
            <Input value={zipDraft} onChange={e => setZipDraft(e.target.value)} placeholder="10001, 10002, 10003" />
            <p className="text-xs text-muted-foreground">Non-numeric or invalid ZIPs will be discarded on save.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerritoryEditor(null)}>Cancel</Button>
            <Button onClick={saveTerritory} disabled={submitting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign open inspections</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Moves all <strong>scheduled</strong> and <strong>in-progress</strong> inspections from one inspector to another.</p>
            <div>
              <Label>From</Label>
              <Select value={fromInspector} onValueChange={setFromInspector}>
                <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
                <SelectContent>
                  {inspectors.map(i => <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toInspector} onValueChange={setToInspector}>
                <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
                <SelectContent>
                  {inspectors.filter(i => i.id !== fromInspector).map(i => <SelectItem key={i.id} value={i.id}>{i.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={submitting}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectorManagementTab;
