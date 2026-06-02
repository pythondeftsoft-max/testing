import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Plus, Pencil, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureDemo {
  id: string;
  feature_key: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
}

const emptyForm: Omit<FeatureDemo, 'id'> = {
  feature_key: '',
  title: '',
  description: '',
  video_url: '',
  duration_seconds: null,
  thumbnail_url: '',
  is_active: true,
  display_order: 0,
};

export function FeatureDemoManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FeatureDemo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const { data: demos, isLoading } = useQuery({
    queryKey: ['admin-feature-demos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_demos')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FeatureDemo[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: typeof emptyForm & { id?: string }) => {
      const { id, ...rest } = payload;
      const cleanPayload = {
        ...rest,
        description: rest.description || null,
        thumbnail_url: rest.thumbnail_url || null,
        duration_seconds: rest.duration_seconds || null,
      };
      if (id) {
        const { error } = await supabase.from('feature_demos').update(cleanPayload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('feature_demos').insert(cleanPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feature-demos'] });
      qc.invalidateQueries({ queryKey: ['feature-demo'] });
      toast.success(editing ? 'Demo updated' : 'Demo created');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feature_demos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feature-demos'] });
      toast.success('Demo deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('feature_demos').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-demos'] }),
  });

  const openEdit = (demo: FeatureDemo) => {
    setEditing(demo);
    setForm({
      feature_key: demo.feature_key,
      title: demo.title,
      description: demo.description || '',
      video_url: demo.video_url,
      duration_seconds: demo.duration_seconds,
      thumbnail_url: demo.thumbnail_url || '',
      is_active: demo.is_active,
      display_order: demo.display_order,
    });
  };

  const openCreate = () => {
    setCreating(true);
    setForm(emptyForm);
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.feature_key.trim() || !form.title.trim() || !form.video_url.trim()) {
      toast.error('Feature key, title, and video URL are required');
      return;
    }
    upsert.mutate(editing ? { ...form, id: editing.id } : form);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" /> Feature Demos
          </CardTitle>
          <CardDescription>
            Manage embeddable demo videos (Loom, Vimeo, YouTube) tied to product features.
          </CardDescription>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Demo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !demos?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Play className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No feature demos yet. Add one to embed in product pages.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {demos.map((demo) => (
              <div
                key={demo.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{demo.title}</span>
                    <Badge variant="outline" className="text-xs font-mono">{demo.feature_key}</Badge>
                    {!demo.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <a
                    href={demo.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    {demo.video_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Switch
                  checked={demo.is_active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: demo.id, is_active: v })}
                />
                <Button size="icon" variant="ghost" onClick={() => openEdit(demo)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${demo.title}"?`)) remove.mutate(demo.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing || creating} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Demo' : 'New Feature Demo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="feature_key">Feature Key *</Label>
              <Input
                id="feature_key"
                placeholder="hap-batching"
                value={form.feature_key}
                onChange={(e) => setForm({ ...form, feature_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase slug, no spaces. Used in URLs: <code>/demos/{form.feature_key || 'your-key'}</code>
              </p>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="HAP Batch Processing in 90 seconds"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Quick walkthrough of how to draft, review, and disburse HAP payments..."
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="video_url">Video URL *</Label>
              <Input
                id="video_url"
                placeholder="https://www.loom.com/share/..."
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Loom, Vimeo, or YouTube share URLs supported.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="90"
                  value={form.duration_seconds || ''}
                  onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || null })}
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="is_active">Active (visible publicly)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Save changes' : 'Create demo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
