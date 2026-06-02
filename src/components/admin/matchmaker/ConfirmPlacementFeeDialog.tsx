import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePipelineActions } from '@/hooks/usePipelineActions';
import { useRecordPlacementFeePayment } from '@/hooks/useRecordPlacementFeePayment';
import { useUnmatchedTransactions } from '@/hooks/useAdminTransactions';
import { BankAccountSelector } from '@/components/checkbook/BankAccountSelector';
import { SelectTransactionDialog } from './SelectTransactionDialog';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign, CreditCard, Building2, Link as LinkIcon, CheckCircle2, Copy, ExternalLink, Pencil, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface ConfirmPlacementFeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'tenant' | 'property';
  entityId: string;
  entityName: string;
  placementFeeAmount?: number;
  monthlyRent?: number;
  feePercent?: number;
  applicationId?: string;
  tenantId?: string;
  propertyId?: string;
  unitId?: string;
}

type PaymentMethod = 'stripe' | 'plaid' | 'other';

export const ConfirmPlacementFeeDialog = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  placementFeeAmount = 0,
  monthlyRent: monthlyRentProp,
  feePercent: feePercentProp,
  applicationId,
  tenantId,
  propertyId,
  unitId,
}: ConfirmPlacementFeeDialogProps) => {
  // Derive original rent / pct fallbacks
  const originalFeePercent =
    feePercentProp ??
    (monthlyRentProp && monthlyRentProp > 0 && placementFeeAmount > 0
      ? Math.round((placementFeeAmount / monthlyRentProp) * 100)
      : 40);
  const originalMonthlyRent =
    monthlyRentProp ??
    (placementFeeAmount > 0 && originalFeePercent > 0
      ? Math.round((placementFeeAmount / originalFeePercent) * 100)
      : 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('plaid');
  const [notes, setNotes] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [isExistingLink, setIsExistingLink] = useState(false);
  // Saved (active) values — what handlers use
  const [monthlyRent, setMonthlyRent] = useState<number>(originalMonthlyRent);
  const [feePercent, setFeePercent] = useState<number>(originalFeePercent);
  // Draft values — what the inputs in edit mode bind to
  const [draftMonthlyRent, setDraftMonthlyRent] = useState<number>(originalMonthlyRent);
  const [draftFeePercent, setDraftFeePercent] = useState<number>(originalFeePercent);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const queryClient = useQueryClient();
  const { markAsPaid } = usePipelineActions();
  const { mutate: recordPlacementFeePayment, isPending: isRecordingPayment } = useRecordPlacementFeePayment();

  const effectiveFeeAmount = Math.max(
    0,
    Math.round((Number(monthlyRent) || 0) * (Number(feePercent) || 0) / 100)
  );
  const isAmountChanged = effectiveFeeAmount !== placementFeeAmount;
  const isFeeDirty =
    draftMonthlyRent !== monthlyRent || draftFeePercent !== feePercent;
  const isDraftValid =
    Number(draftMonthlyRent) > 0 &&
    Number(draftFeePercent) >= 0 &&
    Number(draftFeePercent) <= 100;
  const blockActionsForUnsavedFee = isEditingFee && isFeeDirty;
  
  // Fetch unmatched transactions for selected bank account
  const { data: unmatchedTransactions, isLoading: isLoadingTransactions } = useUnmatchedTransactions(
    selectedBankAccountId || undefined
  );

  // Effect A: Always load existing pending Stripe link when dialog opens
  // (regardless of selected payment method) so the link persists across reopens.
  useEffect(() => {
    if (!isOpen || !tenantId || !propertyId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('landlord_placement_fees')
          .select('stripe_checkout_url, stripe_checkout_created_at')
          .eq('tenant_id', tenantId)
          .eq('property_id', propertyId)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        const row = data?.[0];
        if (!cancelled && row?.stripe_checkout_url) {
          setStripeCheckoutUrl(row.stripe_checkout_url);
          setIsExistingLink(true);
        }
      } catch (error) {
        console.error('Error loading existing payment link:', error);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, tenantId, propertyId]);

  // Effect: When dialog opens, hydrate rent + fee % from the unit so any saved
  // override (placement_fee_percent_override / updated monthly_rent) sticks
  // across reopens and refreshes.
  useEffect(() => {
    if (!isOpen || !unitId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('property_units')
          .select('monthly_rent, placement_fee_percent_override')
          .eq('id', unitId)
          .maybeSingle();
        if (error || !data || cancelled) return;
        const savedRent = Number((data as any).monthly_rent) || 0;
        const savedPct =
          (data as any).placement_fee_percent_override != null
            ? Number((data as any).placement_fee_percent_override)
            : null;
        if (savedRent > 0) {
          setMonthlyRent(savedRent);
          setDraftMonthlyRent(savedRent);
        }
        if (savedPct != null) {
          setFeePercent(savedPct);
          setDraftFeePercent(savedPct);
        }
      } catch (e) {
        console.error('Failed to hydrate placement fee from unit:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, unitId]);

  // Effect B: When user selects Stripe and no link exists yet, auto-generate one.
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'stripe' || !tenantId || !propertyId) return;
    if (stripeCheckoutUrl || isGeneratingLink) return;
    if (blockActionsForUnsavedFee) return;
    handleGenerateStripeLink(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentMethod, tenantId, propertyId, stripeCheckoutUrl, blockActionsForUnsavedFee]);

  const handleReset = () => {
    setPaymentMethod('plaid');
    setNotes('');
    setSelectedBankAccountId('');
    setSelectedTransactionId('');
    setIsTransactionDialogOpen(false);
    setStripeCheckoutUrl(null);
    setIsExistingLink(false);
    setMonthlyRent(originalMonthlyRent);
    setFeePercent(originalFeePercent);
    setDraftMonthlyRent(originalMonthlyRent);
    setDraftFeePercent(originalFeePercent);
    setIsEditingFee(false);
  };

  const handleSaveFeeEdit = async () => {
    if (!isDraftValid) {
      toast.error('Enter a valid rent and fee % (0–100).');
      return;
    }
    if (!unitId) {
      // No unit context — fall back to in-memory save only
      setMonthlyRent(draftMonthlyRent);
      setFeePercent(draftFeePercent);
      setIsEditingFee(false);
      toast.warning('Saved for this transaction only (no unit linked).');
      return;
    }
    setIsSavingFee(true);
    try {
      const { error } = await supabase
        .from('property_units')
        .update({
          monthly_rent: draftMonthlyRent,
          placement_fee_percent_override: draftFeePercent,
        } as any)
        .eq('id', unitId);
      if (error) throw error;
      setMonthlyRent(draftMonthlyRent);
      setFeePercent(draftFeePercent);
      setIsEditingFee(false);
      // Invalidate dependent queries so the pipeline reflects new values
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      queryClient.invalidateQueries({ queryKey: ['property-pipeline'] });
      toast.success('Placement fee updated for this unit.');
    } catch (err: any) {
      console.error('Failed to save placement fee:', err);
      toast.error(err?.message || 'Failed to save placement fee');
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleResetFeeEdit = () => {
    setDraftMonthlyRent(originalMonthlyRent);
    setDraftFeePercent(originalFeePercent);
  };

  const selectedTransaction = unmatchedTransactions?.find(t => t.id === selectedTransactionId);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleGenerateStripeLink = async (forceNew = false) => {
    if (!propertyId || !tenantId) {
      toast.error('Missing required information to generate payment link');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-placement-fee-payment', {
        body: {
          applicationId,
          propertyId,
          tenantId,
          amount: effectiveFeeAmount,
          propertyAddress: entityName,
          forceNew,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.paymentUrl) {
        setStripeCheckoutUrl(data.paymentUrl);
        setIsExistingLink(data.isExisting || false);

        // Clipboard write is best-effort — browsers block it when the document
        // isn't focused (DevTools open, alt-tabbed, etc.). Don't let a clipboard
        // failure look like a link-generation failure.
        let copied = false;
        try {
          await navigator.clipboard.writeText(data.paymentUrl);
          copied = true;
        } catch (clipErr) {
          console.warn('Clipboard write blocked:', clipErr);
        }

        if (copied) {
          toast.success(
            data.isExisting
              ? 'Existing payment link copied to clipboard!'
              : 'New payment link generated and copied to clipboard!'
          );
        } else {
          toast.success(
            data.isExisting
              ? 'Existing payment link ready — use Copy Link to copy.'
              : 'New payment link generated — use Copy Link to copy.'
          );
        }
      }
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      const msg = error?.context?.error || error?.message || 'Unknown error';
      toast.error(`Failed to generate payment link: ${msg}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyStripeLink = async () => {
    if (!stripeCheckoutUrl) return;
    try {
      await navigator.clipboard.writeText(stripeCheckoutUrl);
      toast.success('Payment link copied to clipboard');
    } catch (err) {
      console.warn('Clipboard write blocked:', err);
      toast.warning('Could not auto-copy. Please copy the link manually.');
    }
  };

  const handleOpenStripeLink = () => {
    if (stripeCheckoutUrl) {
      window.open(stripeCheckoutUrl, '_blank');
    }
  };

  const handleConfirm = async () => {
    // For Plaid payments, we need different validation
    if (paymentMethod === 'plaid') {
      if (!tenantId || !unitId || !propertyId) {
        toast.error('Missing required tenant or property information');
        return;
      }
      // applicationId not required for Plaid
    } else {
      // For other payment methods, we need applicationId and tenantId
      if (!applicationId || !tenantId) {
        toast.error('Missing required information');
        return;
      }
    }

    try {
      // Use enhanced edge function for Plaid payments
      if (paymentMethod === 'plaid') {
        if (!selectedBankAccountId) {
          toast.error('Please select a bank account');
          return;
        }

        if (!unitId || !propertyId) {
          toast.error('Missing property information');
          return;
        }

        await recordPlacementFeePayment({
          applicationId,
          unitId,
          tenantId,
          propertyId,
          feeAmount: effectiveFeeAmount,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'plaid',
          bankAccountId: selectedBankAccountId,
          plaidTransactionId: selectedTransactionId || undefined,
          notes,
        });
      } else {
        // Use simple markAsPaid for other payment methods
        await markAsPaid.mutateAsync({
          entityType,
          entityId,
          paymentAmount: effectiveFeeAmount,
          paymentMethod,
          paymentNotes: notes,
          applicationId,
        });
      }

      handleClose();
    } catch (error) {
      // Error handled in the mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Confirm Placement Fee Payment
          </DialogTitle>
          <DialogDescription>
            Record placement fee payment for {entityType === 'tenant' ? 'tenant' : 'property'}: <strong>{entityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Payment Amount & Stripe */}
            <div className="space-y-4">
              {/* Payment Amount (editable) */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Placement Fee</span>
                  {isEditingFee ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleSaveFeeEdit}
                        disabled={!isDraftValid || !isFeeDirty || isSavingFee}
                      >
                        {isSavingFee ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleResetFeeEdit}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setDraftMonthlyRent(monthlyRent);
                        setDraftFeePercent(feePercent);
                        setIsEditingFee(true);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {isEditingFee ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="monthly-rent" className="text-xs">Approved Monthly Rent</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="monthly-rent"
                            type="number"
                            min={0}
                            step={1}
                            value={draftMonthlyRent || ''}
                            onChange={(e) => setDraftMonthlyRent(parseInt(e.target.value) || 0)}
                            className="pl-6 h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fee-percent" className="text-xs">Fee %</Label>
                        <div className="relative">
                          <Input
                            id="fee-percent"
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={draftFeePercent || ''}
                            onChange={(e) => setDraftFeePercent(parseFloat(e.target.value) || 0)}
                            className="pr-6 h-9"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-medium">
                        New Fee Amount {isFeeDirty && <span className="text-amber-600">(unsaved)</span>}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        ${Math.max(0, Math.round((Number(draftMonthlyRent) || 0) * (Number(draftFeePercent) || 0) / 100)).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isFeeDirty
                        ? 'Click Save to apply these changes to this transaction.'
                        : 'Update if the signed/approved rent differs from the listed rent.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fee Amount</span>
                      <span className="text-2xl font-bold text-primary">
                        ${effectiveFeeAmount.toLocaleString()}
                      </span>
                    </div>
                    {monthlyRent > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {feePercent}% of ${monthlyRent.toLocaleString()}/mo
                      </p>
                    )}
                  </div>
                )}

                {isAmountChanged && stripeCheckoutUrl && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Pending payment link is for ${placementFeeAmount.toLocaleString()}. Click "New" below to replace it with the updated ${effectiveFeeAmount.toLocaleString()} amount.
                    </p>
                  </div>
                )}
              </div>

              {/* Generate Stripe Link Button / Display Existing Link */}
              <div className="space-y-2">
                {stripeCheckoutUrl ? (
                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-1">
                          OpenKey payment link sent - awaiting payment
                        </p>
                        <p className="text-xs text-muted-foreground break-all font-mono">
                          {stripeCheckoutUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyStripeLink}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenStripeLink}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateStripeLink(true)}
                        disabled={isGeneratingLink}
                      >
                        {isGeneratingLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'New'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateStripeLink(false)}
                      disabled={isGeneratingLink || !applicationId || blockActionsForUnsavedFee}
                    >
                      {isGeneratingLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Link...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Generate Stripe Payment Link
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {blockActionsForUnsavedFee
                        ? 'Save your fee changes first.'
                        : 'Send this link to the landlord to collect payment online'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Payment Method & Notes */}
            <div className="space-y-4">
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="plaid" id="plaid" />
                      <Label htmlFor="plaid" className="flex items-center gap-2 font-normal cursor-pointer">
                        <Building2 className="h-4 w-4" />
                        Bank Transfer (Plaid)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="stripe" id="stripe" />
                      <Label htmlFor="stripe" className="flex items-center gap-2 font-normal cursor-pointer">
                        <CreditCard className="h-4 w-4" />
                        Stripe (Paid)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other" className="font-normal cursor-pointer">
                        Other
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {paymentMethod === 'plaid' && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    <BankAccountSelector
                      value={selectedBankAccountId}
                      onChange={(value) => {
                        setSelectedBankAccountId(value);
                        setSelectedTransactionId(''); // Reset transaction selection when bank account changes
                      }}
                      label="Bank Account That Received Payment"
                    />
                    
                    {selectedBankAccountId && (
                      <div className="space-y-2">
                        <Label>Link to Plaid Transaction (Optional)</Label>
                        
                        {selectedTransactionId && selectedTransaction ? (
                          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                  <p className="font-medium text-sm">
                                    {selectedTransaction.merchant_name || selectedTransaction.description || 'Unknown'}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(selectedTransaction.transaction_date), 'MMM d, yyyy')}
                                  {selectedTransaction.category && ` • ${selectedTransaction.category}`}
                                </p>
                              </div>
                              <span className="text-sm font-semibold whitespace-nowrap">
                                ${Math.abs(selectedTransaction.amount).toLocaleString()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsTransactionDialogOpen(true)}
                              className="w-full"
                            >
                              Change Transaction
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsTransactionDialogOpen(true)}
                            className="w-full"
                            disabled={isLoadingTransactions}
                          >
                            {isLoadingTransactions ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading transactions...
                              </>
                            ) : (
                              'Select Transaction'
                            )}
                          </Button>
                        )}
                        
                        {!isLoadingTransactions && (!unmatchedTransactions || unmatchedTransactions.length === 0) && (
                          <p className="text-xs text-muted-foreground text-center">
                            No unmatched transactions found. You can still confirm without linking.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Payment Notes
                  <span className="text-muted-foreground ml-1">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add transaction ID, check number, or other payment details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* What Happens Info - Full Width */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <p className="font-medium">This action will:</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              <li>Mark {entityType} as "Paid/Housed"</li>
              <li>Record ${effectiveFeeAmount.toLocaleString()} payment received</li>
              <li>Award 2 points to property worker</li>
              <li>Create transaction record</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {stripeCheckoutUrl ? 'Close' : 'Cancel'}
          </Button>
          {paymentMethod !== 'stripe' && (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={markAsPaid.isPending || isRecordingPayment || blockActionsForUnsavedFee}
              >
                {(markAsPaid.isPending || isRecordingPayment) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Payment Received'
                )}
              </Button>
              {blockActionsForUnsavedFee && (
                <p className="text-xs text-amber-600">Save your fee changes first.</p>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Transaction Selection Dialog */}
      <SelectTransactionDialog
        isOpen={isTransactionDialogOpen}
        onClose={() => setIsTransactionDialogOpen(false)}
        onSelect={setSelectedTransactionId}
        transactions={unmatchedTransactions || []}
        selectedTransactionId={selectedTransactionId}
        isLoading={isLoadingTransactions}
        feeAmount={effectiveFeeAmount}
      />
    </Dialog>
  );
};
