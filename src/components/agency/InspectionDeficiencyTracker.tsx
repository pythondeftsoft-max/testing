import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Camera, Upload, Loader2, Calendar, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  inspectionId: string;
  canManage: boolean;
}

const SEVERITY_COLORS: Record<string, "destructive" | "warning" | "secondary"> = {
  critical: 'destructive',
  major: 'warning',
  minor: 'secondary',
};

const InspectionDeficiencyTracker: React.FC<Props> = ({ inspectionId, canManage }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ category: 'interior', item_name: '', deficiency_notes: '' });
  const [uploading, setUploading] = useState<string | null>(null);

  const loadItems = async () => {
    const { data } = await supabase
      .from('hqs_inspection_items')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [inspectionId]);

  const addDeficiency = async () => {
    if (!newItem.item_name) return;
    const { error } = await supabase.from('hqs_inspection_items').insert({
      inspection_id: inspectionId,
      category: newItem.category as any,
      item_name: newItem.item_name,
      deficiency_notes: newItem.deficiency_notes,
      passed: false,
      photo_required: true,
    });
    if (error) toast.error('Failed to add deficiency');
    else {
      toast.success('Deficiency added');
      setNewItem({ category: 'interior', item_name: '', deficiency_notes: '' });
      setAddOpen(false);
      loadItems();
    }
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    setUploading(itemId);
    const path = `deficiencies/${inspectionId}/${itemId}_${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('inspection-photos').upload(path, file);
    if (upErr) { toast.error('Upload failed'); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(path);
    await supabase.from('hqs_inspection_items').update({ photo_url: urlData.publicUrl }).eq('id', itemId);
    toast.success('Photo attached');
    setUploading(null);
    loadItems();
  };

  const markResolved = async (itemId: string) => {
    await supabase.from('hqs_inspection_items').update({ passed: true }).eq('id', itemId);
    toast.success('Marked as resolved');
    loadItems();
  };

  const deficiencies = items.filter(i => !i.passed);
  const resolved = items.filter(i => i.passed);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Deficiencies ({deficiencies.length})
          </CardTitle>
          {canManage && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Add Deficiency</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Deficiency</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={newItem.category} onValueChange={v => setNewItem(n => ({ ...n, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['site','exterior','interior','bathroom','kitchen','electrical','plumbing','heating_cooling','fire_safety','general_health','lead_paint','smoke_co_detectors','other'].map(c => (
                          <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Item</Label>
                    <Input value={newItem.item_name} onChange={e => setNewItem(n => ({ ...n, item_name: e.target.value }))} placeholder="e.g. Broken window lock" />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={newItem.deficiency_notes} onChange={e => setNewItem(n => ({ ...n, deficiency_notes: e.target.value }))} placeholder="Description of the deficiency..." rows={3} />
                  </div>
                  <Button onClick={addDeficiency} className="w-full">Add Deficiency</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deficiencies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Photo</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {deficiencies.map(item => (
                <TableRow key={item.id}>
                  <TableCell><Badge variant="secondary" className="text-xs capitalize">{item.category.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{item.deficiency_notes || '—'}</TableCell>
                  <TableCell>
                    {item.photo_url ? (
                      <img src={item.photo_url} alt="Deficiency" className="w-10 h-10 rounded object-cover" />
                    ) : canManage ? (
                      <label className="cursor-pointer">
                        {uploading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoUpload(item.id, e.target.files[0])} />
                      </label>
                    ) : '—'}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => markResolved(item.id)}>Resolve</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No open deficiencies.</p>
        )}

        {resolved.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Resolved ({resolved.length})</p>
            <div className="space-y-1">
              {resolved.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="capitalize">{item.category.replace(/_/g, ' ')}</span> — {item.item_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InspectionDeficiencyTracker;
