import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTagPropertyPayment, TaggedTransaction } from '@/hooks/usePaymentTaggingData';

interface AddPropertyTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TaggedTransaction | null;
  landlordId: string;
  portfolioId?: string;
}

export const AddPropertyTagModal = ({
  open,
  onOpenChange,
  transaction,
  landlordId,
  portfolioId,
}: AddPropertyTagModalProps) => {
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [amount, setAmount] = useState('');
  const [tagType, setTagType] = useState('tenant_rent');
  const [notes, setNotes] = useState('');

  const tagPayment = useTagPropertyPayment();

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

  // Get units for selected property
  const selectedProperty = properties?.find((p) => p.id === propertyId);
  const units = selectedProperty?.property_units || [];

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.remaining_balance));
      setPropertyId('');
      setUnitId('');
      setTagType('tenant_rent');
      setNotes('');
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction || !propertyId) return;

    await tagPayment.mutateAsync({
      transactionId: transaction.id,
      propertyId,
      unitId: unitId || undefined,
      amount: Number(amount),
      tagType,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Property to Transaction</DialogTitle>
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
              <span className="text-sm font-medium truncate max-w-[200px]">
                {transaction.description}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Already Tagged</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(transaction.total_tagged)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-sm font-medium">Remaining Balance</span>
              <span className="text-sm font-bold text-blue-600">
                {formatCurrency(transaction.remaining_balance)}
              </span>
            </div>
          </div>

          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select
              value={propertyId}
              onValueChange={(value) => {
                setPropertyId(value);
                setUnitId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
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

          {/* Unit Selection (if multi-unit) */}
          {units.length > 1 && (
            <div className="space-y-2">
              <Label>Unit (optional)</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Units / General</SelectItem>
                  {units.map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unit_name || unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={transaction.remaining_balance}
              />
            </div>
            {Number(amount) > transaction.remaining_balance && (
              <p className="text-sm text-destructive">
                Amount exceeds remaining balance ({formatCurrency(transaction.remaining_balance)})
              </p>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label>Payment Type *</Label>
            <Select value={tagType} onValueChange={setTagType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_rent">Tenant Rent Payment</SelectItem>
                <SelectItem value="hap_voucher">HAP / Voucher Payment</SelectItem>
                <SelectItem value="other">Other Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes about this allocation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !propertyId ||
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) > transaction.remaining_balance ||
              tagPayment.isPending
            }
          >
            {tagPayment.isPending ? 'Adding...' : 'Add Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
