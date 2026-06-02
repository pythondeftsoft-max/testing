import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, RefreshCw, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReconciliationItem {
  id: string;
  batchNumber: string;
  landlordId: string | null;
  landlordName: string;
  expectedAmount: number;
  actualAmount: number;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  status: 'matched' | 'discrepancy' | 'unexplained';
}

const HAPReconciliation: React.FC<{ agencyId: string }> = ({ agencyId }) => {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const monthStart = `${selectedMonth}-01`;
    const nextMonth = new Date(`${selectedMonth}-01`);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    // Fetch batches for this month
    const { data: batches } = await (supabase
      .from('hap_batches' as any)
      .select('id, batch_number')
      .eq('agency_id', agencyId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)) as any;

    if (!batches?.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const batchIds = batches.map((b: any) => b.id);
    const batchMap = Object.fromEntries(batches.map((b: any) => [b.id, b.batch_number]));

    const { data: batchItems } = await supabase
      .from('hap_batch_items')
      .select('*')
      .in('batch_id', batchIds)
      .order('landlord_id');

    // Fetch landlord names
    const landlordIds = [...new Set((batchItems || []).map(i => i.landlord_id).filter(Boolean))];
    let landlordMap: Record<string, string> = {};
    if (landlordIds.length) {
      const { data: landlords } = await supabase
        .from('agency_landlords')
        .select('id, landlord_name')
        .in('id', landlordIds);
      landlordMap = Object.fromEntries((landlords || []).map(l => [l.id, l.landlord_name]));
    }

    const mapped: ReconciliationItem[] = (batchItems || []).map(item => {
      const adj = Number(item.adjustment_amount) || 0;
      const expected = Number(item.hap_amount) || 0;
      const actual = Number(item.net_payment) || 0;
      const hasDiscrepancy = Math.abs(expected - actual) > 0.01;
      const unexplained = hasDiscrepancy && adj !== 0 && !item.adjustment_reason;

      return {
        id: item.id,
        batchNumber: batchMap[item.batch_id] || item.batch_id.slice(0, 8),
        landlordId: item.landlord_id,
        landlordName: item.landlord_id ? (landlordMap[item.landlord_id] || 'Unknown') : 'N/A',
        expectedAmount: expected,
        actualAmount: actual,
        adjustmentAmount: adj,
        adjustmentReason: item.adjustment_reason,
        status: unexplained ? 'unexplained' : hasDiscrepancy ? 'discrepancy' : 'matched',
      };
    });

    setItems(mapped);
    setLoading(false);
  }, [agencyId, selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const matched = items.filter(i => i.status === 'matched');
  const discrepancies = items.filter(i => i.status === 'discrepancy');
  const unexplained = items.filter(i => i.status === 'unexplained');
  const totalExpected = items.reduce((s, i) => s + i.expectedAmount, 0);
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0);

  const exportCSV = () => {
    if (!items.length) return;
    const headers = ['Batch', 'Landlord', 'Expected', 'Actual', 'Adjustment', 'Reason', 'Status'];
    const rows = items.map(i => [i.batchNumber, i.landlordName, i.expectedAmount, i.actualAmount, i.adjustmentAmount, i.adjustmentReason || '', i.status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hap-reconciliation-${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> HAP Payment Reconciliation
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={!items.length}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-lg font-bold">${totalExpected.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Expected</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-lg font-bold">${totalActual.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Actual</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-lg font-bold text-primary">{matched.length}</p>
                <p className="text-xs text-muted-foreground">Matched</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-lg font-bold text-destructive">{discrepancies.length + unexplained.length}</p>
                <p className="text-xs text-muted-foreground">Discrepancies</p>
              </div>
            </div>

            {unexplained.length > 0 && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <span className="text-sm font-medium text-destructive">
                  {unexplained.length} adjustment{unexplained.length > 1 ? 's' : ''} without reason — review required
                </span>
              </div>
            )}

            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{item.landlordName}</p>
                      <p className="text-xs text-muted-foreground">{item.batchNumber}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p>Expected: ${item.expectedAmount.toLocaleString()}</p>
                        <p>Actual: ${item.actualAmount.toLocaleString()}</p>
                      </div>
                      {item.status === 'matched' && (
                        <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Matched</Badge>
                      )}
                      {item.status === 'discrepancy' && (
                        <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> ${item.adjustmentAmount}</Badge>
                      )}
                      {item.status === 'unexplained' && (
                        <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> No Reason</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No HAP batch data for this month.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HAPReconciliation;
