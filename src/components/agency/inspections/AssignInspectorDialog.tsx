import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { scoreCandidates, extractZip, type InspectorCandidate, type ScoredCandidate } from '@/utils/inspectionAssignment';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agencyId: string;
  inspectionId: string;
  propertyZip?: string | null;
  onAssigned?: () => void;
}

const AssignInspectorDialog: React.FC<Props> = ({ open, onOpenChange, agencyId, inspectionId, propertyZip, onAssigned }) => {
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'territory_workload_roundrobin' | 'workload_only' | 'roundrobin_only'>('territory_workload_roundrobin');

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);

      const { data: settings } = await supabase
        .from('agency_operational_settings')
        .select('inspection_assignment_strategy')
        .eq('agency_id', agencyId)
        .maybeSingle();
      const strat = (settings?.inspection_assignment_strategy || 'territory_workload_roundrobin') as any;
      setStrategy(strat);

      const { data: staff } = await supabase
        .from('agency_staff')
        .select('id, user_id, territory_zips, profiles!agency_staff_user_id_fkey(full_name)')
        .eq('agency_id', agencyId)
        .eq('role', 'inspector')
        .eq('is_active', true);

      const inspectorIds = (staff || []).map((s: any) => s.id);
      const userIds = (staff || []).map((s: any) => s.user_id);
      const { data: openInsp } = await supabase
        .from('inspections')
        .select('inspector_id, status')
        .eq('agency_id', agencyId)
        .in('inspector_id', userIds)
        .in('status', ['scheduled', 'in_progress']);

      const byUser = new Map<string, { scheduled: number; in_progress: number }>();
      (openInsp || []).forEach((r: any) => {
        const cur = byUser.get(r.inspector_id) || { scheduled: 0, in_progress: 0 };
        if (r.status === 'scheduled') cur.scheduled++;
        else cur.in_progress++;
        byUser.set(r.inspector_id, cur);
      });

      // Recent declines per inspector (last 30 days)
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: declines } = await supabase
        .from('inspections')
        .select('declined_by')
        .eq('agency_id', agencyId)
        .gte('declined_at', cutoff)
        .not('declined_by', 'is', null);
      const declineByUser = new Map<string, number>();
      (declines || []).forEach((d: any) => {
        declineByUser.set(d.declined_by, (declineByUser.get(d.declined_by) || 0) + 1);
      });

      const cands: InspectorCandidate[] = (staff || []).map((s: any) => {
        const w = byUser.get(s.user_id) || { scheduled: 0, in_progress: 0 };
        return {
          id: s.id,
          user_id: s.user_id,
          full_name: s.profiles?.full_name || 'Inspector',
          territory_zips: s.territory_zips,
          scheduled_count: w.scheduled,
          in_progress_count: w.in_progress,
          recent_decline_count: declineByUser.get(s.user_id) || 0,
          out_of_office: false,
        };
      });

      const scored = scoreCandidates(cands, { property_zip: propertyZip || null }, strat);
      setCandidates(scored);
      setLoading(false);
    })();
  }, [open, agencyId, propertyZip]);

  const assign = async (userId: string, mode: 'manual' | 'auto') => {
    setAssigning(userId);
    const { error } = await supabase
      .from('inspections')
      .update({ inspector_id: userId, status: 'scheduled', assignment_mode: mode } as any)
      .eq('id', inspectionId);
    setAssigning(null);
    if (error) { toast.error('Assignment failed'); return; }
    toast.success(mode === 'auto' ? 'Auto-assigned' : 'Inspector assigned');

    await supabase.from('auto_assignment_logs').insert({
      entity_type: 'inspection',
      entity_id: inspectionId,
      assigned_to: userId,
      agency_id: agencyId,
      strategy: mode === 'auto' ? strategy : 'manual',
      reason: mode === 'manual' ? 'Manually assigned by supervisor' : `Auto-assigned (${strategy})`,
    } as any);

    onAssigned?.();
    onOpenChange(false);
  };

  const autoAssign = async () => {
    const top = candidates[0];
    if (!top) { toast.error('No eligible inspectors'); return; }
    await assign(top.user_id, 'auto');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Inspector</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No eligible inspectors.</div>
          ) : (
            candidates.map((c, idx) => (
              <Card key={c.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.full_name}</span>
                    {idx === 0 && <Badge variant="default" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> Best fit</Badge>}
                    {c.territory_match && <Badge variant="secondary" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Territory match</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Workload: {c.workload} open · Score: {c.score}
                    {c.recent_decline_count > 0 && ` · ${c.recent_decline_count} recent decline${c.recent_decline_count === 1 ? '' : 's'}`}
                  </div>
                </div>
                <Button size="sm" onClick={() => assign(c.user_id, 'manual')} disabled={!!assigning}>
                  {assigning === c.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                </Button>
              </Card>
            ))
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={autoAssign} disabled={loading || !candidates.length || !!assigning}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Auto-assign best fit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignInspectorDialog;
export { extractZip };
