import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Stepper } from '@/components/ui/stepper';
import { Send, CheckCircle, AlertCircle, DollarSign, User, MapPin, Plus, CreditCard, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useCheckbook } from '@/hooks/useCheckbook';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { PlaidLinkAccounts } from '@/components/PlaidLinkAccounts';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { AVAILABLE_PAYMENT_METHODS, getPaymentMethodDescription } from '@/utils/paymentMethods';

interface PayoutBuilderProps {
  userId: string;
  portfolioId?: string;
  onPayoutCreated?: () => void;
}

interface PayoutFormData {
  user_id: string;
  landlord_id: string;
  portfolio_id?: string;
  property_id?: string;
  total_amount: number;
  recipient_details: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  payout_method: 'check' | 'digital_check' | 'ach';
  memo?: string;
  source_account_name?: string;
  source_account_id?: string;
  due_date?: string;
}

export const PayoutBuilder = ({ userId, portfolioId, onPayoutCreated }: PayoutBuilderProps) => {
  const { createDraftPayout, isLoading } = useCheckbook();
  const { accounts: bankAccounts, isLoading: accountsLoading, fetchAccounts } = useBankAccounts();
  const [showLinkAccountsModal, setShowLinkAccountsModal] = useState(false);
  const [formData, setFormData] = useState<PayoutFormData>({
    user_id: userId,
    landlord_id: userId,
    portfolio_id: portfolioId,
    property_id: '',
    total_amount: 0,
    recipient_details: {
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
    },
    payout_method: 'digital_check',
    memo: '',
    source_account_name: '',
    due_date: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'amount' | 'recipient' | 'review'>('amount');
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Set default account when bank accounts load
  useEffect(() => {
    if (bankAccounts.length > 0 && !formData.source_account_name) {
      const defaultAccount = bankAccounts.find(acc => acc.is_default_for_payouts) || bankAccounts[0];
      if (defaultAccount) {
        const accountLabel = `${defaultAccount.institution_name || 'Bank'} ••••${defaultAccount.mask || '0000'}`;
        setFormData(prev => ({
          ...prev,
          source_account_name: accountLabel,
          source_account_id: defaultAccount.id
        }));
      }
    }
  }, [bankAccounts]);

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'amount') {
      if (!formData.total_amount || formData.total_amount <= 0) {
        newErrors.amount = 'Amount must be greater than $0';
      }
      if (formData.total_amount > 10000) {
        newErrors.amount = 'Amount cannot exceed $10,000 in sandbox mode';
      }
      // Source account is optional - can save as draft without it
    }

    if (step === 'recipient') {
      if (!formData.recipient_details.name.trim()) {
        newErrors.recipientName = 'Recipient name is required';
      }
      if (!formData.recipient_details.address.line1.trim()) {
        newErrors.addressLine1 = 'Address line 1 is required';
      }
      if (!formData.recipient_details.address.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.recipient_details.address.state.trim()) {
        newErrors.state = 'State is required';
      }
      if (!formData.recipient_details.address.postal_code.trim()) {
        newErrors.postalCode = 'ZIP code is required';
      }
      if (formData.payout_method === 'digital_check' && !formData.recipient_details.email) {
        newErrors.email = 'Email is required for digital checks';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 'amount') setCurrentStep('recipient');
      else if (currentStep === 'recipient') setCurrentStep('review');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'recipient') setCurrentStep('amount');
    else if (currentStep === 'review') setCurrentStep('recipient');
  };

  const handleSubmit = async () => {
    if (!validateStep('review')) return;

    const result = await createDraftPayout(formData);
    if (result.success) {
      onPayoutCreated?.();
      // Reset form
      setFormData({
        user_id: userId,
        landlord_id: userId,
        portfolio_id: portfolioId,
        property_id: '',
        total_amount: 0,
        recipient_details: {
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
        },
        payout_method: 'digital_check',
        memo: '',
        source_account_name: '',
        due_date: ''
      });
      setCurrentStep('amount');
    }
  };

  const steps = ['Amount & Method', 'Recipient Details', 'Review & Send'];
  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case 'amount': return 0;
      case 'recipient': return 1;
      case 'review': return 2;
      default: return 0;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Create Payout
        </CardTitle>
        
        {/* Progress Steps */}
        <div className="mt-6">
          <Stepper currentStep={getCurrentStepIndex()} steps={steps} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Amount & Method */}
        {currentStep === 'amount' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payout Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10000"
                    value={formData.total_amount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      total_amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0.00"
                    className={`pl-8 ${errors.amount ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payout Method</Label>
                <Select
                  value={formData.payout_method}
                  onValueChange={(value: 'check' | 'digital_check' | 'ach') => 
                    setFormData(prev => ({ ...prev, payout_method: value }))
                  }
                >
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
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {getPaymentMethodDescription(formData.payout_method)}
                  </p>
                  {formData.payout_method === 'digital_check' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      💡 Digital checks are sent via email and can be deposited instantly by the recipient
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sourceAccount">Source Account</Label>
                {accountsLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                ) : bankAccounts.length === 0 ? (
                  <div className="space-y-3">
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                      <CreditCard className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-medium">No bank accounts linked.</span>{' '}
                        Link your bank account through Plaid to enable automatic payments. You can save this payout as a draft and{' '}
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setShowLinkAccountsModal(true)}
                          className="h-auto p-0 text-orange-600 hover:text-orange-700"
                        >
                          link your bank accounts
                        </Button>{' '}
                        later.
                      </AlertDescription>
                    </Alert>
                    <Input
                      value="Default/Unassigned"
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={formData.source_account_id || '__default'}
                      onValueChange={(value) => {
                        if (value === 'link_new') {
                          setShowLinkAccountsModal(true);
                        } else if (value === '__default') {
                          setFormData(prev => ({
                            ...prev,
                            source_account_id: undefined,
                            source_account_name: 'Default/Unassigned'
                          }));
                        } else {
                          const selectedAccount = bankAccounts.find(acc => acc.id === value);
                          const accountLabel = selectedAccount 
                            ? `${selectedAccount.institution_name || 'Bank'} ••••${selectedAccount.mask || '0000'}`
                            : 'Default/Unassigned';
                          setFormData(prev => ({
                            ...prev,
                            source_account_id: value || undefined,
                            source_account_name: accountLabel
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default/Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="__default">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Default/Unassigned</span>
                          </div>
                        </SelectItem>
                        {bankAccounts.map((account) => {
                          const accountLabel = `${account.institution_name || 'Bank'} ••••${account.mask || '0000'}`;
                          const isActive = account.status === 'active';
                          const hasCheckbookError = account.metadata?.checkbook_sync_error;
                          return (
                            <SelectItem 
                              key={account.id} 
                              value={account.id}
                              disabled={!isActive}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col items-start">
                                  <span className={!isActive ? 'text-muted-foreground' : ''}>{accountLabel}</span>
                                  {account.account_name && (
                                    <span className="text-xs text-muted-foreground">{account.account_name}</span>
                                  )}
                                  {hasCheckbookError && (
                                    <span className="text-xs text-destructive">⚠ Sync error with payment processor</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {account.is_default_for_payouts && <Badge variant="secondary" className="text-xs">Default</Badge>}
                                  <Badge 
                                    variant={isActive ? "default" : "secondary"} 
                                    className={`text-xs ${isActive ? 'bg-green-600' : 'bg-orange-500'}`}
                                  >
                                    {isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="link_new">
                          <div className="flex items-center gap-2 text-primary">
                            <Plus className="h-4 w-4" />
                            <span>Link New Bank Account</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.sourceAccount && (
                      <p className="text-sm text-destructive">{errors.sourceAccount}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border shadow-md z-50">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date);
                        setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }));
                        setDueDateOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Textarea
                id="memo"
                value={formData.memo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="Add a note or description for this payout..."
                rows={3}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Draft Mode:</strong> {!formData.source_account_id ? 'This payout will be saved as a draft since no payment account is selected. ' : ''}
                This is a sandbox environment - no real money will be transferred. Maximum amount is $10,000 for testing.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Recipient Details */}
        {currentStep === 'recipient' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">Recipient Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Full Name *</Label>
                <Input
                  id="recipientName"
                  value={formData.recipient_details.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recipient_details: { ...prev.recipient_details, name: e.target.value }
                  }))}
                  placeholder="John Doe"
                  className={errors.recipientName ? 'border-destructive' : ''}
                />
                {errors.recipientName && (
                  <p className="text-sm text-destructive">{errors.recipientName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email {formData.payout_method === 'digital_check' && '*'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.recipient_details.email || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recipient_details: { ...prev.recipient_details, email: e.target.value }
                  }))}
                  placeholder="john.doe@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.recipient_details.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  recipient_details: { ...prev.recipient_details, phone: e.target.value }
                }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Mailing Address</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={formData.recipient_details.address.line1}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      recipient_details: {
                        ...prev.recipient_details,
                        address: { ...prev.recipient_details.address, line1: e.target.value }
                      }
                    }))}
                    placeholder="123 Main Street"
                    className={errors.addressLine1 ? 'border-destructive' : ''}
                  />
                  {errors.addressLine1 && (
                    <p className="text-sm text-destructive">{errors.addressLine1}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.recipient_details.address.line2 || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      recipient_details: {
                        ...prev.recipient_details,
                        address: { ...prev.recipient_details.address, line2: e.target.value }
                      }
                    }))}
                    placeholder="Apt 4B, Suite 100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.recipient_details.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recipient_details: {
                          ...prev.recipient_details,
                          address: { ...prev.recipient_details.address, city: e.target.value }
                        }
                      }))}
                      placeholder="New York"
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.recipient_details.address.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recipient_details: {
                          ...prev.recipient_details,
                          address: { ...prev.recipient_details.address, state: e.target.value }
                        }
                      }))}
                      placeholder="NY"
                      className={errors.state ? 'border-destructive' : ''}
                    />
                    {errors.state && (
                      <p className="text-sm text-destructive">{errors.state}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP Code *</Label>
                    <Input
                      id="postalCode"
                      value={formData.recipient_details.address.postal_code}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recipient_details: {
                          ...prev.recipient_details,
                          address: { ...prev.recipient_details.address, postal_code: e.target.value }
                        }
                      }))}
                      placeholder="10001"
                      className={errors.postalCode ? 'border-destructive' : ''}
                    />
                    {errors.postalCode && (
                      <p className="text-sm text-destructive">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Payout Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payout Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      <CurrencyDisplay amount={formData.total_amount} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <Badge variant="secondary" className="capitalize">
                      {formData.payout_method.replace('_', ' ')}
                    </Badge>
                  </div>
                  {formData.memo && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Memo:</p>
                      <p className="text-sm">{formData.memo}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{formData.recipient_details.name}</p>
                  {formData.recipient_details.email && (
                    <p className="text-sm text-muted-foreground">{formData.recipient_details.email}</p>
                  )}
                  {formData.recipient_details.phone && (
                    <p className="text-sm text-muted-foreground">{formData.recipient_details.phone}</p>
                  )}
                  <div className="pt-2 border-t text-sm">
                    <p>{formData.recipient_details.address.line1}</p>
                    {formData.recipient_details.address.line2 && (
                      <p>{formData.recipient_details.address.line2}</p>
                    )}
                    <p>
                      {formData.recipient_details.address.city}, {formData.recipient_details.address.state} {formData.recipient_details.address.postal_code}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sandbox Mode:</strong> This payout will be processed in the test environment. 
                {getPaymentMethodDescription(formData.payout_method)}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 'amount'}
          >
            Previous
          </Button>

          {currentStep !== 'review' ? (
            <Button onClick={handleNextStep}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="min-w-32"
            >
              {isLoading ? 'Saving...' : 'Save Draft'}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Plaid Link Accounts Modal */}
      {showLinkAccountsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Link Your Bank Account</h3>
            <p className="text-muted-foreground mb-6">
              Connect your bank account securely through Plaid to use as a funding source for payments.
            </p>
            <div className="flex gap-3">
              <PlaidLinkAccounts
                onSuccess={() => {
                  setShowLinkAccountsModal(false);
                  fetchAccounts();
                }}
                onExit={() => setShowLinkAccountsModal(false)}
              />
              <Button 
                variant="outline" 
                onClick={() => setShowLinkAccountsModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};