import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { agencyId: string; taxYear: number; }

interface Variance {
  landlord_id: string;
  landlord_name?: string;
  authoritative_paid: number;
  accrued_in_batches: number;
  variance: number;
}

interface Result {
  landlord_count: number;
  total_paid: number;
  total_accrued: number;
  variance_count: number;
  variances: Variance[];
}

const Reconciliation1099Panel: React.FC<Props> = ({ agencyId, taxYear }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke('reconcile-1099-totals', {
      body: { agency_id: agencyId, tax_year: taxYear },
    });
    setLoading(false);
    if (error || !data?.success) {
      toast.error('Reconciliation failed: ' + (error?.message || data?.error));
      return;
    }
    setResult(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Scale className="w-4 h-4" /> 1099 Reconciliation Pre-Flight</CardTitle>
            <CardDescription className="text-xs">
              Compares paid disbursements vs. accrued batch items for {taxYear}. Flags landlords with variances {'>'}$1.
            </CardDescription>
          </div>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Run Check
          </Button>
        </div>
      </CardHeader>
      {result && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Landlords</div>
              <div className="text-xl font-semibold">{result.landlord_count}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Total Paid (1099 source)</div>
              <div className="text-xl font-semibold">${result.total_paid.toLocaleString()}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Total Accrued (batches)</div>
              <div className="text-xl font-semibold">${result.total_accrued.toLocaleString()}</div>
            </div>
          </div>

          {result.variance_count === 0 ? (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>No variances. Safe to generate 1099s.</AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {result.variance_count} landlord{result.variance_count === 1 ? '' : 's'} with variance — review before bulk send.
                </AlertDescription>
              </Alert>
              <div className="border rounded divide-y max-h-72 overflow-y-auto">
                {result.variances.map(v => (
                  <div key={v.landlord_id} className="p-2 text-xs flex items-center justify-between">
                    <div className="font-medium">{v.landlord_name || v.landlord_id.slice(0, 8)}</div>
                    <div className="flex gap-3 items-center">
                      <span>Paid <strong>${v.authoritative_paid.toFixed(2)}</strong></span>
                      <span className="text-muted-foreground">vs Accrued ${v.accrued_in_batches.toFixed(2)}</span>
                      <Badge variant="destructive">Δ ${v.variance.toFixed(2)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default Reconciliation1099Panel;
