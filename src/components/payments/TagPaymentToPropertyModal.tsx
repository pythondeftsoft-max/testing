import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Check, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { useAvailableDeposits, useTagPropertyPayment, useDeletePaymentTag, UntaggedProperty, AvailableDeposit } from '@/hooks/usePaymentTaggingData';
import { useQueryClient } from '@tanstack/react-query';

interface TagPaymentToPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: UntaggedProperty | null;
  landlordId: string;
  onTagComplete?: () => void;
}

export const TagPaymentToPropertyModal = ({
  open,
  onOpenChange,
  property,
  landlordId,
  onTagComplete,
}: TagPaymentToPropertyModalProps) => {
  const [selectedDepositId, setSelectedDepositId] = useState('');
  const [amount, setAmount] = useState('');
  const [tagType, setTagType] = useState('tenant_rent');
  const [createAutoTagRule, setCreateAutoTagRule] = useState(false);

  const queryClient = useQueryClient();
  const { data: depositsData, isLoading: depositsLoading, refetch: refetchDeposits } = useAvailableDeposits();
  const tagPayment = useTagPropertyPayment();
  const deleteTag = useDeletePaymentTag();

  const deposits = depositsData?.deposits || [];
  const selectedDeposit = deposits.find((d) => d.id === selectedDepositId);

  // Smart defaults based on what's remaining
  useEffect(() => {
    if (property) {
      // Determine which payment type to default to based on remaining amounts
      const hapRemaining = property.hap_remaining || 0;
      const tenantRemaining = property.tenant_remaining || 0;
      const tenantIsStripe = property.tenant_collection_method === 'stripe';
      
      // If tenant pays via Stripe, default to HAP; otherwise pick whichever has remaining
      if (hapRemaining > 0) {
        setTagType('hap_voucher');
        setAmount(String(hapRemaining));
      } else if (tenantRemaining > 0 && !tenantIsStripe) {
        setTagType('tenant_rent');
        setAmount(String(tenantRemaining));
      } else {
        // Default to HAP if tenant is Stripe-collected, otherwise tenant_rent
        setTagType(tenantIsStripe ? 'hap_voucher' : 'tenant_rent');
        setAmount(String(property.remaining));
      }
      setSelectedDepositId('');
    }
  }, [property]);

  // Update amount when tag type changes
  useEffect(() => {
    if (property && tagType) {
      if (tagType === 'hap_voucher') {
        setAmount(String(property.hap_remaining || 0));
      } else if (tagType === 'tenant_rent') {
        setAmount(String(property.tenant_remaining || property.remaining || 0));
      }
    }
  }, [tagType, property]);

  // Auto-select first matching deposit
  useEffect(() => {
    if (deposits.length > 0 && !selectedDepositId) {
      const targetAmount = Number(amount) || property?.remaining || 0;
      const matchingDeposit = deposits.find((d) => d.available_amount >= targetAmount);
      if (matchingDeposit) {
        setSelectedDepositId(matchingDeposit.id);
      } else {
        setSelectedDepositId(deposits[0].id);
      }
    }
  }, [deposits, property, selectedDepositId, amount]);

  const handleSubmit = async () => {
    if (!property || !selectedDepositId) return;

    await tagPayment.mutateAsync({
      transactionId: selectedDepositId,
      propertyId: property.property_id,
      unitId: property.unit_id,
      amount: Number(amount),
      tagType,
      createAutoTagRule: createAutoTagRule,
      transactionDescription: selectedDeposit?.description || undefined,
    });

    // Refresh data but keep modal open for additional tags
    await refetchDeposits();
    await queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
    
    // Notify parent to refresh property data
    onTagComplete?.();
    
    // Reset form for next tag
    setSelectedDepositId('');
    setCreateAutoTagRule(false);
  };

  const handleDeleteTag = async (tagId: string) => {
    await deleteTag.mutateAsync({ splitId: tagId });
    await queryClient.invalidateQueries({ queryKey: ['payment-tagging'] });
    onTagComplete?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTagType = (type: string) => {
    switch (type) {
      case 'hap_voucher': return 'HAP';
      case 'tenant_rent': return 'Tenant';
      case 'other': return 'Other';
      default: return type;
    }
  };

  if (!property) return null;

  const isFullyTagged = property.remaining === 0;
  const existingTags = property.existing_tags || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tag Payment to Property</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Property</span>
              <span className="text-sm font-medium truncate max-w-[450px]">{property.property_address}</span>
            </div>
            {property.unit_name && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Unit</span>
                <span className="text-sm font-medium">
                  Unit {property.unit_name || property.unit_number}
                </span>
              </div>
            )}
            {property.tenant_name && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tenant</span>
                <span className="text-sm font-medium">{property.tenant_name}</span>
              </div>
            )}
            
            <Separator className="my-2" />
            
            {/* HAP Breakdown (if applicable) */}
            {property.hap_expected > 0 && (
              <div className="space-y-1 pl-2 border-l-2 border-green-300 ml-1">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-green-700">HAP Portion</span>
                  <span className="text-sm">{formatCurrency(property.hap_expected)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tagged</span>
                  <span className="text-green-600">{formatCurrency(property.hap_tagged || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={property.hap_remaining > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                    {formatCurrency(property.hap_remaining || 0)}
                    {property.hap_remaining === 0 && <Check className="inline ml-1 h-3 w-3" />}
                  </span>
                </div>
              </div>
            )}
            
            {/* Tenant Breakdown */}
            <div className="space-y-1 pl-2 border-l-2 border-blue-300 ml-1 mt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-blue-700">Tenant Portion</span>
                <span className="text-sm">{formatCurrency(property.tenant_expected_raw || property.tenant_expected)}</span>
              </div>
              {property.tenant_collection_method === 'stripe' ? (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Collection</span>
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Stripe (In-App)
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tagged</span>
                    <span className="text-green-600">{formatCurrency(property.tenant_tagged || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={property.tenant_remaining > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                      {formatCurrency(property.tenant_remaining || 0)}
                      {property.tenant_remaining === 0 && <Check className="inline ml-1 h-3 w-3" />}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <Separator className="my-2" />
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Remaining</span>
              <span className={`text-sm font-bold ${property.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(property.remaining)}
                {property.remaining === 0 && <Check className="inline ml-1 h-4 w-4" />}
              </span>
            </div>
          </div>

          {/* Fully Tagged Message */}
          {isFullyTagged ? (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="text-green-800 font-medium">All payments tagged!</p>
              <p className="text-sm text-green-700 mt-1">
                This unit's rent is fully accounted for this period.
              </p>
              <Button variant="outline" className="mt-3" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Deposit Selection */}
              <div className="space-y-2">
                <Label>Select Bank Deposit *</Label>
                {depositsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading deposits...</p>
                ) : deposits.length === 0 ? (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No available deposits. Sync your bank transactions first.</span>
                  </div>
                ) : (
                  <Select value={selectedDepositId} onValueChange={setSelectedDepositId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a deposit" />
                    </SelectTrigger>
                    <SelectContent>
                      {deposits.map((deposit) => (
                        <SelectItem key={deposit.id} value={deposit.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(deposit.transaction_date), 'MMM d')}
                            </span>
                            <span className="truncate max-w-[350px]">
                              {deposit.display_name || deposit.description || 'Unknown deposit'}
                            </span>
                            <Badge variant="outline" className="ml-auto">
                              {formatCurrency(deposit.available_amount)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected Deposit Info */}
              {selectedDeposit && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Deposit Amount</span>
                    <span className="font-medium">{formatCurrency(selectedDeposit.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Available to Tag</span>
                    <span className="font-medium text-blue-800">
                      {formatCurrency(selectedDeposit.available_amount)}
                    </span>
                  </div>
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
                    {/* Only show tenant rent option if NOT collected via Stripe */}
                    {property.tenant_collection_method !== 'stripe' && (
                      <SelectItem value="tenant_rent">
                        <div className="flex items-center gap-2">
                          <span>Tenant Rent Payment</span>
                          {property.tenant_remaining > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(property.tenant_remaining)} remaining
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )}
                    {property.hap_expected > 0 && (
                      <SelectItem value="hap_voucher">
                        <div className="flex items-center gap-2">
                          <span>HAP / Voucher Payment</span>
                          {property.hap_remaining > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50">
                              {formatCurrency(property.hap_remaining)} remaining
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="other">Other Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount to Tag *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={selectedDeposit?.available_amount}
                  />
                </div>
                {selectedDeposit && Number(amount) > selectedDeposit.available_amount && (
                  <p className="text-sm text-destructive">
                    Amount exceeds available balance ({formatCurrency(selectedDeposit.available_amount)})
                  </p>
                )}
              </div>

              {/* Auto-tag rule checkbox */}
              {selectedDeposit && (
                <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border">
                  <Checkbox
                    id="create-auto-tag"
                    checked={createAutoTagRule}
                    onCheckedChange={(checked) => setCreateAutoTagRule(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <label htmlFor="create-auto-tag" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      Auto-tag similar payments next month
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Creates a rule to automatically tag future deposits matching "{(selectedDeposit.display_name || selectedDeposit.description)?.substring(0, 40) || 'this deposit'}{(selectedDeposit.display_name || selectedDeposit.description)?.length > 40 ? '...' : ''}"
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tagged To Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Tagged To
              {existingTags.length > 0 && (
                <Badge variant="secondary" className="text-xs">{existingTags.length}</Badge>
              )}
            </Label>
            {existingTags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No payments tagged yet</p>
            ) : (
              <div className="space-y-2">
                {existingTags.map((tag) => (
                  <div 
                    key={tag.id} 
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={tag.tag_type === 'hap_voucher' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                      >
                        {formatTagType(tag.tag_type)}
                      </Badge>
                      <div className="flex flex-col">
                        <span className="text-sm truncate max-w-[300px]">
                          {tag.deposit_description || 'Bank deposit'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tag.deposit_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(tag.amount)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deleteTag.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!isFullyTagged && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedDepositId || 
                !amount || 
                Number(amount) <= 0 ||
                (selectedDeposit && Number(amount) > selectedDeposit.available_amount) ||
                tagPayment.isPending
              }
            >
              {tagPayment.isPending ? 'Saving...' : 'Tag Payment'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
