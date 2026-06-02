import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Loader2, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const sevColor: Record<string, string> = { low: 'bg-blue-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600' };

export default function SecurityIncidentsPage() {
  const { data: isAdmin, isLoading: chk } = useAdminCheck();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', pii_exposed: false });
  const [affectedFor, setAffectedFor] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('security_incidents' as any).select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!isAdmin,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('security_incidents' as any).insert({
        title: form.title, description: form.description, severity: form.severity,
        pii_exposed: form.pii_exposed, status: 'open', reporter_id: u.user?.id, discovered_at: new Date().toISOString(),
        incident_type: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Incident logged'); qc.invalidateQueries({ queryKey: ['security-incidents'] }); setForm({ title: '', description: '', severity: 'medium', pii_exposed: false }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAffected = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('security_incidents' as any)
        .update({ affected_user_ids: selected.map(s => s.id), status: 'confirmed' })
        .eq('id', affectedFor.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Saved'); setAffectedFor(null); setSelected([]); qc.invalidateQueries({ queryKey: ['security-incidents'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sendNotifications = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('breach-notify', { body: { incidentId: id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Send failed');
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Notifications sent: ${d.sent}${d.errors?.length ? ` (${d.errors.length} failed)` : ''}`);
      qc.invalidateQueries({ queryKey: ['security-incidents'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const searchUsers = async (q: string) => {
    if (q.length < 2) return [];
    const { data } = await supabase.from('profiles').select('id, email, full_name').ilike('email', `%${q}%`).limit(10);
    return (data ?? []) as any[];
  };

  const { data: searchResults } = useQuery({
    queryKey: ['profile-search', search],
    queryFn: () => searchUsers(search),
    enabled: !!affectedFor && search.length >= 2,
  });

  const sla = (i: any) => {
    if (!['high','critical'].includes(i.severity) || i.notification_sent_at) return null;
    const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 60) return <Badge variant="destructive" className="ml-1">SLA breached: {days}d</Badge>;
    if (days >= 45) return <Badge variant="destructive" className="ml-1">{days}d / 60</Badge>;
    return null;
  };

  const openAffected = (incident: any) => {
    setAffectedFor(incident);
    setSelected([]);
    setSearch('');
  };

  if (chk || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Incidents</h1>
        <p className="text-muted-foreground">Log breaches, track containment, send breach notifications (HUD 60-day SLA).</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Log New Incident</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea className="md:col-span-2" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <label className="flex items-center gap-2"><Switch checked={form.pii_exposed} onCheckedChange={v => setForm(f => ({ ...f, pii_exposed: v }))} /> PII exposed</label>
          <div><Button onClick={() => create.mutate()} disabled={!form.title}>Log Incident</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Incidents ({data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead>
              <TableHead>Status</TableHead><TableHead>Affected</TableHead><TableHead>Notifications</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.length ? data.map(i => {
                const affectedCount = (i.affected_user_ids || []).length;
                const canNotify = ['high','critical'].includes(i.severity) && affectedCount > 0 && !i.notification_sent_at;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">{format(new Date(i.created_at), 'PP')}{sla(i)}</TableCell>
                    <TableCell className="font-medium">{i.title}</TableCell>
                    <TableCell><Badge className={sevColor[i.severity]}>{i.severity}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openAffected(i)}>
                        {affectedCount} users
                      </Button>
                    </TableCell>
                    <TableCell className="space-x-1 text-xs">
                      {i.notification_sent_at ? (
                        <Badge variant="outline">Sent {i.notification_recipient_count} • {format(new Date(i.notification_sent_at), 'PP')}</Badge>
                      ) : canNotify ? (
                        <Button size="sm" onClick={() => sendNotifications.mutate(i.id)} disabled={sendNotifications.isPending}>
                          <Send className="h-3 w-3 mr-1" />Send breach notice
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">{['high','critical'].includes(i.severity) ? 'Add affected users' : 'Below severity threshold'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No incidents logged.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!affectedFor} onOpenChange={(o) => !o && setAffectedFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Affected users — {affectedFor?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
            {(searchResults ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm border rounded p-2">
                <div>
                  <div className="font-medium">{r.full_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </div>
                <Button size="sm" variant="outline" disabled={selected.some(s => s.id === r.id)}
                        onClick={() => setSelected(s => [...s, { id: r.id, email: r.email, full_name: r.full_name }])}>
                  Add
                </Button>
              </div>
            ))}
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">Selected ({selected.length})</div>
              {selected.map(s => (
                <Badge key={s.id} variant="secondary" className="mr-1 mb-1">
                  {s.email}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelected(sel => sel.filter(x => x.id !== s.id))} />
                </Badge>
              ))}
            </div>
            <Button onClick={() => saveAffected.mutate()} disabled={saveAffected.isPending}>
              Save & confirm incident
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
