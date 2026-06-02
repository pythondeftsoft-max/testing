import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePortfolioAssetOperations } from '@/hooks/usePortfolioAssets';
import type { PortfolioAsset } from '@/types/portfolio-assets';
import { formatCurrency } from '@/lib/utils';

interface AssetValuationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: PortfolioAsset;
  portfolioId: string;
}

const valuationMethods = [
  { value: 'market', label: 'Market Value' },
  { value: 'appraisal', label: 'Professional Appraisal' },
  { value: 'cost', label: 'Cost Approach' },
  { value: 'income', label: 'Income Approach' },
];

export const AssetValuationDialog: React.FC<AssetValuationDialogProps> = ({
  isOpen,
  onClose,
  asset,
  portfolioId,
}) => {
  const [marketValue, setMarketValue] = useState<string>('');
  const [appraisedValue, setAppraisedValue] = useState<string>('');
  const [valuationMethod, setValuationMethod] = useState<string>('market');
  const [valuationDate, setValuationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  const { createValuation } = usePortfolioAssetOperations(portfolioId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketValue) return;

    const valuationData = {
      asset_id: asset.id,
      valuation_date: valuationDate,
      market_value: parseFloat(marketValue),
      appraised_value: appraisedValue ? parseFloat(appraisedValue) : undefined,
      valuation_method: valuationMethod as 'market' | 'appraisal' | 'cost' | 'income',
      notes: notes || undefined,
    };

    await createValuation.mutateAsync(valuationData);
    handleClose();
  };

  const handleClose = () => {
    setMarketValue('');
    setAppraisedValue('');
    setValuationMethod('market');
    setValuationDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    onClose();
  };

  const currentValue = asset.current_value || asset.asset_value;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Asset Valuation</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Asset</Label>
            <div className="p-2 bg-muted rounded text-sm">
              <div className="font-medium">{asset.asset_name}</div>
              <div className="text-xs text-muted-foreground">
                Current Value: {formatCurrency(currentValue)}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="valuation-date">Valuation Date</Label>
            <Input
              id="valuation-date"
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="market-value">Market Value *</Label>
            <Input
              id="market-value"
              type="number"
              step="0.01"
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              placeholder="Enter market value"
              required
            />
          </div>

          <div>
            <Label htmlFor="appraised-value">Appraised Value (Optional)</Label>
            <Input
              id="appraised-value"
              type="number"
              step="0.01"
              value={appraisedValue}
              onChange={(e) => setAppraisedValue(e.target.value)}
              placeholder="Enter appraised value"
            />
          </div>

          <div>
            <Label htmlFor="valuation-method">Valuation Method</Label>
            <Select value={valuationMethod} onValueChange={setValuationMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {valuationMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this valuation..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!marketValue || createValuation.isPending}
            >
              {createValuation.isPending ? 'Recording...' : 'Record Valuation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};