import { useState } from 'react';
import { Building2, DollarSign, Send, User, Wrench, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { useVendorPayments } from '@/hooks/useVendorPayments';

interface Property {
  id: string;
  address: string;
  monthly_rent?: number;
  portfolio_id?: string;
  portfolio_name?: string;
  rent_splits?: Array<{
    total_rent: number;
    pha_portion: number;
    tenant_portion: number;
    voucher_type: string;
  }>;
}

interface PaymentSummaryCardProps {
  property: Property | null;
  onSendPayment: (property: Property, amount?: number, recipientName?: string) => void;
  userId: string;
}

export const PaymentSummaryCard = ({
  property,
  onSendPayment,
  userId,
}: PaymentSummaryCardProps) => {
  const [recipientType, setRecipientType] = useState<'owner' | 'vendor'>('owner');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [memo, setMemo] = useState('');
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  
  const { recordPayment, loading } = useVendorPayments();

  const handleRecordPayment = async () => {
    if (!property || !amount || !recipientName || !paymentMethod) return;

    try {
      await recordPayment({
        landlord_id: userId,
        portfolio_id: property.portfolio_id || undefined,
        property_id: property.id,
        recipient_type: recipientType,
        recipient_name: recipientName,
        amount: parseFloat(amount),
        currency_code: 'USD',
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        memo: memo || undefined,
      });

      // Reset form
      setAmount('');
      setRecipientName('');
      setPaymentMethod('');
      setMemo('');
      setShowRecordDialog(false);
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleSendToOwner = () => {
    if (!property) return;
    
    const rentSplit = property.rent_splits?.[0];
    const defaultAmount = rentSplit?.pha_portion || property.monthly_rent || 0;
    
    onSendPayment(property, defaultAmount, `Payment to Owner - ${property.address}`);
  };

  if (!property) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Property</h3>
          <p className="text-muted-foreground">
            Choose a property from the list to make payments
          </p>
        </div>
      </div>
    );
  }

  const rentSplit = property.rent_splits?.[0];
  const suggestedAmount = rentSplit?.pha_portion || property.monthly_rent || 0;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{property.address}</h3>
          {property.portfolio_name && (
            <Badge variant="secondary" className="mt-2">
              {property.portfolio_name}
            </Badge>
          )}
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-4">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Send to Owner</p>
                      <p className="text-sm text-muted-foreground">Digital payment</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    <CurrencyDisplay amount={suggestedAmount} />
                  </span>
                  <Button size="sm" onClick={handleSendToOwner}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Wrench className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Record Vendor Payment</p>
                      <p className="text-sm text-muted-foreground">For audit trail</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Track expenses</span>
                  <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Record
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="recipient-type">Recipient Type</Label>
                          <Select value={recipientType} onValueChange={(value: 'owner' | 'vendor') => setRecipientType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Property Owner</SelectItem>
                              <SelectItem value="vendor">Vendor/Contractor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="recipient-name">Recipient Name</Label>
                          <Input
                            id="recipient-name"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Enter recipient name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label htmlFor="payment-method">Payment Method</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="ach">ACH Transfer</SelectItem>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="memo">Memo (Optional)</Label>
                          <Textarea
                            id="memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Payment description or notes"
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleRecordPayment} 
                            disabled={loading || !amount || !recipientName || !paymentMethod}
                            className="flex-1"
                          >
                            Record Payment
                          </Button>
                          <Button variant="outline" onClick={() => setShowRecordDialog(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Property Information */}
        {(property.monthly_rent || rentSplit) && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Property Information</h4>
            <div className="space-y-2">
              {property.monthly_rent && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Monthly Rent</span>
                  <span className="text-sm font-medium">
                    <CurrencyDisplay amount={property.monthly_rent} />
                  </span>
                </div>
              )}
              {rentSplit && (
                <>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">HAP Portion</span>
                    <span className="text-sm font-medium text-blue-700">
                      <CurrencyDisplay amount={rentSplit.pha_portion} />
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Tenant Portion</span>
                    <span className="text-sm font-medium text-green-700">
                      <CurrencyDisplay amount={rentSplit.tenant_portion} />
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Activity Link */}
        <div className="pt-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start">
            <Eye className="h-4 w-4 mr-2" />
            View Payment History
          </Button>
        </div>
      </div>
    </div>
  );
};