import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { useBulkPayouts } from '@/hooks/useBulkPayouts';
import { useRentalOwnerStatement, PropertySummary } from '@/hooks/useRentalOwnerStatement';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SendConfirmationModal } from './SendConfirmationModal';

interface BulkPayoutWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId?: string;
  startDate: string;
  endDate: string;
}

type Step = 'generate' | 'select' | 'confirm' | 'processing' | 'complete';

export const BulkPayoutWizard: React.FC<BulkPayoutWizardProps> = ({
  open,
  onOpenChange,
  portfolioId,
  startDate,
  endDate,
}) => {
  const [step, setStep] = useState<Step>('generate');
  const [ownerStatements, setOwnerStatements] = useState<PropertySummary[]>([]);
  const [selectedLandlords, setSelectedLandlords] = useState<Set<string>>(new Set());
  const [batchId, setbatchId] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [enableQuery, setEnableQuery] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: statementData, isLoading: statementsLoading } = useRentalOwnerStatement(
    enableQuery ? {
      portfolioId,
      startDate,
      endDate,
      includeIncomeStatement: false,
      includeTransactionDetails: false,
      displayTransactionsBy: 'date',
    } : undefined
  );

  const { createBatch, addItemsToBatch, processBatch, isLoading: payoutsLoading } = useBulkPayouts();

  const isLoading = statementsLoading || payoutsLoading;

  useEffect(() => {
    if (statementData && enableQuery) {
      // Filter to only landlords with amounts > 0
      const landlords = statementData.summary_by_property.filter(s => s.available_for_payment > 0);
      setOwnerStatements(landlords);
      setSelectedLandlords(new Set(landlords.map(l => l.property_id)));
      setStep('select');
      setEnableQuery(false);
    }
  }, [statementData, enableQuery]);

  const handleGenerateStatements = () => {
    setEnableQuery(true);
  };

  const handleSelectAll = () => {
    if (selectedLandlords.size === ownerStatements.length) {
      setSelectedLandlords(new Set());
    } else {
      setSelectedLandlords(new Set(ownerStatements.map(s => s.property_id)));
    }
  };

  const handleToggleLandlord = (propertyId: string) => {
    const newSet = new Set(selectedLandlords);
    if (newSet.has(propertyId)) {
      newSet.delete(propertyId);
    } else {
      newSet.add(propertyId);
    }
    setSelectedLandlords(newSet);
  };

  const handleCreateBatch = async () => {
    const batchName = `Owner Payouts ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`;
    const dateRange = `${format(new Date(startDate), 'MMMM d')} - ${format(new Date(endDate), 'MMMM d, yyyy')}`;

    const batch = await createBatch(batchName, dateRange, portfolioId);
    if (!batch) return;

    const selectedStatements = ownerStatements.filter(s => selectedLandlords.has(s.property_id));

    // Get owner IDs for selected properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, owner_id')
      .in('id', selectedStatements.map(s => s.property_id));

    const propertyOwnerMap = new Map(properties?.map(p => [p.id, p.owner_id]) || []);

    const items = selectedStatements.map(statement => ({
      landlord_id: propertyOwnerMap.get(statement.property_id) || statement.property_id,
      property_id: statement.property_id,
      amount: statement.available_for_payment,
      payout_method: 'digital_check' as const,
      recipient_details: {
        name: statement.owner_name,
        address: {
          line1: statement.property_address,
          city: 'City',
          state: 'ST',
          postal_code: '12345',
          country: 'US',
        },
      },
    }));

    await addItemsToBatch(batch.id, items);
    setbatchId(batch.id);
    setStep('confirm');
  };

  const handleProcessBatch = async () => {
    if (!batchId) return;

    setStep('processing');
    const result = await processBatch(batchId);
    setProcessingResult(result);
    setStep('complete');
  };

  const totalSelected = ownerStatements
    .filter(s => selectedLandlords.has(s.property_id))
    .reduce((sum, s) => sum + s.available_for_payment, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Owner Payouts</DialogTitle>
        </DialogHeader>

        {step === 'generate' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Generate owner statements for the selected date range and create bulk payouts.
            </p>
            <div className="flex gap-2">
              <div>
                <strong>From:</strong> {format(new Date(startDate), 'MMM d, yyyy')}
              </div>
              <div>
                <strong>To:</strong> {format(new Date(endDate), 'MMM d, yyyy')}
              </div>
            </div>
            <Button onClick={handleGenerateStatements} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Owner Statements
            </Button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Select Recipients ({selectedLandlords.size})</h3>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedLandlords.size === ownerStatements.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ownerStatements.map((statement) => (
                <Card key={statement.property_id} className="cursor-pointer hover:bg-accent/50"
                  onClick={() => handleToggleLandlord(statement.property_id)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Checkbox
                      checked={selectedLandlords.has(statement.property_id)}
                      onCheckedChange={() => handleToggleLandlord(statement.property_id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{statement.owner_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {statement.property_address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${statement.available_for_payment.toFixed(2)}
                      </div>
                      <Badge variant="secondary">ePay</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                <strong>Total:</strong> ${totalSelected.toFixed(2)} for {selectedLandlords.size} recipients
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('generate')}>
                  Back
                </Button>
                <Button onClick={handleCreateBatch} disabled={selectedLandlords.size === 0 || isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Batch Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Recipients:</span>
                  <strong>{selectedLandlords.size} landlords</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <strong>${totalSelected.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Fees:</span>
                  <strong>${(selectedLandlords.size * 1.5).toFixed(2)}</strong>
                </div>
              </CardContent>
            </Card>

            <div className="border border-warning bg-muted p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong className="text-warning">Heads up:</strong> This will initiate {selectedLandlords.size} payouts. Funds will be sent within 1-2 business days.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={() => setConfirmOpen(true)} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review & Send
              </Button>
            </div>

            <SendConfirmationModal
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              isSending={isLoading}
              details={{
                totalAmount: totalSelected,
                itemCount: selectedLandlords.size,
                rail: 'Checkbook (Digital Check)',
                estimatedFees: selectedLandlords.size * 1.5,
                availableBalance: null,
                highValueThreshold: 5000,
              }}
              onConfirm={() => {
                setConfirmOpen(false);
                handleProcessBatch();
              }}
            />
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Processing payouts...</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            {processingResult?.success ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-success" />
                <h3 className="text-2xl font-semibold">Batch Complete!</h3>
                <p className="text-muted-foreground">
                  {processingResult.data?.successful_payouts} payouts sent successfully
                </p>
                {processingResult.data?.failed_payouts > 0 && (
                  <p className="text-destructive">
                    {processingResult.data?.failed_payouts} payouts failed
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <XCircle className="h-16 w-16 text-destructive" />
                <h3 className="text-2xl font-semibold">Processing Failed</h3>
                <p className="text-muted-foreground">{processingResult?.error}</p>
              </div>
            )}

            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};