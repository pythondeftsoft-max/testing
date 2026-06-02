import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTagTransaction, useUntagTransaction, PlaidTransaction } from '@/hooks/useLandlordPlaidTransactions';

interface TagTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PlaidTransaction | null;
  landlordId: string;
  portfolioId?: string;
}

export const TagTransactionModal = ({
  open,
  onOpenChange,
  transaction,
  landlordId,
  portfolioId,
}: TagTransactionModalProps) => {
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tagType, setTagType] = useState('tenant_rent');
  const [notes, setNotes] = useState('');

  const tagTransaction = useTagTransaction();
  const untagTransaction = useUntagTransaction();

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
  const selectedProperty = properties?.find(p => p.id === propertyId);
  const units = selectedProperty?.property_units || [];

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      setPropertyId(transaction.property_id || '');
      setUnitId(transaction.unit_id || '');
      setTagType(transaction.tag_type || 'tenant_rent');
      setNotes(transaction.notes || '');
    } else {
      setPropertyId('');
      setUnitId('');
      setTagType('tenant_rent');
      setNotes('');
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction || !propertyId) return;

    await tagTransaction.mutateAsync({
      transactionId: transaction.id,
      propertyId,
      unitId: unitId || undefined,
      tagType,
      notes: notes || undefined,
    });

    onOpenChange(false);
  };

  const handleUntag = async () => {
    if (!transaction) return;
    await untagTransaction.mutateAsync(transaction.id);
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
          <DialogTitle>{transaction.is_tagged ? 'Edit Tag' : 'Tag Transaction'}</DialogTitle>
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
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select value={propertyId} onValueChange={(value) => {
              setPropertyId(value);
              setUnitId(''); // Reset unit when property changes
            }}>
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
              placeholder="Add any notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {transaction.is_tagged && (
            <Button
              variant="outline"
              onClick={handleUntag}
              disabled={untagTransaction.isPending}
              className="text-destructive"
            >
              Remove Tag
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!propertyId || tagTransaction.isPending}
          >
            {tagTransaction.isPending ? 'Saving...' : 'Save Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
