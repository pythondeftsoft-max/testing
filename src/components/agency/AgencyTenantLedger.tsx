import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import RecipientPicker from './RecipientPicker';

interface AgencyTenantLedgerProps {
  agencyId: string;
  staffId: string;
  canManage: boolean;
}

const ENTRY_TYPES = [
  { value: 'charge', label: 'Charge', color: 'destructive' },
  { value: 'payment', label: 'Payment', color: 'default' },
  { value: 'adjustment', label: 'Adjustment', color: 'secondary' },
  { value: 'repayment', label: 'Repayment', color: 'outline' },
] as const;

const AgencyTenantLedger: React.FC<AgencyTenantLedgerProps> = ({ agencyId, staffId, canManage }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_type: 'charge',
    amount: '',
    month: format(new Date(), 'yyyy-MM'),
    description: '',
  });

  const { data: ledgerEntries = [], isLoading } = useQuery({
    queryKey: ['agency-tenant-ledger', agencyId, selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await (supabase as any)
        .from('agency_tenant_ledger')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('tenant_id', selectedTenantId)
        .order('month', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTenantId,
  });

  const addEntryMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(newEntry.amount);
      if (isNaN(amount)) throw new Error('Invalid amount');

      // Calculate running balance
      const lastBalance = ledgerEntries.length > 0 ? parseFloat(ledgerEntries[0].running_balance) : 0;
      const balanceChange = newEntry.entry_type === 'charge' ? amount : -amount;
      const newBalance = lastBalance + balanceChange;

      const { error } = await (supabase as any)
        .from('agency_tenant_ledger')
        .insert({
          agency_id: agencyId,
          tenant_id: selectedTenantId,
          month: newEntry.month,
          entry_type: newEntry.entry_type,
          amount,
          running_balance: newBalance,
          description: newEntry.description || null,
          created_by: staffId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-tenant-ledger', agencyId, selectedTenantId] });
      setDialogOpen(false);
      setNewEntry({ entry_type: 'charge', amount: '', month: format(new Date(), 'yyyy-MM'), description: '' });
      toast({ title: 'Ledger entry added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const exportCSV = () => {
    if (ledgerEntries.length === 0) return;
    const rows = [
      ['Month', 'Type', 'Amount', 'Balance', 'Description', 'Date'],
      ...ledgerEntries.map((e: any) => [
        e.month,
        e.entry_type,
        e.amount,
        e.running_balance,
        (e.description || '').replace(/,/g, ';'),
        format(new Date(e.created_at), 'yyyy-MM-dd HH:mm'),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-ledger-${selectedTenantId.slice(0, 8)}-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCharges = ledgerEntries.reduce((sum: number, e: any) => e.entry_type === 'charge' ? sum + parseFloat(e.amount) : sum, 0);
  const totalPayments = ledgerEntries.reduce((sum: number, e: any) => e.entry_type !== 'charge' ? sum + parseFloat(e.amount) : sum, 0);
  const currentBalance = ledgerEntries.length > 0 ? parseFloat(ledgerEntries[0].running_balance) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Tenant Ledger / Accounts Receivable</h3>
        <div className="flex gap-2">
          {selectedTenantId && ledgerEntries.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="text-sm">Select Tenant</Label>
              <RecipientPicker
                agencyId={agencyId}
                type="tenant"
                value={selectedTenantId}
                onChange={(r) => setSelectedTenantId(r?.id || '')}
                placeholder="Search tenant..."
              />
            </div>
            {canManage && selectedTenantId && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Ledger Entry</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newEntry.entry_type} onValueChange={v => setNewEntry(p => ({ ...p, entry_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount ($)</Label>
                      <Input type="number" step="0.01" value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Month</Label>
                      <Input type="month" value={newEntry.month} onChange={e => setNewEntry(p => ({ ...p, month: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <Button onClick={() => addEntryMutation.mutate()} disabled={!newEntry.amount || addEntryMutation.isPending} className="w-full">
                      {addEntryMutation.isPending ? 'Adding...' : 'Add Entry'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTenantId && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Charges</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                <span className="text-2xl font-bold text-foreground">${totalCharges.toFixed(2)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Payments</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">${totalPayments.toFixed(2)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current Balance</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className={`text-2xl font-bold ${currentBalance > 0 ? 'text-destructive' : 'text-primary'}`}>
                  ${Math.abs(currentBalance).toFixed(2)}
                  {currentBalance < 0 && ' CR'}
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : ledgerEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No ledger entries yet</TableCell></TableRow>
                  ) : (
                    ledgerEntries.map((entry: any) => {
                      const typeConfig = ENTRY_TYPES.find(t => t.value === entry.entry_type);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">{entry.month}</TableCell>
                          <TableCell>
                            <Badge variant={typeConfig?.color as any || 'secondary'}>{typeConfig?.label || entry.entry_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.description || '—'}</TableCell>
                          <TableCell className={`text-right font-mono ${entry.entry_type === 'charge' ? 'text-destructive' : 'text-primary'}`}>
                            {entry.entry_type === 'charge' ? '+' : '-'}${parseFloat(entry.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">${parseFloat(entry.running_balance).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(entry.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AgencyTenantLedger;
