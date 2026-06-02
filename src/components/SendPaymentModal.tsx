import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Building2, DollarSign, User, MapPin, Calendar, FileText, Plus } from 'lucide-react';
import { useCheckbook } from '@/hooks/useCheckbook';
import { usePaymentAccounts } from '@/hooks/usePaymentAccounts';
import { AddPaymentAccountModal } from '@/components/AddPaymentAccountModal';
import { useToast } from '@/hooks/use-toast';
import { AVAILABLE_PAYMENT_METHODS, getPaymentMethodLabel } from '@/utils/paymentMethods';

interface SendPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  portfolioId?: string;
  prefilledData?: {
    property_id?: string;
    amount?: number;
    recipient_name?: string;
  };
}

interface PaymentFormData {
  amount: string;
  payout_method: 'check' | 'digital_check' | 'ach';
  source_account_id: string;
  memo: string;
  due_date: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

export const SendPaymentModal = ({ 
  open, 
  onOpenChange, 
  userId, 
  portfolioId,
  prefilledData 
}: SendPaymentModalProps) => {
  const { createPayout, isLoading: checkbookLoading } = useCheckbook();
  const { accounts, isLoading: accountsLoading } = usePaymentAccounts(userId, portfolioId);
  const { toast } = useToast();
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    amount: prefilledData?.amount?.toString() || '',
    payout_method: 'digital_check',
    source_account_id: '',
    memo: '',
    due_date: '',
    recipient: {
      name: prefilledData?.recipient_name || '',
      email: '',
      phone: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }
    }
  });

  const [currentStep, setCurrentStep] = useState<'details' | 'recipient' | 'review'>('details');

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !formData.source_account_id) {
      const defaultAccount = accounts.find(acc => acc.is_default) || accounts[0];
      setFormData(prev => ({
        ...prev,
        source_account_id: defaultAccount.id
      }));
    }
  }, [accounts]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('recipient.address.')) {
      const addressField = field.split('.')[2];
      setFormData(prev => ({
        ...prev,
        recipient: {
          ...prev.recipient,
          address: {
            ...prev.recipient.address,
            [addressField]: value
          }
        }
      }));
    } else if (field.startsWith('recipient.')) {
      const recipientField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        recipient: {
          ...prev.recipient,
          [recipientField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateStep = (step: string): boolean => {
    switch (step) {
      case 'details':
        return !!(formData.amount && formData.payout_method && formData.source_account_id);
      case 'recipient':
        return !!(
          formData.recipient.name &&
          formData.recipient.address.line1 &&
          formData.recipient.address.city &&
          formData.recipient.address.state &&
          formData.recipient.address.postal_code
        );
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === 'details') setCurrentStep('recipient');
    else if (currentStep === 'recipient') setCurrentStep('review');
  };

  const handleSubmit = async () => {
    if (!validateStep('recipient')) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === formData.source_account_id);
    
    const payoutRequest = {
      landlord_id: userId,
      portfolio_id: portfolioId !== 'everything' ? portfolioId : undefined,
      property_id: prefilledData?.property_id,
      amount: parseFloat(formData.amount),
      recipient: formData.recipient,
      payout_method: formData.payout_method,
      memo: formData.memo,
      source_account_name: selectedAccount?.label,
      source_account_id: formData.source_account_id,
      due_date: formData.due_date || undefined
    };

    const result = await createPayout(payoutRequest);
    
    if (result.success) {
      onOpenChange(false);
      // Reset form
      setFormData({
        amount: '',
        payout_method: 'digital_check',
        source_account_id: accounts.find(acc => acc.is_default)?.id || '',
        memo: '',
        due_date: '',
        recipient: {
          name: '',
          email: '',
          phone: '',
          address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'US'
          }
        }
      });
      setCurrentStep('details');
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === formData.source_account_id);

  const stepTitles = {
    details: 'Payment Details',
    recipient: 'Recipient Information', 
    review: 'Review & Send'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Send Payment - {stepTitles[currentStep]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {(['details', 'recipient', 'review'] as const).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep === 'review' && (step === 'details' || step === 'recipient')
                    ? 'bg-green-500 text-white'
                    : currentStep === 'recipient' && step === 'details'
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && <div className="w-8 h-px bg-border mx-2" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"  
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payout_method">Payment Method *</Label>
                  <Select value={formData.payout_method} onValueChange={(value) => handleInputChange('payout_method', value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {AVAILABLE_PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{method.label}</span>
                            <span className="text-xs text-muted-foreground">{method.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="source_account">Source Account *</Label>
                  {accountsLoading ? (
                    <div className="h-10 bg-muted animate-pulse rounded-md" />
                  ) : accounts.length === 0 ? (
                    <div className="space-y-2">
                      <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">No payment accounts configured</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddAccountModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Payment Account
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select value={formData.source_account_id} onValueChange={(value) => {
                        if (value === 'add_new') {
                          setShowAddAccountModal(true);
                        } else {
                          handleInputChange('source_account_id', value);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                        {accounts.filter(acc => acc.link_status === 'linked').map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{account.label}</span>
                                <div className="flex items-center gap-1">
                                  {account.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                                  <Badge variant="default" className="ml-1 text-xs bg-green-600">Linked</Badge>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="add_new">
                            <div className="flex items-center gap-2 text-primary">
                              <Plus className="h-4 w-4" />
                              <span>Add New Account</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date (Optional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="memo"
                      placeholder="Payment description"
                      value={formData.memo}
                      onChange={(e) => handleInputChange('memo', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'recipient' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_name">Recipient Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recipient_name"
                    placeholder="Full name"
                    value={formData.recipient.name}
                    onChange={(e) => handleInputChange('recipient.name', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Email (Optional)</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.recipient.email}
                    onChange={(e) => handleInputChange('recipient.email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient_phone">Phone (Optional)</Label>
                  <Input
                    id="recipient_phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.recipient.phone}
                    onChange={(e) => handleInputChange('recipient.phone', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-medium">Mailing Address *</Label>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Address Line 1 *</Label>
                    <Input
                      id="address_line1"
                      placeholder="123 Main Street"
                      value={formData.recipient.address.line1}
                      onChange={(e) => handleInputChange('recipient.address.line1', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      placeholder="Apt, Suite, Unit, etc."
                      value={formData.recipient.address.line2}
                      onChange={(e) => handleInputChange('recipient.address.line2', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address_city">City *</Label>
                      <Input
                        id="address_city"
                        placeholder="City"
                        value={formData.recipient.address.city}
                        onChange={(e) => handleInputChange('recipient.address.city', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_state">State *</Label>
                      <Input
                        id="address_state"
                        placeholder="State"
                        value={formData.recipient.address.state}
                        onChange={(e) => handleInputChange('recipient.address.state', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_postal">ZIP Code *</Label>
                      <Input
                        id="address_postal"
                        placeholder="12345"
                        value={formData.recipient.address.postal_code}
                        onChange={(e) => handleInputChange('recipient.address.postal_code', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Amount</Label>
                      <p className="text-2xl font-bold text-primary">${formData.amount}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Method</Label>
                      <p className="font-medium capitalize">{formData.payout_method.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Source Account</Label>
                      <p className="font-medium">{selectedAccount?.label}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Due Date</Label>
                      <p className="font-medium">{formData.due_date || 'Not specified'}</p>
                    </div>
                  </div>
                  {formData.memo && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Memo</Label>
                      <p className="font-medium">{formData.memo}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recipient</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{formData.recipient.name}</p>
                  {formData.recipient.email && <p className="text-sm text-muted-foreground">{formData.recipient.email}</p>}
                  {formData.recipient.phone && <p className="text-sm text-muted-foreground">{formData.recipient.phone}</p>}
                  <div className="text-sm text-muted-foreground">
                    <p>{formData.recipient.address.line1}</p>
                    {formData.recipient.address.line2 && <p>{formData.recipient.address.line2}</p>}
                    <p>{formData.recipient.address.city}, {formData.recipient.address.state} {formData.recipient.address.postal_code}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (currentStep === 'details') onOpenChange(false);
                else if (currentStep === 'recipient') setCurrentStep('details');
                else if (currentStep === 'review') setCurrentStep('recipient');
              }}
            >
              {currentStep === 'details' ? 'Cancel' : 'Back'}
            </Button>

            <Button
              onClick={currentStep === 'review' ? handleSubmit : handleNextStep}
              disabled={checkbookLoading || !validateStep(currentStep)}
              className="min-w-[120px]"
            >
              {checkbookLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </div>
              ) : currentStep === 'review' ? 'Send Payment' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Add Payment Account Modal */}
      <AddPaymentAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onSuccess={() => setShowAddAccountModal(false)}
        userId={userId}
        portfolioId={portfolioId}
      />
    </Dialog>
  );
};