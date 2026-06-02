import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function HudCsvImporter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matched: number; unmatched: number; updated: number } | null>(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const csv = await file.text();
      const { data, error } = await supabase.functions.invoke('import-hud-pha-data', {
        body: { csv },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Import failed');
      setResult({ matched: data.matched, unmatched: data.unmatched, updated: data.updated });
      qc.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast({ title: 'Import complete', description: `${data.updated} PHAs updated` });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Import HUD Picture of Subsidized Households</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Download the latest CSV from{' '}
          <a
            href="https://www.huduser.gov/portal/datasets/assthsg.html"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            huduser.gov
          </a>
          . Match is by PHA code. Expected columns: <code>pha_code</code>, <code>total_units</code> /{' '}
          <code>vouchers</code>, <code>semap_score</code>, <code>mtw</code>, <code>ed_name</code>,{' '}
          <code>ed_email</code>, <code>ed_phone</code>.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="hud-csv" className="text-xs">CSV file</Label>
          <Input
            id="hud-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
          <AlertDescription className="text-xs">
            Matched {result.matched.toLocaleString()} · Updated {result.updated.toLocaleString()} ·
            Unmatched {result.unmatched.toLocaleString()}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
