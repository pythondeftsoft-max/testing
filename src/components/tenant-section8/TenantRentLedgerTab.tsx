import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface TenantRentLedgerTabProps {
  userId: string;
}

const ENTRY_LABELS: Record<string, string> = {
  charge: 'Charge',
  payment: 'Payment',
  adjustment: 'Adjustment',
  repayment: 'Repayment',
};

const TenantRentLedgerTab: React.FC<TenantRentLedgerTabProps> = ({ userId }) => {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['tenant-rent-ledger', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_tenant_ledger')
        .select('id, month, entry_type, amount, running_balance, description, created_at')
        .eq('tenant_id', userId)
        .order('month', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const currentBalance = entries.length > 0 ? parseFloat(entries[0].running_balance) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-destructive' : 'text-primary'}`}>
              ${Math.abs(currentBalance).toFixed(2)}{currentBalance < 0 ? ' CR' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No ledger entries</TableCell></TableRow>
              ) : (
                entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.month}</TableCell>
                    <TableCell><Badge variant={e.entry_type === 'charge' ? 'destructive' : 'default'}>{ENTRY_LABELS[e.entry_type] || e.entry_type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.description || '—'}</TableCell>
                    <TableCell className={`text-right font-mono ${e.entry_type === 'charge' ? 'text-destructive' : 'text-primary'}`}>
                      {e.entry_type === 'charge' ? '+' : '-'}${parseFloat(e.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">${parseFloat(e.running_balance).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantRentLedgerTab;
