import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSplitTransaction, PlaidTransaction } from '@/hooks/useLandlordPlaidTransactions';

interface SplitPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PlaidTransaction | null;
  landlordId: string;
  portfolioId?: string;
}

interface SplitItem {
  propertyId: string;
  unitId: string;
  amount: string;
  tagType: string;
}

export const SplitPaymentModal = ({
  open,
  onOpenChange,
  transaction,
  landlordId,
  portfolioId,
}: SplitPaymentModalProps) => {
  const [splits, setSplits] = useState<SplitItem[]>([
    { propertyId: '', unitId: '', amount: '', tagType: 'tenant_rent' },
    { propertyId: '', unitId: '', amount: '', tagType: 'tenant_rent' },
  ]);

  const splitTransaction = useSplitTransaction();

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['properties-for-tagging', landlordId, portfolioId],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('id, address, property_units(id, unit_number, unit_name)')
        .eq('owner_id', landlordId)
        .is('deleted_at', null);

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('address');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset when transaction changes
  useEffect(() => {
    if (transaction) {
      setSplits([
        { propertyId: '', unitId: '', amount: '', tagType: 'tenant_rent' },
        { propertyId: '', unitId: '', amount: '', tagType: 'tenant_rent' },
      ]);
    }
  }, [transaction]);

  const addSplit = () => {
    setSplits([...splits, { propertyId: '', unitId: '', amount: '', tagType: 'tenant_rent' }]);
  };

  const removeSplit = (index: number) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof SplitItem, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    if (field === 'propertyId') {
      newSplits[index].unitId = ''; // Reset unit when property changes
    }
    setSplits(newSplits);
  };

  const getUnitsForProperty = (propertyId: string) => {
    const property = properties?.find(p => p.id === propertyId);
    return property?.property_units || [];
  };

  const totalAllocated = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remaining = (transaction?.amount || 0) - totalAllocated;

  const isValid = splits.every(s => s.propertyId && parseFloat(s.amount) > 0) && 
                  Math.abs(remaining) < 0.01; // Allow for small rounding errors

  const handleSubmit = async () => {
    if (!transaction || !isValid) return;

    await splitTransaction.mutateAsync({
      transactionId: transaction.id,
      splits: splits.map(s => ({
        propertyId: s.propertyId,
        unitId: s.unitId || undefined,
        amount: parseFloat(s.amount),
        tagType: s.tagType,
      })),
    });

    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Info */}
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description</span>
              <span className="text-sm font-medium">{transaction.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-sm font-bold text-green-600">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Allocation Status */}
          <div className={`p-3 rounded-lg ${Math.abs(remaining) < 0.01 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
            <div className="flex justify-between text-sm">
              <span>Allocated: {formatCurrency(totalAllocated)}</span>
              <span>Remaining: {formatCurrency(remaining)}</span>
            </div>
          </div>

          {/* Split Items */}
          <div className="space-y-4">
            {splits.map((split, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">Split {index + 1}</Label>
                  {splits.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSplit(index)}
                      className="text-destructive h-8 px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Property */}
                  <div className="space-y-1">
                    <Label className="text-xs">Property</Label>
                    <Select
                      value={split.propertyId}
                      onValueChange={(value) => updateSplit(index, 'propertyId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={split.amount}
                      onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                    />
                  </div>

                  {/* Unit (if multi-unit) */}
                  {getUnitsForProperty(split.propertyId).length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={split.unitId}
                        onValueChange={(value) => updateSplit(index, 'unitId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">General</SelectItem>
                          {getUnitsForProperty(split.propertyId).map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unit_name || unit.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Payment Type */}
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={split.tagType}
                      onValueChange={(value) => updateSplit(index, 'tagType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tenant_rent">Rent</SelectItem>
                        <SelectItem value="hap_voucher">HAP</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSplit}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Split
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || splitTransaction.isPending}
          >
            {splitTransaction.isPending ? 'Saving...' : 'Save Split'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
