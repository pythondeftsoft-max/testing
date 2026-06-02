import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/DatePicker';
import { Landmark, FileUp, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import ProofUploader from './ProofUploader';
import ProofSelector, { type PlaidTransaction } from './ProofSelector';
import MonthGrid from './MonthGrid';

export interface LogPaymentSubmitData {
  months: Array<{ month: number; year: number }>;
  payment_date?: string;
  notes?: string;
  proofFile?: File;
  plaid_transaction_id?: string;
  plaid_transaction_data?: PlaidTransaction;
}

interface LogPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalAddress: string;
  defaultRent: number;
  defaultCurrency: string;
  defaultLandlord: string;
  onSubmit: (data: LogPaymentSubmitData) => Promise<void> | void;
  isPending: boolean;
  hasLinkedBank?: boolean;
  trackingStats?: { tracked: number; total: number; bankCount: number; fileCount: number; platformCount: number } | null;
  rentalStartMonth?: number;
  rentalStartYear?: number;
  rentalEndMonth?: number;
  rentalEndYear?: number;
  trackedMonths?: Set<string>;
}

const LogPaymentDialog = ({
  open, onOpenChange, rentalAddress, defaultRent, defaultCurrency, defaultLandlord,
  onSubmit, isPending, hasLinkedBank = false, trackingStats,
  rentalStartMonth, rentalStartYear, rentalEndMonth, rentalEndYear, trackedMonths,
}: LogPaymentDialogProps) => {
  const now = new Date();
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(now);
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<PlaidTransaction | null>(null);
  const [plaidOpen, setPlaidOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>(hasLinkedBank ? 'upload' : 'bank');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasMonthGrid = !!(rentalStartMonth && rentalStartYear && trackedMonths);
  const effectiveEndMonth = rentalEndMonth || (now.getMonth() + 1);
  const effectiveEndYear = rentalEndYear || now.getFullYear();

  const handleToggleMonth = (key: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllUntracked = () => {
    if (!rentalStartMonth || !rentalStartYear || !trackedMonths) return;
    // Generate all keys
    const allKeys: string[] = [];
    let y = rentalStartYear, m = rentalStartMonth;
    const endVal = effectiveEndYear * 12 + effectiveEndMonth;
    while (y * 12 + m <= endVal) {
      allKeys.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    const untrackedKeys = allKeys.filter(k => !trackedMonths.has(k));
    const allSelected = untrackedKeys.every(k => selectedMonths.has(k));
    if (allSelected) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(untrackedKeys));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === 'upload' && hasMonthGrid) {
        const months = Array.from(selectedMonths).map(key => {
          const [y, m] = key.split('-').map(Number);
          return { month: m, year: y };
        });
        if (months.length === 0) { setIsSubmitting(false); return; }
        await onSubmit({
          months,
          notes: notes.trim() || undefined,
          proofFile: proofFile || undefined,
        });
      } else {
        const date = paymentDate || now;
        await onSubmit({
          months: [{ month: date.getMonth() + 1, year: date.getFullYear() }],
          payment_date: date.toISOString().split('T')[0],
          notes: notes.trim() || undefined,
          proofFile: proofFile || undefined,
          plaid_transaction_id: selectedTransaction?.transaction_id || undefined,
          plaid_transaction_data: selectedTransaction || undefined,
        });
      }
      // Only reset and close after successful save
      setNotes('');
      setProofFile(null);
      setSelectedTransaction(null);
      setSelectedMonths(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadDisabled = activeTab === 'upload' && hasMonthGrid && selectedMonths.size === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!plaidOpen) onOpenChange(v); }} modal={!plaidOpen}>
      <DialogContent className="sm:max-w-2xl" disableFocusTrap={plaidOpen} onInteractOutside={!plaidOpen ? undefined : (e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-1">
          <p className="text-sm text-muted-foreground">{rentalAddress}</p>

          {trackingStats && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {trackingStats.tracked} of {trackingStats.total} months tracked
                  {(() => {
                    const parts: string[] = [];
                    if (trackingStats.bankCount > 0) parts.push(`${trackingStats.bankCount} bank`);
                    if (trackingStats.fileCount > 0) parts.push(`${trackingStats.fileCount} uploaded`);
                    if (trackingStats.platformCount > 0) parts.push(`${trackingStats.platformCount} platform`);
                    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
                  })()}
                </span>
                <span className="text-muted-foreground">{Math.round((trackingStats.tracked / trackingStats.total) * 100)}%</span>
              </div>
              <Progress value={(trackingStats.tracked / trackingStats.total) * 100} className="h-2" />
              {trackingStats.tracked < trackingStats.total && (
                <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>
                    {hasLinkedBank
                      ? 'Your linked bank tracks payments going forward. To verify earlier months, upload a receipt or statement below.'
                      : 'Link your bank to track future payments automatically, or upload proof for past months below.'}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted/50 text-sm">
              Amount: <span className="font-semibold">{defaultCurrency} {defaultRent.toLocaleString()}</span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="gap-1.5">
                  <FileUp className="h-3.5 w-3.5" />
                  Upload Proof
                </TabsTrigger>
                <TabsTrigger value="bank" className="gap-1.5">
                  <Landmark className="h-3.5 w-3.5" />
                  Bank Tracking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 mt-4">
                <p className="text-xs text-muted-foreground">
                  Upload a rent receipt or bank statement as proof. One upload can cover multiple months.
                </p>
                {hasMonthGrid ? (
                  <MonthGrid
                    startMonth={rentalStartMonth!}
                    startYear={rentalStartYear!}
                    endMonth={effectiveEndMonth}
                    endYear={effectiveEndYear}
                    trackedMonths={trackedMonths!}
                    selectedMonths={selectedMonths}
                    onToggle={handleToggleMonth}
                    onSelectAllUntracked={handleSelectAllUntracked}
                  />
                ) : (
                  <div>
                    <Label>Date</Label>
                    <DatePicker date={paymentDate} onDateChange={setPaymentDate} />
                  </div>
                )}
                <ProofUploader file={proofFile} onFileChange={setProofFile} />
                <p className="text-[11px] text-muted-foreground">
                  Accepted: rent receipts, bank statements, lease agreements (PDF, JPEG, PNG)
                </p>
              </TabsContent>

              <TabsContent value="bank" className="space-y-3 mt-4">
                <div>
                  <Label>Date</Label>
                  <DatePicker date={paymentDate} onDateChange={setPaymentDate} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasLinkedBank
                    ? 'Your bank is linked and tracking rent going forward. You can also select a specific transaction below.'
                    : 'Link your bank to automatically track rent going forward. Future payments will be detected and logged for you.'}
                </p>
                <ProofSelector
                  monthlyRent={defaultRent}
                  selectedTransaction={selectedTransaction}
                  onSelect={setSelectedTransaction}
                  onPlaidOpen={() => setPlaidOpen(true)}
                  onPlaidClose={() => setPlaidOpen(false)}
                  hideInfoCard={hasLinkedBank}
                />
              </TabsContent>
            </Tabs>

            {activeTab === 'bank' && (
              <div>
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any notes about this payment..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            )}
            {activeTab === 'upload' && (
              <div>
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any notes about this payment..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || isSubmitting || uploadDisabled}>
            {(isPending || isSubmitting) ? 'Saving...' : uploadDisabled ? 'Select months' : activeTab === 'upload' && selectedMonths.size > 1 ? `Log ${selectedMonths.size} Months` : 'Log Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogPaymentDialog;
