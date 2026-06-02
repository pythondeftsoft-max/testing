import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { exportCSV } from '@/lib/exportHUDReport';
import { format } from 'date-fns';

interface Disbursement {
  id: string;
  batch_id: string;
  landlord_id: string;
  tenant_id: string | null;
  period_month: string;
  amount: number;
  rail: string;
  status: string;
  memo: string | null;
  created_at: string;
  paid_at: string | null;
}

const STATUS_VARIANT: Record<string, any> = {
  pending: 'secondary',
  sent: 'default',
  paid: 'default',
  failed: 'destructive',
  voided: 'outline',
};

interface Props { agencyId?: string }

export default function DisbursementsSearch({ agencyId: agencyIdProp }: Props = {}) {
  const { user } = useAuth();
  const [agencyId, setAgencyId] = useState<string | null>(agencyIdProp || null);
  const [rows, setRows] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [railFilter, setRailFilter] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (agencyIdProp || !user) return;
    (supabase.from('agency_staff') as any).select('agency_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle()
      .then(({ data }: any) => setAgencyId(data?.agency_id || null));
  }, [agencyIdProp, user]);

  useEffect(() => {
    if (!agencyId) return;
    setLoading(true);
    let q = supabase
      .from('hap_disbursements')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (from) q = q.gte('period_month', from);
    if (to) q = q.lte('period_month', to);
    q.then(({ data }) => {
      setRows((data || []) as Disbursement[]);
      setLoading(false);
    });
  }, [agencyId, from, to]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (railFilter !== 'all' && r.rail !== railFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.landlord_id?.toLowerCase().includes(s) &&
          !r.tenant_id?.toLowerCase().includes(s) &&
          !(r.memo || '').toLowerCase().includes(s) &&
          !String(r.amount).includes(s)
        ) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, railFilter]);

  const totals = useMemo(() => ({
    count: filtered.length,
    amount: filtered.reduce((s, r) => s + Number(r.amount || 0), 0),
  }), [filtered]);

  const handleExport = () => {
    const header = ['Date', 'Period', 'Landlord ID', 'Tenant ID', 'Amount', 'Rail', 'Status', 'Memo', 'Batch ID'];
    const data = filtered.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd'),
      r.period_month,
      r.landlord_id,
      r.tenant_id || '',
      r.amount.toFixed(2),
      r.rail,
      r.status,
      r.memo || '',
      r.batch_id,
    ]);
    exportCSV([header, ...data], `disbursements-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Disbursement Search</CardTitle>
          <CardDescription>Filter and export across all HAP batches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Landlord, tenant, amount, memo…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
            <Select value={railFilter} onValueChange={setRailFilter}>
              <SelectTrigger><SelectValue placeholder="Rail" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rails</SelectItem>
                <SelectItem value="nacha">NACHA</SelectItem>
                <SelectItem value="checkbook">Checkbook</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="ap_export">AP Export</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {totals.count} line(s) · Total <strong>${totals.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Rail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Memo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-xs">{r.period_month}</TableCell>
                    <TableCell className="font-mono text-xs">{r.landlord_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{r.tenant_id?.slice(0, 8) || '—'}</TableCell>
                    <TableCell className="text-right font-medium">${Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase text-xs">{r.rail}</Badge></TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[r.status] || 'secondary'}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{r.memo || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtered.length > 200 && (
            <p className="text-xs text-muted-foreground text-center">Showing first 200 of {filtered.length}. Refine filters to narrow.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
