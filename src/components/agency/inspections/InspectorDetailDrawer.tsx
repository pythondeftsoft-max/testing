import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Calendar, History, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InspectorRosterRow } from '@/hooks/useInspectionOversight';

interface Props {
  inspector: InspectorRosterRow;
  agencyId: string;
  allInspectors: InspectorRosterRow[];
  open: boolean;
  onClose: () => void;
}

const InspectorDetailDrawer: React.FC<Props> = ({ inspector, agencyId, allInspectors, open, onClose }) => {
  const [inspections, setInspections] = useState<any[]>([]);
  const [defs, setDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [insRes, defRes] = await Promise.all([
        supabase.from('inspections')
          .select('id, scheduled_date, completed_date, status, result, unit_id, property_id')
          .eq('agency_id', agencyId).eq('inspector_id', inspector.inspector_id)
          .order('scheduled_date', { ascending: false }).limit(200),
        (supabase.from('agency_inspection_deficiencies' as any)
          .select('inspection_id, nspire_code, severity')
          .eq('agency_id', agencyId)) as any,
      ]);
      setInspections(insRes.data || []);
      setDefs(defRes.data || []);
      setLoading(false);
    };
    if (open) fetch();
  }, [open, inspector.inspector_id, agencyId]);

  const upcoming = inspections.filter(i =>
    i.status === 'scheduled' && i.scheduled_date && new Date(i.scheduled_date) >= new Date()
  ).slice(0, 30);

  const history = inspections.filter(i => i.status === 'completed' || i.status === 'cancelled');

  // Trend last 6 months
  const trendData = (() => {
    const data: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const month = inspections.filter(x =>
        x.completed_date && new Date(x.completed_date) >= start && new Date(x.completed_date) < end
      );
      data.push({
        month: start.toLocaleDateString(undefined, { month: 'short' }),
        completed: month.length,
        passed: month.filter(x => x.result === 'pass').length,
      });
    }
    return data;
  })();

  // Deficiency patterns for this inspector
  const myInsIds = new Set(inspections.map(i => i.id));
  const myDefs = defs.filter(d => myInsIds.has(d.inspection_id));
  const codeMap = new Map<string, number>();
  myDefs.forEach(d => { if (d.nspire_code) codeMap.set(d.nspire_code, (codeMap.get(d.nspire_code) || 0) + 1); });
  const topCodes = Array.from(codeMap.entries()).map(([c, n]) => ({ code: c, count: n })).sort((a, b) => b.count - a.count).slice(0, 8);

  const handleReassign = async () => {
    if (!reassignTarget) return;
    const openIds = inspections.filter(i => i.status === 'scheduled' || i.status === 'in_progress').map(i => i.id);
    if (!openIds.length) { toast.info('No open inspections to reassign.'); return; }
    setReassigning(true);
    const { error } = await supabase.from('inspections')
      .update({ inspector_id: reassignTarget } as any)
      .in('id', openIds);
    if (error) toast.error('Failed to reassign');
    else toast.success(`Reassigned ${openIds.length} inspection${openIds.length > 1 ? 's' : ''}`);
    setReassigning(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{inspector.inspector_name}</SheetTitle>
          <SheetDescription>
            {inspector.total_completed} total completed · {inspector.pass_rate}% pass rate · {inspector.overdue} overdue
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="schedule" className="mt-4">
            <TabsList>
              <TabsTrigger value="schedule"><Calendar className="h-3.5 w-3.5 mr-1" /> Schedule</TabsTrigger>
              <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> History</TabsTrigger>
              <TabsTrigger value="performance"><TrendingUp className="h-3.5 w-3.5 mr-1" /> Performance</TabsTrigger>
              <TabsTrigger value="reassign"><ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Reassign</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-2 mt-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No upcoming inspections.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {upcoming.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm">{i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Badge variant="warning">{i.status.replace('_', ' ')}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No history yet.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {history.slice(0, 50).map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-sm">{i.completed_date ? new Date(i.completed_date).toLocaleDateString() : (i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString() : '—')}</TableCell>
                        <TableCell><Badge variant="secondary">{i.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>{i.result ? <Badge variant={i.result === 'pass' ? 'success' : 'destructive'}>{i.result}</Badge> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-3 mt-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Last 6 Months</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line dataKey="completed" stroke="hsl(var(--primary))" />
                      <Line dataKey="passed" stroke="hsl(var(--success))" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Most-Cited NSPIRE Codes</CardTitle></CardHeader>
                <CardContent>
                  {topCodes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deficiencies recorded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topCodes.map(c => (
                        <div key={c.code} className="flex justify-between p-2 rounded bg-muted/40 text-sm">
                          <span className="font-mono">{c.code}</span>
                          <Badge variant="secondary">{c.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reassign" className="space-y-3 mt-3">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm">
                    Move all open inspections ({inspections.filter(i => i.status === 'scheduled' || i.status === 'in_progress').length}) from{' '}
                    <strong>{inspector.inspector_name}</strong> to:
                  </p>
                  <Select value={reassignTarget} onValueChange={setReassignTarget}>
                    <SelectTrigger><SelectValue placeholder="Select inspector…" /></SelectTrigger>
                    <SelectContent>
                      {allInspectors.filter(i => i.inspector_id !== inspector.inspector_id).map(i => (
                        <SelectItem key={i.inspector_id} value={i.inspector_id}>{i.inspector_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleReassign} disabled={!reassignTarget || reassigning} className="w-full">
                    {reassigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Reassign Open Inspections
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default InspectorDetailDrawer;
