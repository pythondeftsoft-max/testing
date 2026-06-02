import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Loader2, Download, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  submitted: 'bg-blue-500', in_review: 'bg-yellow-500', pending_legal_review: 'bg-orange-500',
  fulfilled: 'bg-green-500', denied: 'bg-red-500', cancelled: 'bg-gray-500',
};

export default function DsarQueuePage() {
  const { data: isAdmin, isLoading: chk } = useAdminCheck();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dsar-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dsar_requests' as any).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!isAdmin,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, denial_reason }: { id: string; status: string; denial_reason?: string }) => {
      const patch: any = { status };
      if (status === 'fulfilled') patch.fulfilled_at = new Date().toISOString();
      if (denial_reason) patch.denial_reason = denial_reason;
      const { error } = await supabase.from('dsar_requests' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['dsar-requests'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const autoFulfill = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('dsar-fulfill', { body: { requestId: id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Fulfillment failed');
      return data;
    },
    onSuccess: (d) => {
      toast.success(d.url ? 'Export ready — link valid 7 days' : (d.message || 'Fulfilled'));
      qc.invalidateQueries({ queryKey: ['dsar-requests'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (chk || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const slaWarn = (r: any) => {
    if (r.status === 'fulfilled' || r.status === 'denied') return null;
    const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 20) return <Badge variant="destructive" className="ml-1">{days}d</Badge>;
    return null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Subject Access Requests</h1>
        <p className="text-muted-foreground">Tenant & landlord export, deletion, and correction requests (Privacy Act — 30 day SLA).</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Queue ({data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Submitted</TableHead><TableHead>Type</TableHead><TableHead>Role</TableHead>
              <TableHead>Status</TableHead><TableHead>Details</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.length ? data.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">
                    {format(new Date(r.created_at), 'PP')}
                    {slaWarn(r)}
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                  <TableCell>{r.requester_role}</TableCell>
                  <TableCell><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-xs">
                    {r.details}
                    {r.fulfillment_url && (
                      <div className="mt-1">
                        <a href={r.fulfillment_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs">
                          <Download className="h-3 w-3" /> Download export
                        </a>
                        {r.fulfillment_expires_at && (
                          <span className="text-muted-foreground ml-2">expires {formatDistanceToNow(new Date(r.fulfillment_expires_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {r.status === 'submitted' && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: 'in_review' })}>Start</Button>}
                    {['submitted','in_review','pending_legal_review'].includes(r.status) && (r.request_type === 'export' || r.request_type === 'delete') && (
                      <Button size="sm" onClick={() => autoFulfill.mutate(r.id)} disabled={autoFulfill.isPending}>
                        <Sparkles className="h-3 w-3 mr-1" />Auto-fulfill
                      </Button>
                    )}
                    {['submitted','in_review','pending_legal_review'].includes(r.status) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: 'fulfilled' })}>Mark fulfilled</Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          const reason = prompt('Denial reason?'); if (reason) setStatus.mutate({ id: r.id, status: 'denied', denial_reason: reason });
                        }}>Deny</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
