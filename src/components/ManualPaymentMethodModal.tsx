import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AVAILABLE_PAYMENT_METHODS, type PayoutMethod } from '@/utils/paymentMethods';

interface ManualPaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (paymentMethod: ManualPaymentMethod) => void;
}

export interface ManualPaymentMethod {
  id: string;
  type: PayoutMethod | 'cash' | 'check' | 'wire' | 'credit_card' | 'other';
  name: string;
  description?: string;
  accountDetails?: string;
  routingNumber?: string;
  accountNumber?: string;
}

const MANUAL_PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', description: 'Physical cash payment' },
  { value: 'check', label: 'Check', description: 'Physical or mailed check' },
  { value: 'wire', label: 'Wire Transfer', description: 'Bank wire transfer' },
  { value: 'credit_card', label: 'Credit Card', description: 'Credit card payment' },
  { value: 'digital_check', label: 'ePay', description: 'Electronic check delivery' },
  { value: 'ach', label: 'ACH', description: 'Direct bank transfer' },
  { value: 'other', label: 'Other', description: 'Other payment method' }
];

export function ManualPaymentMethodModal({ open, onOpenChange, onSave }: ManualPaymentMethodModalProps) {
  const [paymentType, setPaymentType] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const resetForm = () => {
    setPaymentType('');
    setName('');
    setDescription('');
    setAccountDetails('');
    setRoutingNumber('');
    setAccountNumber('');
  };

  const handleSave = () => {
    if (!paymentType || !name) return;

    const paymentMethod: ManualPaymentMethod = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: paymentType as ManualPaymentMethod['type'],
      name: name.trim(),
      description: description.trim() || undefined,
      accountDetails: accountDetails.trim() || undefined,
      routingNumber: routingNumber.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
    };

    onSave(paymentMethod);
    resetForm();
    onOpenChange(false);
  };

  const selectedType = MANUAL_PAYMENT_TYPES.find(t => t.value === paymentType);
  const requiresBankDetails = ['wire', 'ach'].includes(paymentType);
  const requiresAccountNumber = ['check', 'wire', 'ach'].includes(paymentType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Manual Payment Method</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="payment-type">Payment Method Type</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="method-name">Payment Method Name</Label>
            <Input
              id="method-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Checking Account, Petty Cash, etc."
            />
          </div>

          <div>
            <Label htmlFor="method-description">Description (Optional)</Label>
            <Textarea
              id="method-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this payment method"
              rows={2}
            />
          </div>

          {requiresBankDetails && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground">Bank Details</h4>
              
              <div>
                <Label htmlFor="routing-number">Routing Number (Optional)</Label>
                <Input
                  id="routing-number"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="9-digit routing number"
                />
              </div>
              
              <div>
                <Label htmlFor="account-number">Account Number (Optional)</Label>
                <Input
                  id="account-number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Last 4 digits for reference"
                />
              </div>
            </div>
          )}

          {requiresAccountNumber && !requiresBankDetails && (
            <div>
              <Label htmlFor="account-details">Account Details (Optional)</Label>
              <Input
                id="account-details"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="Check number, account reference, etc."
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave}
              disabled={!paymentType || !name}
              className="flex-1"
            >
              Save Payment Method
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}