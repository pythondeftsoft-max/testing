import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNachaSettings } from '@/hooks/useNachaSettings';
import type { HAPBatchItem } from '@/hooks/useHAPBatchItems';

interface Props {
  agencyId: string;
  batchId: string;
  batchNumber: string;
  items: HAPBatchItem[];
}

const NachaExportButton: React.FC<Props> = ({ agencyId, batchId, batchNumber, items }) => {
  const { settings } = useNachaSettings(agencyId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  });

  const isConfigured = !!(settings?.odfi_routing_number && settings?.originator_company_id && settings?.originator_company_name);

  const summary = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const it of items) {
      if (it.status === 'excluded' || !it.landlord_id) continue;
      grouped.set(it.landlord_id, (grouped.get(it.landlord_id) || 0) + Math.round((Number(it.net_payment) || 0) * 100));
    }
    const totalCents = Array.from(grouped.values()).reduce((s, v) => s + v, 0);
    return { landlords: grouped.size, totalCents };
  }, [items]);

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!isConfigured) {
      toast.error('Configure NACHA settings first');
      return;
    }
    if (summary.landlords === 0) {
      toast.error('No payable items in this batch');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-nacha-file', {
        body: { batch_id: batchId, effective_date: effectiveDate },
      });
      if (error) {
        toast.error('NACHA export failed: ' + error.message);
        return;
      }
      if (!data?.success) {
        toast.error(data?.error || 'NACHA export failed');
        return;
      }
      downloadFile(data.file_content, data.file_name);
      const skipped = (data.missing_landlords || []).length;
      if (skipped > 0) {
        toast.warning(`File generated with ${data.total_entries} entries — ${skipped} landlord(s) skipped (missing bank info)`);
      } else {
        toast.success(`NACHA file generated (${data.total_entries} entries, $${(data.total_credit_cents / 100).toFixed(2)})`);
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate NACHA file');
    } finally {
      setLoading(false);
    }
  };

  if (!settings?.is_active) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Banknote className="w-4 h-4 mr-1" /> Export NACHA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate NACHA ACH File — {batchNumber}</DialogTitle>
            <DialogDescription>
              Bank credentials are decrypted server-side from the PII vault and never touch the browser.
            </DialogDescription>
          </DialogHeader>

          {!isConfigured ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                NACHA settings are not fully configured. Open <strong>Agency Settings → NACHA</strong> to
                add your bank's ODFI routing, company ID, and originator name.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Routing &amp; account numbers are pulled from the encrypted vault for each landlord.
                  Any landlord missing bank info will be reported and skipped.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Effective Entry Date</Label>
                  <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                </div>
                <div>
                  <Label>Total Credit</Label>
                  <Input value={`$${(summary.totalCents / 100).toFixed(2)}`} disabled />
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {summary.landlords} landlord(s) payable in this batch.
              </div>

              {settings.test_mode && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Test mode is on.</strong> File will be tagged "-TEST" — for bank pre-note validation only.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={loading || !isConfigured || summary.landlords === 0}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : 'Generate & Download .ach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NachaExportButton;
