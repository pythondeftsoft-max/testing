import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertOctagon, Plus, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, isPast } from 'date-fns';

interface Props {
  inspectionId: string;
  agencyId: string;
  canManage: boolean;
}

const SEVERITIES = [
  { value: 'life_threatening', label: 'Life-threatening (24h)', variant: 'destructive' as const },
  { value: 'severe', label: 'Severe (72h)', variant: 'destructive' as const },
  { value: 'moderate', label: 'Moderate (14d)', variant: 'warning' as const },
  { value: 'standard', label: 'Standard (30d)', variant: 'secondary' as const },
];

const CATEGORIES = ['electrical', 'plumbing', 'structural', 'mechanical', 'fire_life_safety', 'health_sanitation', 'lead_paint', 'pest', 'environmental', 'accessibility', 'other'];

interface Deficiency {
  id: string;
  category: string;
  severity: string;
  nspire_code: string | null;
  location: string | null;
  description: string;
  cure_deadline: string | null;
  cured_date: string | null;
  cure_notes: string | null;
}

interface NspireCode {
  id: string;
  code: string;
  category: string;
  name: string;
  default_severity: string;
  default_cure_days: number;
}

const NspireDeficiencyTracker: React.FC<Props> = ({ inspectionId, agencyId, canManage }) => {
  const [items, setItems] = useState<Deficiency[]>([]);
  const [codes, setCodes] = useState<NspireCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState('');
  const [form, setForm] = useState({
    category: 'electrical',
    severity: 'standard',
    nspire_code: '',
    location: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: cd }] = await Promise.all([
      supabase.from('agency_inspection_deficiencies' as any).select('*').eq('inspection_id', inspectionId).order('cure_deadline', { ascending: true }),
      supabase.from('nspire_deficiency_codes' as any).select('id, code, category, name, default_severity, default_cure_days').eq('is_active', true).order('default_severity').order('code'),
    ]);
    if (error) toast.error('Failed to load deficiencies');
    setItems(((data as unknown) as Deficiency[]) || []);
    setCodes(((cd as unknown) as NspireCode[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [inspectionId]);

  // Auto-fill form when an NSPIRE code is selected
  const handleCodeSelect = (id: string) => {
    setSelectedCodeId(id);
    const c = codes.find(x => x.id === id);
    if (c) {
      const sevMap: Record<string, string> = { life_threatening: 'life_threatening', severe: 'severe', moderate: 'moderate', low: 'standard' };
      setForm(f => ({
        ...f,
        nspire_code: c.code,
        category: c.category,
        severity: sevMap[c.default_severity] || 'standard',
      }));
    }
  };

  const add = async () => {
    if (!form.description.trim()) { toast.error('Description required'); return; }
    setSaving(true);
    const { error } = await supabase.from('agency_inspection_deficiencies' as any).insert({
      inspection_id: inspectionId,
      agency_id: agencyId,
      category: form.category,
      severity: form.severity,
      nspire_code: form.nspire_code || null,
      location: form.location || null,
      description: form.description,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add'); return; }
    toast.success('Deficiency logged');
    setForm({ category: 'electrical', severity: 'standard', nspire_code: '', location: '', description: '' });
    setSelectedCodeId('');
    setOpen(false);
    load();
  };

  const markCured = async (id: string) => {
    const notes = window.prompt('Cure notes (optional):') ?? '';
    const { error } = await supabase
      .from('agency_inspection_deficiencies' as any)
      .update({ cured_date: new Date().toISOString(), cure_notes: notes || null })
      .eq('id', id);
    if (error) { toast.error('Failed to mark cured'); return; }
    toast.success('Marked cured');
    load();
  };

  const open_ = items.filter(d => !d.cured_date);
  const cured = items.filter(d => !!d.cured_date);
  const overdue = open_.filter(d => d.cure_deadline && isPast(new Date(d.cure_deadline))).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive" />
            NSPIRE Deficiencies ({open_.length})
            {overdue > 0 && <Badge variant="destructive" className="ml-1">{overdue} overdue</Badge>}
          </CardTitle>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log NSPIRE Deficiency</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>NSPIRE Code (auto-fills category, severity, cure window)</Label>
                    <Select value={selectedCodeId} onValueChange={handleCodeSelect}>
                      <SelectTrigger><SelectValue placeholder="Select NSPIRE code..." /></SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {codes.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="font-mono text-xs mr-2">{c.code}</span>
                            <span>{c.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({c.default_cure_days}d)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Kitchen" />
                    </div>
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                  </div>
                  <p className="text-xs text-muted-foreground">Cure deadline auto-calculated from severity.</p>
                  <Button onClick={add} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Log Deficiency
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : open_.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No open NSPIRE deficiencies.</p>
        ) : (
          open_.map(d => {
            const sev = SEVERITIES.find(s => s.value === d.severity);
            const deadline = d.cure_deadline ? new Date(d.cure_deadline) : null;
            const od = deadline && isPast(deadline);
            return (
              <div key={d.id} className={`p-3 rounded border ${od ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={sev?.variant || 'secondary'} className="text-xs">{d.severity.replace(/_/g, ' ')}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{d.category.replace(/_/g, ' ')}</Badge>
                      {d.nspire_code && <span className="text-xs font-mono text-muted-foreground">{d.nspire_code}</span>}
                      {d.location && <span className="text-xs text-muted-foreground">• {d.location}</span>}
                    </div>
                    <p className="text-sm">{d.description}</p>
                    {deadline && (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${od ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" />
                        Cure {od ? 'overdue by' : 'due in'} {formatDistanceToNow(deadline)}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => markCured(d.id)}>Mark Cured</Button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {cured.length > 0 && (
          <div className="pt-2 mt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Cured ({cured.length})
            </p>
            {cured.map(d => (
              <div key={d.id} className="text-xs text-muted-foreground py-0.5 truncate">
                <span className="capitalize">{d.category.replace(/_/g, ' ')}</span> — {d.description}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NspireDeficiencyTracker;
