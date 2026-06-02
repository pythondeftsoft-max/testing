import { useState, useEffect } from 'react';
import { DollarSign, Plus, Building2, CreditCard, ChevronRight, ChevronLeft, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper } from '@/components/ui/stepper';
import { useVendorPayments } from '@/hooks/useVendorPayments';
import { useAllVendors } from '@/hooks/useAllVendors';
import { PlaidLinkAccounts } from '@/components/PlaidLinkAccounts';
import { DatePicker } from '@/components/DatePicker';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface Property {
  id: string;
  address: string;
  portfolio_id?: string;
  property_units?: Array<{
    id: string;
    unit_number: string;
    unit_name?: string;
  }>;
}

interface VendorPaymentModalProps {
  userId: string;
  portfolioId?: string;
  propertyId?: string;
  vendorName?: string;
  triggerText?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "blue" | "gold" | "success" | "warning";
  onPaymentRecorded?: () => void;
}

const VendorPaymentModal = ({ 
  userId, 
  portfolioId, 
  propertyId, 
  vendorName, 
  triggerText = "Record Vendor Payment",
  triggerVariant = "blue",
  onPaymentRecorded 
}: VendorPaymentModalProps) => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [customVendorName, setCustomVendorName] = useState('');
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [amount, setAmount] = useState('');
  const [trackingType, setTrackingType] = useState<'plaid' | 'manual'>('manual');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [maintenanceRequestId, setMaintenanceRequestId] = useState('none');
  const [markMaintenanceComplete, setMarkMaintenanceComplete] = useState(true);
  const [memo, setMemo] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentReference, setPaymentReference] = useState('');
  const [showPlaidLink, setShowPlaidLink] = useState(false);

  const steps = ['Payment Details', 'Tracking & Notes'];

  const { recordPayment, loading } = useVendorPayments();
  const { vendors, loading: vendorsLoading } = useAllVendors();
  const { accounts, fetchAccounts } = useBankAccounts();
  const { toast } = useToast();

  // Fetch open maintenance requests for the selected property
  const { data: maintenanceRequests } = useQuery({
    queryKey: ['maintenance-requests', selectedPropertyId, selectedUnitId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      
      let query = supabase
        .from('maintenance_requests')
        .select('id, title, priority, created_at, status')
        .eq('property_id', selectedPropertyId)
        .not('status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false });
      
      if (selectedUnitId && selectedUnitId !== 'all') {
        query = query.eq('unit_id', selectedUnitId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPropertyId,
  });

  useEffect(() => {
    if (open && !propertyId) {
      fetchProperties();
    }
  }, [open, userId, portfolioId, propertyId]);

  useEffect(() => {
    if (vendorName) {
      // Check if vendorName matches an existing vendor
      const existingVendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
      if (existingVendor) {
        setSelectedVendorId(existingVendor.id);
        setIsCustomVendor(false);
      } else {
        setCustomVendorName(vendorName);
        setIsCustomVendor(true);
      }
    }
  }, [vendorName, vendors]);

  const fetchProperties = async () => {
    try {
    let query = supabase
      .from('properties')
      .select('id, address, portfolio_id, property_units(id, unit_number, unit_name)')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('address');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setProperties(data || []);
      if (data && data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleRecordPayment = async () => {
    const recipientName = isCustomVendor ? customVendorName : vendors.find(v => v.id === selectedVendorId)?.name || '';
    
    if (!selectedPropertyId || !amount || !recipientName) return;

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    try {
      await recordPayment({
        landlord_id: userId,
        portfolio_id: selectedProperty?.portfolio_id || portfolioId || undefined,
        property_id: selectedPropertyId,
        unit_id: selectedUnitId && selectedUnitId !== 'all' ? selectedUnitId : undefined,
        recipient_type: 'vendor',
        recipient_name: recipientName,
        amount: parseFloat(amount),
        currency_code: 'USD',
        payment_method: trackingType === 'plaid' ? selectedBankAccountId : 'manual',
        paid_at: paymentDate.toISOString(),
        reference: paymentReference.trim() || undefined,
        memo: memo || undefined,
        maintenance_request_id: maintenanceRequestId && maintenanceRequestId !== 'none' && markMaintenanceComplete ? maintenanceRequestId : null,
      });

      // Reset form
      resetForm();
      setOpen(false);
      onPaymentRecorded?.();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setAmount('');
    setSelectedVendorId('');
    setCustomVendorName('');
    setIsCustomVendor(false);
    setSelectedUnitId('');
    setTrackingType('manual');
    setSelectedBankAccountId('');
    setMaintenanceRequestId('none');
    setMarkMaintenanceComplete(true);
    setMemo('');
    setPaymentDate(new Date());
    setPaymentReference('');
    setShowPlaidLink(false);
    if (!propertyId) {
      setSelectedPropertyId('');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Payment Details
        return !!(selectedPropertyId && amount && (isCustomVendor ? customVendorName : selectedVendorId));
      case 1: // Tracking & Notes
        if (trackingType === 'plaid') {
          return !!(selectedBankAccountId && paymentDate);
        }
        return !!paymentDate; // Manual only needs date
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (!validateStep(currentStep)) {
      toast({
        title: "Please complete required fields",
        description: "Fill in all required information before proceeding.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePlaidSuccess = async (data: any) => {
    setShowPlaidLink(false);
    // Refresh the bank accounts list
    await fetchAccounts();
    // Auto-select the newly added account if available
    if (data?.account_id) {
      setSelectedBankAccountId(data.account_id);
    }
    toast({
      title: "Success!",
      description: "Bank account connected successfully.",
    });
  };

  const handlePlaidExit = () => {
    setShowPlaidLink(false);
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Payment Details
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!propertyId && (
                <div>
                  <Label htmlFor="property">Property <span className="text-destructive">*</span></Label>
                  <Select value={selectedPropertyId} onValueChange={(value) => {
                    setSelectedPropertyId(value);
                    setSelectedUnitId(''); // Reset unit selection when property changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show Unit selector if selected property has multiple units */}
              {selectedProperty && selectedProperty.property_units && 
               selectedProperty.property_units.length > 1 && (
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Units / General</SelectItem>
                      {selectedProperty.property_units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unit_name || `Unit ${unit.unit_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor-select">Vendor/Recipient <span className="text-destructive">*</span></Label>
                <Select 
                  value={isCustomVendor ? 'custom' : selectedVendorId} 
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setIsCustomVendor(true);
                      setSelectedVendorId('');
                    } else {
                      setIsCustomVendor(false);
                      setSelectedVendorId(value);
                      setCustomVendorName('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select vendor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Vendor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {isCustomVendor && (
                  <Input
                    className="mt-2"
                    value={customVendorName}
                    onChange={(e) => setCustomVendorName(e.target.value)}
                    placeholder="Enter new vendor name"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                  <DollarSign className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div>
              <Label>Link to Maintenance Request (Optional)</Label>
              <Select value={maintenanceRequestId} onValueChange={setMaintenanceRequestId}>
                <SelectTrigger>
                  <SelectValue placeholder="No linked request" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked request</SelectItem>
                  {maintenanceRequests?.map((request) => (
                    <SelectItem key={request.id} value={request.id}>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        <span className="truncate">{request.title}</span>
                        <span className={cn(
                          "ml-auto text-xs px-1.5 py-0.5 rounded",
                          request.priority === 'high' && "bg-destructive/20 text-destructive",
                          request.priority === 'medium' && "bg-warning/20 text-warning",
                          request.priority === 'low' && "bg-muted text-muted-foreground"
                        )}>
                          {request.priority?.toUpperCase()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {maintenanceRequests && maintenanceRequests.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No open maintenance requests for this property
                </p>
              )}
              
              {/* Show checkbox when maintenance request is selected */}
              {maintenanceRequestId && maintenanceRequestId !== 'none' && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-muted/50 rounded-md">
                  <Checkbox
                    id="mark-complete"
                    checked={markMaintenanceComplete}
                    onCheckedChange={(checked) => setMarkMaintenanceComplete(checked === true)}
                  />
                  <Label htmlFor="mark-complete" className="text-sm font-normal cursor-pointer">
                    Mark this maintenance request as completed
                  </Label>
                </div>
              )}
            </div>
          </div>
        );

      case 1: // Tracking & Notes
        return (
          <div className="space-y-4">
            <div>
              <Label>How would you like to track this payment?</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setTrackingType('plaid')}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-all",
                    trackingType === 'plaid' 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Building2 className="h-5 w-5 mb-2 text-primary" />
                  <div className="font-medium">Track with Plaid</div>
                  <div className="text-xs text-muted-foreground">
                    Tag to a linked bank account
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setTrackingType('manual')}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-all",
                    trackingType === 'manual' 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <CreditCard className="h-5 w-5 mb-2 text-primary" />
                  <div className="font-medium">Enter Manually</div>
                  <div className="text-xs text-muted-foreground">
                    Record without account linking
                  </div>
                </button>
              </div>
            </div>

            {/* Show bank account dropdown only if Plaid selected */}
            {trackingType === 'plaid' && (
              <div>
                <Label>Linked Bank Account <span className="text-destructive">*</span></Label>
                {accounts && accounts.length > 0 ? (
                  <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.status === 'linked' || a.status === 'active').map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{account.institution_name} ••••{account.mask}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 border border-dashed rounded-lg text-center mt-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      No bank accounts linked yet.
                    </p>
                    <PlaidLinkAccounts
                      onSuccess={handlePlaidSuccess}
                      onExit={handlePlaidExit}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-date">Payment Date <span className="text-destructive">*</span></Label>
                <DatePicker
                  date={paymentDate}
                  onDateChange={(date) => date && setPaymentDate(date)}
                  placeholder="Select payment date"
                />
              </div>

              <div>
                <Label htmlFor="payment-reference">Reference Number</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Check #, invoice #, confirmation, etc."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="memo">Memo/Description</Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment notes"
                rows={2}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <DollarSign className="h-4 w-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>
        
        <div className="mb-6">
          <Stepper currentStep={currentStep} steps={steps} />
        </div>

        {renderStepContent()}

        <div className="flex gap-2 pt-4">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}
          
          <div className="flex-1" />
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep} disabled={!validateStep(currentStep)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleRecordPayment} 
              disabled={loading || !validateStep(currentStep)}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          )}
          
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorPaymentModal;
