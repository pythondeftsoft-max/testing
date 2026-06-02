import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['new', 'contacted', 'demo_scheduled', 'proposal_sent', 'won', 'lost'] as const;

export default function InboundLeadsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['agency-sales', 'inbound-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return leads.filter((l: any) => {
      if (status !== 'all' && l.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.agency_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.contact_email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, status, search]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('agency_leads').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Lead updated' });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search agency, contact, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {leads.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vouchers</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.agency_name}</div>
                    <div className="text-xs text-muted-foreground">{l.agency_state}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{l.contact_name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {l.contact_email && (
                        <a href={`mailto:${l.contact_email}`} className="flex items-center gap-1 hover:underline">
                          <Mail className="h-3 w-3" />
                          {l.contact_email}
                        </a>
                      )}
                      {l.contact_phone && (
                        <a href={`tel:${l.contact_phone}`} className="flex items-center gap-1 hover:underline">
                          <Phone className="h-3 w-3" />
                          {l.contact_phone}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{l.voucher_count?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{l.source}</Badge></TableCell>
                  <TableCell>
                    <Select
                      value={l.status}
                      onValueChange={(v) => updateStatus.mutate({ id: l.id, status: v })}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No leads match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
