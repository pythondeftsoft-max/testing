import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Send, Banknote, FileText, ClipboardList, Info } from 'lucide-react';
import { useHAPDisbursements, HAPDisbursement } from '@/hooks/useHAPDisbursements';
import { useAgencyPaymentSettings } from '@/hooks/useAgencyPaymentSettings';

interface Props { batchId: string; batchStatus: string; agencyId: string; }

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  bounced: 'bg-destructive/10 text-destructive',
  voided: 'bg-muted text-muted-foreground',
};

interface ReturnCode { code: string; label: string; retry_eligible: boolean; }

const RAIL_META: Record<string, { icon: any; buttonLabel: string; banner: string; }> = {
  nacha: {
    icon: Banknote,
    buttonLabel: 'Generate NACHA File & Create Ledger',
    banner: 'Upload the downloaded .ach file to your bank portal, then mark lines paid as they clear.',
  },
  manual: {
    icon: ClipboardList,
    buttonLabel: 'Record Manual Payments',
    banner: 'Record each payment method and reference number as you cut checks, send Zelle, or wire funds.',
  },
  ap_export: {
    icon: FileText,
    buttonLabel: 'Export to AP System & Create Ledger',
    banner: 'Import the downloaded file into your AP system (Yardi/QuickBooks/CSV), then mark paid when checks cut.',
  },
};

const DisbursementLedger: React.FC<Props> = ({ batchId, batchStatus, agencyId }) => {
  const { settings } = useAgencyPaymentSettings(agencyId);
  const { disbursements, loading, disburse, markPaid, markBatchPaid, markBounced } = useHAPDisbursements(batchId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [bounceTarget, setBounceTarget] = useState<HAPDisbursement | null>(null);
  const [bounceCode, setBounceCode] = useState('');
  const [bounceFreeText, setBounceFreeText] = useState('');
  const [returnCodes, setReturnCodes] = useState<ReturnCode[]>([]);

  const rail = settings?.primary_rail || 'nacha';
  const meta = RAIL_META[rail] || RAIL_META.nacha;
  const Icon = meta.icon;

  useEffect(() => {
    (supabase as any)
      .from('nacha_return_codes')
      .select('code, label, retry_eligible')
      .order('code')
      .then(({ data }: { data: ReturnCode[] | null }) => setReturnCodes(data || []));
  }, []);

  const { pendingCount, paidTotal } = useMemo(() => {
    let p = 0, t = 0;
    for (const d of disbursements) {
      if (d.status === 'pending') p++;
      if (d.status === 'paid') t += Number(d.amount);
    }
    return { pendingCount: p, paidTotal: t };
  }, [disbursements]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleDisburse = async () => {
    setWorking(true);
    await disburse();
    setWorking(false);
  };

  const handleMarkSelected = async () => {
    setWorking(true);
    await markPaid(Array.from(selected));
    setSelected(new Set());
    setWorking(false);
  };

  const handleMarkAll = async () => {
    setWorking(true);
    await markBatchPaid();
    setSelected(new Set());
    setWorking(false);
  };

  const handleBounce = async () => {
    if (!bounceTarget) return;
    const reason = bounceCode
      ? `${bounceCode}${bounceFreeText ? ` — ${bounceFreeText}` : ''}`
      : bounceFreeText;
    if (!reason) return;
    setWorking(true);
    await markBounced(bounceTarget.id, reason);
    setBounceTarget(null);
    setBounceCode('');
    setBounceFreeText('');
    setWorking(false);
  };

  if (disbursements.length === 0 && !loading) {
    if (batchStatus !== 'approved' && batchStatus !== 'disbursed') return null;
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Icon className="w-4 h-4" /> Disbursement Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate the disbursement ledger for this batch using your <strong>{rail.toUpperCase()}</strong> rail.
            One line will be created per landlord.
          </p>
          <Button onClick={handleDisburse} disabled={working}>
            {working ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {meta.buttonLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Icon className="w-4 h-4" /> Disbursement Ledger</CardTitle>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button size="sm" variant="outline" onClick={handleMarkSelected} disabled={working}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Mark {selected.size} Paid
              </Button>
            )}
            {pendingCount > 0 && (
              <Button size="sm" onClick={handleMarkAll} disabled={working}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Entire Batch Paid
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <>
            {pendingCount > 0 && (
              <Alert className="mb-3">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs">{meta.banner}</AlertDescription>
              </Alert>
            )}
            <div className="text-sm text-muted-foreground mb-3">
              {pendingCount} pending • ${paidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} paid
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Landlord</TableHead>
                  <TableHead>Rail</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {d.status === 'pending' && (
                        <Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggle(d.id)} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.landlord_id?.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="outline">{d.rail}</Badge></TableCell>
                    <TableCell className="text-right font-medium">${Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge className={statusColors[d.status]}>{d.status}</Badge></TableCell>
                    <TableCell className="text-xs">{d.reference_number || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.paid_at ? format(new Date(d.paid_at), 'MMM d') : '—'}
                    </TableCell>
                    <TableCell>
                      {d.status === 'pending' && (
                        <Button size="sm" variant="ghost" onClick={() => setBounceTarget(d)}>
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>

      <Dialog open={!!bounceTarget} onOpenChange={(o) => { if (!o) { setBounceTarget(null); setBounceCode(''); setBounceFreeText(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Bounced</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {rail === 'nacha' && (
              <div className="space-y-2">
                <Label>ACH Return Code</Label>
                <Select value={bounceCode} onValueChange={setBounceCode}>
                  <SelectTrigger><SelectValue placeholder="Select return code" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {returnCodes.map(rc => (
                      <SelectItem key={rc.code} value={rc.code}>
                        <span className="font-mono mr-2">{rc.code}</span>{rc.label}
                        {rc.retry_eligible && <Badge variant="outline" className="ml-2 text-[10px]">retry-ok</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{rail === 'nacha' ? 'Additional notes (optional)' : 'Reason'}</Label>
              <Input
                value={bounceFreeText}
                onChange={(e) => setBounceFreeText(e.target.value)}
                placeholder={rail === 'manual' ? 'Stale check, lost in mail, etc.' : 'Optional context'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBounceTarget(null)}>Cancel</Button>
            <Button onClick={handleBounce} disabled={(!bounceCode && !bounceFreeText) || working}>Mark Bounced</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DisbursementLedger;
