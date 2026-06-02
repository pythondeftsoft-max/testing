import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function HudAdminFeesImporter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [effDate, setEffDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; matched: number; unmatched: number; message: string } | null>(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const csv = await file.text();
      const { data, error } = await supabase.functions.invoke('ingest-hud-admin-fees', {
        body: { csv, effective_date: effDate },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Import failed');
      setResult({ inserted: data.inserted, matched: data.matched, unmatched: data.unmatched, message: data.message });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      qc.invalidateQueries({ queryKey: ['pha-enrichment-coverage'] });
      toast({ title: 'Admin fees imported', description: `${data.inserted} rows · ${data.matched} matched` });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Import HUD Admin Fee Schedule</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Replaces $85/unit fallback estimates with official per-PHA admin budgets — the biggest unlock for SaaS wallet precision. Download the latest schedule from{' '}
          <a
            href="https://www.hud.gov/program_offices/public_indian_housing/programs/hcv/about/fees"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            HUD HCV admin fees <ExternalLink className="h-3 w-3" />
          </a>
          . Match is by PHA code. Expected columns: <code>pha_code</code>, <code>col_a_rate</code>, <code>col_b_rate</code>, optional <code>fmr_area</code>.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <Label htmlFor="admin-fee-csv" className="text-xs">CSV file</Label>
          <Input
            id="admin-fee-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="admin-fee-date" className="text-xs">Effective date</Label>
          <Input
            id="admin-fee-date"
            type="date"
            value={effDate}
            onChange={(e) => setEffDate(e.target.value)}
          />
        </div>
        <Button onClick={upload} disabled={!file || busy}>
          <Upload className="mr-1 h-4 w-4" />
          {busy ? 'Importing…' : 'Import'}
        </Button>
      </div>

      {result && (
        <Alert>
          {result.matched > 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription className="text-xs">{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
