import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, FileText } from 'lucide-react';

interface Entry {
  id: string;
  category: string;
  question: string;
  answer: string;
  short_answer: string | null;
  is_published: boolean;
  display_order: number;
  public_facing: boolean;
}

const categories = ['security', 'hud_compliance', 'architecture', 'data_handling', 'support', 'pricing', 'other'];

const RFPLibraryManager: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({
    category: 'security', question: '', answer: '', short_answer: '', display_order: '0', is_published: true,
  });

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rfp_response_library')
      .select('*')
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });
    setEntries((data as Entry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ category: 'security', question: '', answer: '', short_answer: '', display_order: '0', is_published: true });
    setOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditing(e);
    setForm({
      category: e.category,
      question: e.question,
      answer: e.answer,
      short_answer: e.short_answer || '',
      display_order: e.display_order.toString(),
      is_published: e.is_published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer required'); return; }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload = {
      category: form.category,
      question: form.question,
      answer: form.answer,
      short_answer: form.short_answer || null,
      display_order: Number(form.display_order) || 0,
      is_published: form.is_published,
      updated_by: user?.id,
    };
    const { error } = editing
      ? await supabase.from('rfp_response_library').update(payload).eq('id', editing.id)
      : await supabase.from('rfp_response_library').insert({ ...payload, created_by: user?.id });
    setSaving(false);
    if (error) { toast.error('Save failed'); return; }
    toast.success(editing ? 'Updated' : 'Added');
    setOpen(false);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('rfp_response_library').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Deleted');
    fetchAll();
  };

  const togglePublish = async (e: Entry) => {
    await supabase.from('rfp_response_library').update({ is_published: !e.is_published }).eq('id', e.id);
    fetchAll();
  };

  const togglePublic = async (e: Entry) => {
    await supabase.from('rfp_response_library').update({ public_facing: !e.public_facing }).eq('id', e.id);
    fetchAll();
  };

  const grouped = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="w-5 h-5" /> RFP Response Library</h2>
          <p className="text-sm text-muted-foreground">Master answers used by /trust and the RFP packet generator.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add Entry</Button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{cat.replace('_', ' ')} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(e => (
              <div key={e.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{e.question}</span>
                      <Badge variant={e.is_published ? 'default' : 'outline'} className="text-xs">
                        {e.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {e.public_facing && <Badge variant="secondary" className="text-xs">Public</Badge>}
                      <span className="text-xs text-muted-foreground">#{e.display_order}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{e.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-0.5">
                      <Switch checked={e.is_published} onCheckedChange={() => togglePublish(e)} />
                      <span className="text-[9px] text-muted-foreground">Pub</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Switch checked={e.public_facing} onCheckedChange={() => togglePublic(e)} />
                      <span className="text-[9px] text-muted-foreground">PHA</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} RFP Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select className="w-full border rounded-md p-2 text-sm bg-background"
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Question</Label>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div>
              <Label>Short Answer (1-line for exports)</Label>
              <Input value={form.short_answer} onChange={(e) => setForm({ ...form, short_answer: e.target.value })} />
            </div>
            <div>
              <Label>Full Answer</Label>
              <Textarea rows={6} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published (visible on /trust)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RFPLibraryManager;
