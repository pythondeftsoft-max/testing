import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Calendar, Home, Search } from 'lucide-react';
import { useLandlordHAPPayments, useLandlordHAPPaymentStats } from '@/hooks/useLandlordHAPTransactions';
import { format } from 'date-fns';

interface Props {
  landlordId: string;
  portfolioId?: string;
}

const LandlordHAPHistory: React.FC<Props> = ({ landlordId, portfolioId }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: paymentsData, isLoading } = useLandlordHAPPayments(landlordId, portfolioId, { status: statusFilter, searchTerm: search });
  const { data: stats } = useLandlordHAPPaymentStats(landlordId, portfolioId);

  const payments = paymentsData?.payments || [];
  const disbursements = paymentsData?.disbursements || [];

  // Method label per disbursement: "ACH" / "Check #1234" / "Wire (REF)" / "Yardi-12345"
  const methodLabel = (d: any) => {
    if (d.rail === 'nacha') return d.reference_number ? `ACH (${d.reference_number})` : 'ACH';
    if (d.rail === 'manual') {
      const m = d.payment_method || 'Manual';
      return d.reference_number ? `${m} #${d.reference_number}` : m;
    }
    if (d.rail === 'ap_export') return d.reference_number ? `AP-${d.reference_number}` : 'AP Export';
    return '—';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { disbursed: 'default', approved: 'secondary', pending: 'outline', held: 'destructive' };
    return <Badge variant={(map[status] || 'outline') as any} className="capitalize">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">${(stats?.ytdTotal || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">YTD HAP Received</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {stats?.lastPaymentDate ? format(new Date(stats.lastPaymentDate), 'MM/dd/yyyy') : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Last Payment</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Home className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats?.activeUnits || 0}</p>
              <p className="text-xs text-muted-foreground">Active Units</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="held">Held</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>HAP Amount</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">Tenant Portion
                    <span title="Tenant pays this directly to you. PHA does not collect or track tenant rent." className="text-muted-foreground cursor-help text-xs">ⓘ</span>
                  </span>
                </TableHead>
                <TableHead>Net Payment</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : payments.length === 0 && disbursements.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No HAP payments found</TableCell></TableRow>
              ) : (
                <>
                  {disbursements.map((d: any) => (
                    <TableRow key={`d-${d.id}`}>
                      <TableCell className="text-muted-foreground">{format(new Date(d.period_month), 'MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">${Number(d.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{d.tenant_portion ? `$${Number(d.tenant_portion).toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="font-semibold">${Number(d.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{methodLabel(d)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.paid_at ? format(new Date(d.paid_at), 'MM/dd/yyyy') : '—'}</TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                    </TableRow>
                  ))}
                  {payments.map((p: any) => (
                    <TableRow key={`p-${p.id}`}>
                      <TableCell className="text-muted-foreground">{format(new Date(p.created_at), 'MM/dd/yyyy')}</TableCell>
                      <TableCell className="font-medium">${Number(p.hap_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{p.tenant_portion ? `$${Number(p.tenant_portion).toLocaleString()}` : '—'}</TableCell>
                      <TableCell className="font-semibold">${Number(p.net_payment).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="text-xs text-muted-foreground">—</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground italic">
        Tenant Portion is shown for reference. Tenants pay this amount directly to you per the HAP contract — the PHA does not collect or track tenant rent.
      </p>
    </div>
  );
};

export default LandlordHAPHistory;
