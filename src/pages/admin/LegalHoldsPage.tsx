import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function LegalHoldsPage() {
  const { data: isAdmin, isLoading: chk } = useAdminCheck();
  const qc = useQueryClient();
  const [form, setForm] = useState({ record_type: '', record_id: '', hold_reason: '', case_reference: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['legal-holds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('legal_holds' as any).select('*').order('placed_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!isAdmin,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('legal_holds' as any).insert({ ...form, placed_by: u.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Hold placed'); qc.invalidateQueries({ queryKey: ['legal-holds'] }); setForm({ record_type: '', record_id: '', hold_reason: '', case_reference: '' }); },
    onError: (e: any) => toast.error(e.message),
  });

  const release = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('legal_holds' as any).update({ released_at: new Date().toISOString(), released_by: u.user?.id, release_reason: reason }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Released'); qc.invalidateQueries({ queryKey: ['legal-holds'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (chk || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Legal Holds</h1>
        <p className="text-muted-foreground">Records under hold are excluded from automated retention purges.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Place New Hold</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Record type (e.g. tenant_files)" value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value }))} />
          <Input placeholder="Record UUID" value={form.record_id} onChange={e => setForm(f => ({ ...f, record_id: e.target.value }))} />
          <Input placeholder="Case reference" value={form.case_reference} onChange={e => setForm(f => ({ ...f, case_reference: e.target.value }))} />
          <Textarea placeholder="Reason for hold" value={form.hold_reason} onChange={e => setForm(f => ({ ...f, hold_reason: e.target.value }))} />
          <div className="md:col-span-2"><Button onClick={() => create.mutate()} disabled={!form.record_type || !form.record_id || !form.hold_reason}>Place Hold</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Holds</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Placed</TableHead><TableHead>Record</TableHead><TableHead>Reason</TableHead>
              <TableHead>Case</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.length ? data.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{format(new Date(h.placed_at), 'PP')}</TableCell>
                  <TableCell><div className="font-medium">{h.record_type}</div><div className="text-xs text-muted-foreground font-mono">{String(h.record_id).slice(0, 8)}</div></TableCell>
                  <TableCell className="max-w-xs text-xs">{h.hold_reason}</TableCell>
                  <TableCell className="text-xs">{h.case_reference}</TableCell>
                  <TableCell>{h.released_at ? <Badge variant="outline">Released</Badge> : <Badge>Active</Badge>}</TableCell>
                  <TableCell>{!h.released_at && <Button size="sm" variant="outline" onClick={() => { const r = prompt('Release reason?'); if (r) release.mutate({ id: h.id, reason: r }); }}>Release</Button>}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No holds.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
