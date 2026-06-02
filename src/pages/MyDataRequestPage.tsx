import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MyDataRequestPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState('export');
  const [details, setDetails] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-dsar', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('dsar_requests' as any).select('*').eq('requester_user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('dsar_requests' as any).insert({
        requester_user_id: user!.id, requester_role: 'tenant',
        request_type: type, details, status: 'submitted',
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Request submitted. We will respond within 30 days.'); qc.invalidateQueries({ queryKey: ['my-dsar'] }); setDetails(''); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) return <Navigate to="/auth" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Request My Data</h1>
        <p className="text-muted-foreground">Under the federal Privacy Act you may request a copy, correction, or deletion of your records.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New Request</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="export">Export a copy of my data</SelectItem>
              <SelectItem value="correction">Correct inaccurate information</SelectItem>
              <SelectItem value="deletion">Delete my data (where legally permitted)</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Optional details (which records, what to correct, etc.)" value={details} onChange={e => setDetails(e.target.value)} />
          <Button onClick={() => submit.mutate()}>Submit Request</Button>
          <p className="text-xs text-muted-foreground">Some records (HAP files, financial records) must be retained 3–7 years under federal regulations and cannot be deleted before that period.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.length ? data.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.created_at), 'PP')}</TableCell>
                  <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.denial_reason || (r.export_url ? <a className="underline" href={r.export_url}>Download</a> : '—')}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No requests yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
