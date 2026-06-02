import React, { useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, RefreshCw, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVMSSubmissions, VMSSubmission } from '@/hooks/useVMSSubmissions';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  agencyId: string;
}

const statusBadge = (status: string) => {
  if (status === 'submitted') return <Badge className="bg-primary/10 text-primary">Submitted</Badge>;
  if (status === 'accepted') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Accepted</Badge>;
  return <Badge variant="outline">Draft</Badge>;
};

const VMSSubmissionsTab: React.FC<Props> = ({ agencyId }) => {
  const { data: submissions, isLoading } = useVMSSubmissions(agencyId);
  const qc = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);
  const [csvCache, setCsvCache] = useState<Record<string, { csv: string; filename: string }>>({});

  // Build last 12 months suggestion
  const suggestedPeriods = React.useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 12; i++) {
      result.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd'));
    }
    return result;
  }, []);

  const submissionByPeriod = React.useMemo(() => {
    const m = new Map<string, VMSSubmission>();
    (submissions || []).forEach(s => m.set(s.period_month, s));
    return m;
  }, [submissions]);

  const handleGenerate = async (period: string) => {
    setGenerating(period);
    const { data, error } = await supabase.functions.invoke('generate-vms-submission', {
      body: { agency_id: agencyId, period_month: period },
    });
    setGenerating(null);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || 'Failed to generate VMS submission');
      return;
    }
    toast.success(`VMS aggregates generated for ${format(new Date(period), 'MMM yyyy')}`);
    if (data.warnings?.length) {
      data.warnings.forEach((w: string) => toast.warning(w));
    }
    setCsvCache(prev => ({ ...prev, [period]: { csv: data.csv, filename: data.filename } }));
    qc.invalidateQueries({ queryKey: ['vms-submissions', agencyId] });
  };

  const handleDownload = (period: string) => {
    const cached = csvCache[period];
    if (!cached) {
      toast.error('Regenerate first to refresh the CSV');
      return;
    }
    const blob = new Blob([cached.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cached.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkSubmitted = async (id: string) => {
    const { error } = await supabase
      .from('agency_vms_submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to mark submitted');
      return;
    }
    toast.success('Marked as submitted to HUD VMS');
    qc.invalidateQueries({ queryKey: ['vms-submissions', agencyId] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" /> HUD VMS Submissions
        </CardTitle>
        <CardDescription>
          Monthly Voucher Management System submissions. Aggregates units leased, HAP expense, admin fees, FSS escrow, and porting activity from disbursed payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            VMS reflects only <strong>disbursed</strong> payments for the period. Generate at month-end after all HAP batches are paid. HUD requires submission within 15 days of month-end.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Units Leased</TableHead>
                <TableHead className="text-right">HAP Expense</TableHead>
                <TableHead className="text-right">Admin Fee</TableHead>
                <TableHead className="text-right">FSS Escrow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestedPeriods.map(period => {
                const sub = submissionByPeriod.get(period);
                const isGenerating = generating === period;
                const hasCSV = !!csvCache[period];
                return (
                  <TableRow key={period}>
                    <TableCell className="font-medium">{format(new Date(period), 'MMMM yyyy')}</TableCell>
                    <TableCell className="text-right">{sub?.units_leased ?? '—'}</TableCell>
                    <TableCell className="text-right">{sub ? `$${Number(sub.hap_expense).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</TableCell>
                    <TableCell className="text-right">{sub ? `$${Number(sub.admin_fee_earned).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</TableCell>
                    <TableCell className="text-right">{sub ? `$${Number(sub.fss_escrow_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</TableCell>
                    <TableCell>{sub ? statusBadge(sub.status) : <Badge variant="outline" className="text-muted-foreground">Not generated</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleGenerate(period)} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span className="ml-1">{sub ? 'Refresh' : 'Generate'}</span>
                      </Button>
                      {hasCSV && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(period)}>
                          <Download className="w-3 h-3 mr-1" /> CSV
                        </Button>
                      )}
                      {sub && sub.status === 'draft' && (
                        <Button size="sm" onClick={() => handleMarkSubmitted(sub.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Submitted
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default VMSSubmissionsTab;
