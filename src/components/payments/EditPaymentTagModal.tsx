import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Trash2, Loader2 } from 'lucide-react';
import { TaggedTransaction, useUpdatePaymentTag, useDeletePaymentTag } from '@/hooks/usePaymentTaggingData';

interface EditPaymentTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split: TaggedTransaction['splits'][0] | null;
  transaction: TaggedTransaction | null;
  landlordId: string;
  onEditComplete?: () => void;
}

export const EditPaymentTagModal = ({
  open,
  onOpenChange,
  split,
  transaction,
  landlordId,
  onEditComplete,
}: EditPaymentTagModalProps) => {
  const [amount, setAmount] = useState('');
  const [tagType, setTagType] = useState('tenant_rent');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const updateTag = useUpdatePaymentTag();
  const deleteTag = useDeletePaymentTag();

  // Initialize form with split data
  useEffect(() => {
    if (split) {
      setAmount(String(split.amount));
      setTagType(split.tag_type);
    }
  }, [split]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);
  };

  const handleSave = async () => {
    if (!split) return;

    await updateTag.mutateAsync({
      splitId: split.id,
      amount: Number(amount),
      tagType,
    });

    onEditComplete?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!split) return;

    await deleteTag.mutateAsync({ splitId: split.id });
    setDeleteConfirmOpen(false);
    onEditComplete?.();
    onOpenChange(false);
  };

  const rentInfo = split?.rent_info;
  const expectedAmount = rentInfo
    ? (tagType === 'hap_voucher' ? rentInfo.hap : rentInfo.tenant)
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Tag</DialogTitle>
          </DialogHeader>

          {!split || !transaction ? (
            <div className="p-4 text-center text-muted-foreground">
              No tag selected
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Property Info */}
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  {split.portfolio_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Portfolio</span>
                      <span className="text-sm font-medium text-primary">{split.portfolio_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Property</span>
                    <span className="text-sm font-medium truncate max-w-[350px]">
                      {split.property?.address || 'Unknown'}
                    </span>
                  </div>
                  {split.unit && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unit</span>
                      <span className="text-sm font-medium">
                        Unit {split.unit.unit_name || split.unit.unit_number}
                      </span>
                    </div>
                  )}
                  {split.tenant_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tenant</span>
                      <span className="text-sm font-medium text-blue-600">{split.tenant_name}</span>
                    </div>
                  )}
                </div>

                {/* Rent Breakdown */}
                {rentInfo && (
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Rent Breakdown</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total</span>
                        <p className="font-medium">{formatCurrency(rentInfo.total)}</p>
                      </div>
                      <div>
                        <span className="text-green-600">HAP</span>
                        <p className="font-medium">{formatCurrency(rentInfo.hap)}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">
                          Tenant
                          {rentInfo.tenant_collection_method === 'stripe' && (
                            <span className="text-xs ml-1">(Stripe)</span>
                          )}
                        </span>
                        <p className="font-medium">{formatCurrency(rentInfo.tenant)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Deposit Info */}
                <div className="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
                  <p className="font-medium text-blue-800">Bank Deposit Source</p>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Description</span>
                    <span className="font-medium truncate max-w-[300px]">
                      {transaction.description || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Date</span>
                    <span className="font-medium">
                      {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Original Amount</span>
                    <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                  </div>
                </div>

                <Separator />

                {/* Editable Fields */}
                <div className="space-y-4">
                  {/* Payment Type */}
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
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

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {expectedAmount > 0 && Number(amount) !== expectedAmount && (
                      <p className="text-xs text-muted-foreground">
                        Expected for {tagType === 'hap_voucher' ? 'HAP' : 'Tenant'}: {formatCurrency(expectedAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between sm:justify-between gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteTag.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tag
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateTag.isPending || !amount || Number(amount) <= 0}
                  >
                    {updateTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag for {split ? formatCurrency(split.amount) : '$0'} from{' '}
              {split?.property?.address || 'this property'}.
              The bank deposit will remain tracked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
