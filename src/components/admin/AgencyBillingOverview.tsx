import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, FileText, AlertTriangle, TrendingUp, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const statusColor = (s: string): 'default' | 'secondary' | 'destructive' | 'warning' | 'success' => {
  switch (s) {
    case 'active': return 'success';
    case 'paid': return 'success';
    case 'sent': return 'default';
    case 'overdue': return 'destructive';
    case 'pending': return 'warning';
    case 'suspended': return 'destructive';
    case 'draft': return 'secondary';
    default: return 'secondary';
  }
};

export function AgencyBillingOverview() {
  const navigate = useNavigate();
  const [contractFilter, setContractFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['agency-billing-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_contracts')
        .select('*, housing_authorities(id, name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['agency-billing-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_invoices')
        .select('*, housing_authorities(id, name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // KPI calculations
  const activeContracts = contracts.filter((c: any) => c.status === 'active');
  const totalMRR = activeContracts.reduce((sum: number, c: any) => sum + (c.monthly_rate || 0), 0);
  const outstandingInvoices = invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue');
  const outstandingTotal = outstandingInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const overdueInvoices = invoices.filter((i: any) => i.status === 'overdue');
  const overdueTotal = overdueInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  const filteredContracts = contractFilter === 'all'
    ? contracts
    : contracts.filter((c: any) => c.status === contractFilter);

  const filteredInvoices = invoiceFilter === 'all'
    ? invoices
    : invoices.filter((i: any) => i.status === invoiceFilter);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Recurring</p>
                <p className="text-2xl font-bold">{fmt(totalMRR)}</p>
                <p className="text-xs text-muted-foreground">{activeContracts.length} active contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
                <p className="text-xs text-muted-foreground">{activeContracts.length} active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">{fmt(outstandingTotal)}</p>
                <p className="text-xs text-muted-foreground">{outstandingInvoices.length} invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{fmt(overdueTotal)}</p>
                <p className="text-xs text-muted-foreground">{overdueInvoices.length} invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts & Invoices Tables */}
      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Monthly Rate</TableHead>
                  <TableHead>Setup Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingContracts ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredContracts.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No contracts found</TableCell></TableRow>
                ) : filteredContracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{(c.housing_authorities as any)?.name || '—'}</TableCell>
                    <TableCell className="font-mono">{fmt(c.monthly_rate || 0)}</TableCell>
                    <TableCell className="font-mono">{fmt(c.setup_fee || 0)}</TableCell>
                    <TableCell><Badge variant={statusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.payment_terms}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.po_number || '—'}</TableCell>
                    <TableCell className="text-sm">{c.contract_start ? format(new Date(c.contract_start), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm">{c.contract_end ? format(new Date(c.contract_end), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/agency/${(c.housing_authorities as any)?.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInvoices ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : filteredInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{(inv.housing_authorities as any)?.name || '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="font-mono">{fmt(inv.amount || 0)}</TableCell>
                    <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-sm">{inv.issued_date ? format(new Date(inv.issued_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm">{inv.paid_date ? format(new Date(inv.paid_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/agency/${(inv.housing_authorities as any)?.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgencyBillingOverview;
