import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarClock, Plus, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  canManage: boolean;
}

interface Rule {
  id: string;
  rule_name: string;
  inspection_type: string;
  cycle_months: number;
  schedule_days_before: number;
  notify_landlord_days_before: number;
  notify_tenant_days_before: number;
  is_active: boolean;
  last_run_at: string | null;
}

const TYPES = ['initial', 'annual', 'special', 'reinspection', 'quality_control', 'move_in', 'move_out'];

const InspectionScheduleRules: React.FC<Props> = ({ agencyId, canManage }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rule_name: '',
    inspection_type: 'annual',
    cycle_months: 12,
    schedule_days_before: 30,
    notify_landlord_days_before: 14,
    notify_tenant_days_before: 7,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agency_inspection_schedules' as any)
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    setRules(((data as unknown) as Rule[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const add = async () => {
    if (!form.rule_name.trim()) { toast.error('Rule name required'); return; }
    const { error } = await supabase.from('agency_inspection_schedules' as any).insert({
      agency_id: agencyId,
      ...form,
    });
    if (error) { toast.error('Failed to create'); return; }
    toast.success('Rule created');
    setForm({ rule_name: '', inspection_type: 'annual', cycle_months: 12, schedule_days_before: 30, notify_landlord_days_before: 14, notify_tenant_days_before: 7 });
    setOpen(false);
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('agency_inspection_schedules' as any).update({ is_active }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this scheduling rule?')) return;
    await supabase.from('agency_inspection_schedules' as any).delete().eq('id', id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Auto-Schedule Rules
          </CardTitle>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Auto-Schedule Rule</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Rule Name *</Label><Input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} placeholder="e.g. Annual HCV Inspections" /></div>
                  <div>
                    <Label>Inspection Type</Label>
                    <Select value={form.inspection_type} onValueChange={v => setForm(f => ({ ...f, inspection_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Cycle (months)</Label><Input type="number" min={1} value={form.cycle_months} onChange={e => setForm(f => ({ ...f, cycle_months: +e.target.value }))} /></div>
                    <div><Label>Schedule (days before)</Label><Input type="number" min={1} value={form.schedule_days_before} onChange={e => setForm(f => ({ ...f, schedule_days_before: +e.target.value }))} /></div>
                    <div><Label>Notify landlord (days)</Label><Input type="number" min={0} value={form.notify_landlord_days_before} onChange={e => setForm(f => ({ ...f, notify_landlord_days_before: +e.target.value }))} /></div>
                    <div><Label>Notify tenant (days)</Label><Input type="number" min={0} value={form.notify_tenant_days_before} onChange={e => setForm(f => ({ ...f, notify_tenant_days_before: +e.target.value }))} /></div>
                  </div>
                  <Button onClick={add} className="w-full">Create Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No auto-schedule rules. Add one to schedule inspections automatically.</p>
        ) : (
          <div className="space-y-2">
            {rules.map(r => (
              <div key={r.id} className="flex items-center gap-2 p-3 rounded border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.rule_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.inspection_type.replace(/_/g, ' ')} • every {r.cycle_months}mo • notify L{r.notify_landlord_days_before}d / T{r.notify_tenant_days_before}d
                  </p>
                </div>
                <Switch checked={r.is_active} onCheckedChange={v => toggle(r.id, v)} disabled={!canManage} />
                {canManage && (
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)} className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectionScheduleRules;
