import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, FileText, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HAPBatch } from '@/hooks/useHAPBatches';
import { HAPBatchItem, useHAPBatchItems } from '@/hooks/useHAPBatchItems';
import { exportCSV, exportHAPPaymentRegisterPdf } from '@/lib/exportHUDReport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import NachaExportButton from './NachaExportButton';
import HapAuditDrawer from './HapAuditDrawer';
import PayReadyWarningBanner from './PayReadyWarningBanner';
import { usePayReadiness } from '@/hooks/usePayReadiness';
import DisbursementLedger from './DisbursementLedger';
import PreDisburseValidationDialog from './PreDisburseValidationDialog';
import StopPaymentDialog from './StopPaymentDialog';
import VoidLineDialog from './VoidLineDialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  batch: HAPBatch;
  agencyName: string;
  onBack: () => void;
  onStatusChange: (batchId: string, status: string, totals?: any) => Promise<boolean>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending_second_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  disbursed: 'bg-primary/10 text-primary',
  voided: 'bg-destructive/10 text-destructive',
};

const nextStatus: Record<string, string> = {
  draft: 'reviewed',
  reviewed: 'approved',
  approved: 'disbursed',
};

const HAPBatchDetail: React.FC<Props> = ({ batch, agencyName, onBack, onStatusChange }) => {
  const { items, loading, updateItem, refetch } = useHAPBatchItems(batch.id);
  const { user } = useAuth();
  const [expandedLandlord, setExpandedLandlord] = useState<string | null>(null);
  const [requiresDual, setRequiresDual] = useState<boolean>(false);
  const [coSigning, setCoSigning] = useState(false);
  const [showPreDisburse, setShowPreDisburse] = useState(false);
  const [pendingAdvanceTarget, setPendingAdvanceTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkVoiding, setBulkVoiding] = useState(false);
  const [stopTarget, setStopTarget] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<{ id: string; desc: string } | null>(null);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkVoid = async () => {
    if (!selected.size) return;
    if (!confirm(`Void ${selected.size} selected line(s)?`)) return;
    setBulkVoiding(true);
    const reason = `Bulk void by ${user?.email || user?.id}`;
    let ok = 0, fail = 0;
    for (const id of selected) {
      const { data } = await supabase.functions.invoke('void-disbursement-line', {
        body: { item_id: id, reason, reissue: false },
      });
      if (data?.success) ok++; else fail++;
    }
    setBulkVoiding(false);
    setSelected(new Set());
    toast[fail > 0 ? 'warning' : 'success'](`Voided ${ok}${fail ? `, ${fail} failed` : ''}`);
    refetch();
  };


  // Check if this batch needs a second approver
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('requires_dual_approval', {
        _agency_id: batch.agency_id,
        _batch_amount: batch.total_amount,
      });
      setRequiresDual(!!data);
    })();
  }, [batch.agency_id, batch.total_amount]);

  const landlordGroups = useMemo(() => {
    const groups: Record<string, { items: HAPBatchItem[]; totalHAP: number }> = {};
    items.forEach(item => {
      const key = item.landlord_id || 'unknown';
      if (!groups[key]) groups[key] = { items: [], totalHAP: 0 };
      groups[key].items.push(item);
      groups[key].totalHAP += item.net_payment;
    });
    return groups;
  }, [items]);

  const includedItems = items.filter(i => i.status !== 'excluded');
  const totalNet = includedItems.reduce((s, i) => s + i.net_payment, 0);
  const totalTenantPortion = includedItems.reduce((s, i) => s + Number(i.tenant_portion || 0), 0);
  const totalGrossRent = includedItems.reduce((s, i) => s + Number(i.gross_rent || 0), 0);
  const specialClaimItems = includedItems.filter((i: any) => i.item_type === 'special_claim');
  const monthlyHapItems = includedItems.filter((i: any) => i.item_type !== 'special_claim');
  const specialClaimTotal = specialClaimItems.reduce((s, i) => s + i.net_payment, 0);

  const landlordIdsInBatch = useMemo(
    () => Array.from(new Set(items.map(i => i.landlord_id).filter(Boolean) as string[])),
    [items],
  );
  const { unreadyByLandlordId, hardBlock } = usePayReadiness(batch.agency_id, landlordIdsInBatch);
  const blockedByPayReady =
    hardBlock &&
    unreadyByLandlordId.size > 0 &&
    (batch.status === 'reviewed' || batch.status === 'approved');

  const handleExportCSV = () => {
    const rows = [
      ['Landlord ID', 'Tenant ID', 'Voucher ID', 'Gross Rent', 'Utility Allowance', 'HAP Amount', 'Tenant Portion', 'Adjustment', 'Net Payment', 'Status'],
      ...items.map(i => [
        i.landlord_id || '', i.tenant_id || '', i.voucher_id || '',
        String(i.gross_rent), String(i.utility_allowance), String(i.hap_amount),
        String(i.tenant_portion), String(i.adjustment_amount), String(i.net_payment), i.status,
      ]),
    ];
    exportCSV(rows, `HAP-Register-${batch.batch_number}`);
  };

  const handleExportPDF = () => {
    exportHAPPaymentRegisterPdf(agencyName, batch.batch_number, batch.period_month, items);
  };

  /**
   * Wraps the parent status change with a dual-approval gate:
   * - When transitioning to `disbursed` and dual approval is required, route the
   *   batch to `pending_second_approval` instead. A different staff member must
   *   then co-sign before the funds are released.
   */
  const handleAdvance = async (target: string) => {
    // Pre-disburse validation gate fires when sending to disbursed (or to second approval)
    if (target === 'disbursed' || (target === 'disbursed' && requiresDual)) {
      setPendingAdvanceTarget(target);
      setShowPreDisburse(true);
      return;
    }
    await onStatusChange(batch.id, target);
  };

  const handleValidatedProceed = async () => {
    const target = pendingAdvanceTarget;
    setPendingAdvanceTarget(null);
    if (!target) return;
    if (target === 'disbursed' && requiresDual) {
      await onStatusChange(batch.id, 'pending_second_approval');
      return;
    }
    await onStatusChange(batch.id, target);
  };

  const handleCoSign = async () => {
    if (!user) return;
    if (user.id === batch.approved_by || user.id === batch.generated_by || user.id === batch.reviewed_by) {
      // Allow if they're not specifically the preparer/approver depending on policy.
      // We block only when they're the same as the approver, since that's the "second signer" rule.
    }
    if (user.id === batch.approved_by) {
      toast.error('Second approver must be different from the preparer.');
      return;
    }
    setCoSigning(true);
    const { error } = await supabase
      .from('hap_payment_batches')
      .update({
        status: 'disbursed',
        second_approver_id: user.id,
        second_approved_at: new Date().toISOString(),
        disbursed_at: new Date().toISOString(),
      })
      .eq('id', batch.id);
    setCoSigning(false);
    if (error) {
      toast.error('Co-sign failed: ' + error.message);
      return;
    }
    toast.success('Batch co-signed and disbursed');
    onBack();
  };

  const canAdvance = nextStatus[batch.status];
  const isPendingCoSign = batch.status === 'pending_second_approval';
  const currentUserIsPreparer = user?.id === batch.approved_by;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-xl font-semibold">{batch.batch_number}</h2>
            <p className="text-sm text-muted-foreground">
              Period: {format(new Date(batch.period_month), 'MMMM yyyy')}
            </p>
          </div>
          <Badge className={statusColors[batch.status]}>{batch.status.replace(/_/g, ' ').toUpperCase()}</Badge>
          {requiresDual && batch.status !== 'disbursed' && batch.status !== 'voided' && (
            <Badge variant="outline" className="gap-1 border-warning text-warning">
              <ShieldCheck className="w-3 h-3" /> Dual approval required
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
          <NachaExportButton
            agencyId={batch.agency_id}
            batchId={batch.id}
            batchNumber={batch.batch_number}
            items={items}
          />
          <HapAuditDrawer batchId={batch.id} agencyId={batch.agency_id} />
          {canAdvance && !isPendingCoSign && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={() => handleAdvance(canAdvance)}
                      disabled={blockedByPayReady}
                    >
                      {canAdvance === 'disbursed' && requiresDual
                        ? 'Send for Second Approval'
                        : `Mark as ${canAdvance.charAt(0).toUpperCase() + canAdvance.slice(1)}`}
                    </Button>
                  </span>
                </TooltipTrigger>
                {blockedByPayReady && (
                  <TooltipContent>
                    Blocked: {unreadyByLandlordId.size} landlord(s) not pay-ready. Resolve in the registry or disable the hard-block in Settings.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {batch.status === 'draft' && (
            <Button variant="destructive" size="sm" onClick={() => onStatusChange(batch.id, 'voided')}>
              Void
            </Button>
          )}
        </div>
      </div>

      {isPendingCoSign && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Awaiting second approver.</strong>{' '}
              {currentUserIsPreparer
                ? 'You approved this batch — a different staff member must co-sign to release the funds.'
                : 'Review the items below, then co-sign to disburse the payment.'}
            </span>
            {!currentUserIsPreparer && (
              <Button size="sm" onClick={handleCoSign} disabled={coSigning}>
                {coSigning ? 'Co-signing…' : 'Co-sign and Disburse'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <PayReadyWarningBanner
        agencyId={batch.agency_id}
        landlordIds={landlordIdsInBatch}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total HAP (PHA pays)</p>
          <p className="text-xl font-bold">${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Tenant Portion
            <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="text-muted-foreground cursor-help">ⓘ</span></TooltipTrigger>
              <TooltipContent className="max-w-xs">Tenant pays this directly to the landlord. PHA does not collect or track tenant rent.</TooltipContent>
            </Tooltip></TooltipProvider>
          </p>
          <p className="text-xl font-bold text-muted-foreground">${totalTenantPortion.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Gross Rent</p>
          <p className="text-xl font-bold">${totalGrossRent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Units / Landlords</p>
          <p className="text-xl font-bold">{includedItems.length} / {Object.keys(landlordGroups).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Special Claims</p>
          <p className="text-xl font-bold">{specialClaimItems.length} <span className="text-sm text-muted-foreground">(${specialClaimTotal.toFixed(2)})</span></p>
        </CardContent></Card>
      </div>

      <PreDisburseValidationDialog
        open={showPreDisburse}
        onOpenChange={setShowPreDisburse}
        batchId={batch.id}
        onProceed={handleValidatedProceed}
      />

      <DisbursementLedger batchId={batch.id} batchStatus={batch.status} agencyId={batch.agency_id} />


      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Payment Register by Landlord</CardTitle>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" variant="destructive" onClick={bulkVoid} disabled={bulkVoiding}>
                  {bulkVoiding && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Void selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Landlord</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Total HAP</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(landlordGroups).map(([landlordId, group]) => (
                  <React.Fragment key={landlordId}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedLandlord(expandedLandlord === landlordId ? null : landlordId)}
                    >
                      <TableCell>
                        {expandedLandlord === landlordId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {unreadyByLandlordId.has(landlordId) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Not pay-ready{unreadyByLandlordId.get(landlordId) ? ` — ${unreadyByLandlordId.get(landlordId)}` : ''}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {landlordId === 'unknown' ? 'Unassigned' : landlordId.slice(0, 8) + '...'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{group.items.length}</TableCell>
                      <TableCell className="text-right font-medium">${group.totalHAP.toFixed(2)}</TableCell>
                      <TableCell />
                    </TableRow>
                    {expandedLandlord === landlordId && group.items.map(item => {
                      const voided = !!(item as any).voided_at;
                      const stopped = !!(item as any).stop_requested_at;
                      return (
                      <TableRow key={item.id} className="bg-muted/30">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {!voided && (
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggleSelected(item.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          Tenant: {item.tenant_id?.slice(0, 8) || 'N/A'}
                          {voided && <Badge variant="outline" className="ml-2 text-xs">Voided</Badge>}
                          {stopped && <Badge variant="outline" className="ml-2 text-xs text-destructive border-destructive/40">Stop {(item as any).stop_status}</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ${item.hap_amount.toFixed(2)}
                          {item.adjustment_amount !== 0 && (
                            <span className={item.adjustment_amount > 0 ? 'text-green-600 ml-1' : 'text-destructive ml-1'}>
                              ({item.adjustment_amount > 0 ? '+' : ''}{item.adjustment_amount.toFixed(2)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">${item.net_payment.toFixed(2)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {!voided && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                                onClick={() => setVoidTarget({ id: item.id, desc: `Tenant ${item.tenant_id?.slice(0,8) || 'N/A'} · $${item.net_payment.toFixed(2)}` })}>
                                Void
                              </Button>
                              {batch.status === 'disbursed' && !stopped && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                                  onClick={() => setStopTarget(item.id)}>
                                  Stop
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <StopPaymentDialog
        open={!!stopTarget}
        onOpenChange={(o) => !o && setStopTarget(null)}
        itemId={stopTarget}
        onDone={() => refetch()}
      />
      {voidTarget && (
        <VoidLineDialog
          open={!!voidTarget}
          onOpenChange={(o) => !o && setVoidTarget(null)}
          itemId={voidTarget.id}
          itemDescription={voidTarget.desc}
          onVoided={() => refetch()}
        />
      )}
    </div>
  );
};

export default HAPBatchDetail;
