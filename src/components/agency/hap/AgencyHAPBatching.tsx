import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, DollarSign, Loader2 } from 'lucide-react';
import { useHAPBatches, HAPBatch } from '@/hooks/useHAPBatches';
import HAPBatchGenerator from './HAPBatchGenerator';
import HAPBatchDetail from './HAPBatchDetail';
import NachaFileHistory from './NachaFileHistory';

interface Props {
  agencyId: string;
  agencyName: string;
  canEdit: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  disbursed: 'bg-primary/10 text-primary',
  voided: 'bg-destructive/10 text-destructive',
};

const AgencyHAPBatching: React.FC<Props> = ({ agencyId, agencyName, canEdit }) => {
  const { batches, loading, createBatch, updateStatus, checkDuplicate, refetch } = useHAPBatches(agencyId);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<HAPBatch | null>(null);

  // Single-pass aggregation across batches[] — avoids three sequential filters/reduces.
  // Computed BEFORE the early return below to keep hook order stable.
  const { totalDisbursed, pendingBatches } = useMemo(() => {
    let total = 0;
    const pending: typeof batches = [];
    for (const b of batches) {
      if (b.status === 'disbursed') total += b.total_amount;
      if (b.status === 'draft' || b.status === 'reviewed' || b.status === 'approved') {
        pending.push(b);
      }
    }
    return { totalDisbursed: total, pendingBatches: pending };
  }, [batches]);

  if (selectedBatch) {
    return (
      <HAPBatchDetail
        batch={selectedBatch}
        agencyName={agencyName}
        onBack={() => { setSelectedBatch(null); refetch(); }}
        onStatusChange={updateStatus}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> HAP Payment Batching
          </h2>
          <p className="text-sm text-muted-foreground">Generate, review, and approve monthly HAP disbursement runs</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowGenerator(true)}>
            <Plus className="w-4 h-4 mr-2" /> Generate Batch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Disbursed (All Time)</p>
          <p className="text-2xl font-bold">${totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Pending Batches</p>
          <p className="text-2xl font-bold">{pendingBatches.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Batches</p>
          <p className="text-2xl font-bold">{batches.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Batches</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : batches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No HAP batches yet. Generate your first batch to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Landlords</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(b => (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBatch(b)}>
                    <TableCell className="font-medium">{b.batch_number}</TableCell>
                    <TableCell>{format(new Date(b.period_month), 'MMM yyyy')}</TableCell>
                    <TableCell><Badge className={statusColors[b.status]}>{b.status}</Badge></TableCell>
                    <TableCell className="text-right">{b.total_units}</TableCell>
                    <TableCell className="text-right">{b.total_landlords}</TableCell>
                    <TableCell className="text-right font-medium">${b.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(b.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NachaFileHistory agencyId={agencyId} />

      <HAPBatchGenerator
        open={showGenerator}
        onOpenChange={setShowGenerator}
        agencyId={agencyId}
        onGenerate={createBatch}
        checkDuplicate={checkDuplicate}
      />
    </div>
  );
};

export default AgencyHAPBatching;
