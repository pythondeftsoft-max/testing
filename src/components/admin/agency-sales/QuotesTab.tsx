import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function QuotesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['agency-sales', 'quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_leads')
        .select('id, agency_name, contact_name, contact_email, proposal_amount, proposal_sent_at, proposal_pdf_url, status, voucher_count')
        .not('proposal_amount', 'is', null)
        .order('proposal_sent_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const markStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'won' | 'lost' | 'proposal_sent' }) => {
      const patch: any = { status };
      if (status === 'proposal_sent') patch.proposal_sent_at = new Date().toISOString();
      const { error } = await supabase.from('agency_leads').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Updated' });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const stats = useMemo(() => {
    const sent = quotes.filter((q: any) => q.proposal_sent_at).length;
    const won = quotes.filter((q: any) => q.status === 'won').length;
    const total = quotes.reduce((s: number, q: any) => s + Number(q.proposal_amount || 0), 0);
    return { sent, won, total };
  }, [quotes]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Sent</div><div className="text-2xl font-bold">{stats.sent}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Won</div><div className="text-2xl font-bold">{stats.won}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pipeline value (mo)</div><div className="text-2xl font-bold">${stats.total.toLocaleString()}</div></CardContent></Card>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No quotes yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Amount/mo</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <div className="font-medium">{q.agency_name}</div>
                    <div className="text-xs text-muted-foreground">{q.voucher_count?.toLocaleString() ?? '—'} vch</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{q.contact_name}</div>
                    <div className="text-xs text-muted-foreground">{q.contact_email}</div>
                  </TableCell>
                  <TableCell className="font-semibold">${Number(q.proposal_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {q.proposal_sent_at ? formatDistanceToNow(new Date(q.proposal_sent_at), { addSuffix: true }) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.status === 'won' ? 'default' : q.status === 'lost' ? 'destructive' : 'secondary'}>
                      {q.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {q.proposal_pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={q.proposal_pdf_url} target="_blank" rel="noreferrer">
                          <FileText className="h-3 w-3 mr-1" /> PDF
                        </a>
                      </Button>
                    )}
                    {!q.proposal_sent_at && (
                      <Button size="sm" variant="outline" onClick={() => markStatus.mutate({ id: q.id, status: 'proposal_sent' })}>
                        Mark sent
                      </Button>
                    )}
                    {q.status !== 'won' && (
                      <Button size="sm" onClick={() => markStatus.mutate({ id: q.id, status: 'won' })}>
                        Won
                      </Button>
                    )}
                    {q.status !== 'lost' && (
                      <Button size="sm" variant="outline" onClick={() => markStatus.mutate({ id: q.id, status: 'lost' })}>
                        Lost
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
