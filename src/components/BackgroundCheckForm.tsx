import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, DollarSign, Clock } from 'lucide-react';
import { validateEmailSecure } from '@/utils/inputValidation';

interface BackgroundCheckFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  lastFourSSN: string; // Changed from full SSN to last 4 digits
  phone: string;
  email: string;
  
  // Address Information  
  currentAddress: string;
  city: string;
  state: string;
  zipCode: string;
  previousAddress?: string;
  
  // Employment Information
  currentEmployer?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  
  // Consent and Legal
  consentGiven: boolean;
  informationAccurate: boolean;
  
  // Additional Notes
  notes?: string;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  property?: {
    id: string;
    address: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  tenant_profile?: {
    monthly_income?: string | number;
    employment_status?: string;
    city?: string;
    zip_code?: string;
  };
}

interface BackgroundCheckFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: BackgroundCheckFormData) => Promise<void>;
  tenant: Tenant;
  isLoading?: boolean;
  initialFormData?: any; // For pre-populating from previous checks
}

const BackgroundCheckForm: React.FC<BackgroundCheckFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tenant,
  isLoading = false,
  initialFormData
}) => {
  const [currentStep, setCurrentStep] = useState<'form' | 'review'>('form');
  
  // Initialize form data with priority: initialFormData > tenant profile > empty
  const initializeFormData = (): BackgroundCheckFormData => {
    const baseData = {
      firstName: tenant.first_name || '',
      lastName: tenant.last_name || '',
      dateOfBirth: '',
      lastFourSSN: '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      currentAddress: tenant.property?.address || '',
      city: tenant.property?.city || tenant.tenant_profile?.city || '',
      state: tenant.property?.state || '',
      zipCode: tenant.property?.zip_code || tenant.tenant_profile?.zip_code || '',
      previousAddress: '',
      currentEmployer: '',
      employmentStatus: tenant.tenant_profile?.employment_status || '',
      monthlyIncome: tenant.tenant_profile?.monthly_income?.toString() || '',
      consentGiven: false,
      informationAccurate: false,
      notes: ''
    };

    // If we have initial form data from a previous check, merge it
    if (initialFormData) {
      return {
        ...baseData,
        firstName: initialFormData.personalInfo?.firstName || baseData.firstName,
        lastName: initialFormData.personalInfo?.lastName || baseData.lastName,
        dateOfBirth: initialFormData.personalInfo?.dateOfBirth || baseData.dateOfBirth,
        lastFourSSN: initialFormData.personalInfo?.lastFourSSN || baseData.lastFourSSN,
        phone: initialFormData.personalInfo?.phone || baseData.phone,
        email: initialFormData.personalInfo?.email || baseData.email,
        currentAddress: initialFormData.address?.street || baseData.currentAddress,
        city: initialFormData.address?.city || baseData.city,
        state: initialFormData.address?.state || baseData.state,
        zipCode: initialFormData.address?.zipCode || baseData.zipCode,
        currentEmployer: initialFormData.employment?.employer || baseData.currentEmployer,
        employmentStatus: initialFormData.employment?.position || baseData.employmentStatus,
        monthlyIncome: initialFormData.employment?.monthlyIncome?.toString() || baseData.monthlyIncome,
        consentGiven: false, // Always require new consent
        informationAccurate: false, // Always require new confirmation
        notes: initialFormData.notes || baseData.notes
      };
    }

    return baseData;
  };

  const [formData, setFormData] = useState<BackgroundCheckFormData>(initializeFormData());

  // Reset form data when the modal opens/closes or initial data changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initializeFormData());
      setValidationErrors({});
      setCurrentStep('form');
    }
  }, [isOpen, initialFormData]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required field validation
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.currentAddress.trim()) errors.currentAddress = 'Current address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.zipCode.trim()) errors.zipCode = 'Zip code is required';
    
    // Format validation for optional last 4 SSN
    if (formData.lastFourSSN && !/^\d{4}$/.test(formData.lastFourSSN)) {
      errors.lastFourSSN = 'Must be 4 digits';
    }
    
    if (formData.email && !validateEmailSecure(formData.email).valid) {
      errors.email = 'Valid email address required';
    }
    
    // Date validation
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18 || age > 120) {
        errors.dateOfBirth = 'Must be between 18 and 120 years old';
      }
    }
    
    // Consent validation
    if (!formData.consentGiven) errors.consentGiven = 'Consent is required';
    if (!formData.informationAccurate) errors.informationAccurate = 'Information accuracy confirmation required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof BackgroundCheckFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    if (validateForm()) {
      setCurrentStep('review');
    }
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleClose = () => {
    setCurrentStep('form');
    setValidationErrors({});
    onClose();
  };

  const estimatedCost = 25.00; // Base cost for background check
  const estimatedTime = "24-48 hours";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {currentStep === 'form' ? 'Background Check Information' : 'Review & Confirm'}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'form' ? (
          <div className="space-y-6">
            {/* Rerun notification */}
            {initialFormData && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">Rerunning Background Check</p>
                    <p className="text-amber-700">This form has been pre-populated with data from the previous background check. Please review and update any information before submitting.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cost and Time Estimate */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">${estimatedCost}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{estimatedTime}</span>
                </div>
              </div>
              <Badge variant="secondary">Basic Check</Badge>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                Personal Information
                <span className="text-xs text-destructive">*Required</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={validationErrors.firstName ? 'border-destructive' : ''}
                  />
                  {validationErrors.firstName && (
                    <span className="text-xs text-destructive">{validationErrors.firstName}</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={validationErrors.lastName ? 'border-destructive' : ''}
                  />
                  {validationErrors.lastName && (
                    <span className="text-xs text-destructive">{validationErrors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={validationErrors.dateOfBirth ? 'border-destructive' : ''}
                  />
                  {validationErrors.dateOfBirth && (
                    <span className="text-xs text-destructive">{validationErrors.dateOfBirth}</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastFourSSN">Last 4 SSN Digits (Optional)</Label>
                  <Input
                    id="lastFourSSN"
                    value={formData.lastFourSSN}
                    onChange={(e) => handleInputChange('lastFourSSN', e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                    className={validationErrors.lastFourSSN ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional but helps improve identity verification accuracy
                  </p>
                  {validationErrors.lastFourSSN && (
                    <span className="text-xs text-destructive">{validationErrors.lastFourSSN}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={validationErrors.email ? 'border-destructive' : ''}
                  />
                  {validationErrors.email && (
                    <span className="text-xs text-destructive">{validationErrors.email}</span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Address Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="currentAddress">Current Address *</Label>
                <Input
                  id="currentAddress"
                  value={formData.currentAddress}
                  onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                  className={validationErrors.currentAddress ? 'border-destructive' : ''}
                />
                {validationErrors.currentAddress && (
                  <span className="text-xs text-destructive">{validationErrors.currentAddress}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={validationErrors.city ? 'border-destructive' : ''}
                  />
                  {validationErrors.city && (
                    <span className="text-xs text-destructive">{validationErrors.city}</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                    className={validationErrors.state ? 'border-destructive' : ''}
                  />
                  {validationErrors.state && (
                    <span className="text-xs text-destructive">{validationErrors.state}</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="12345"
                    className={validationErrors.zipCode ? 'border-destructive' : ''}
                  />
                  {validationErrors.zipCode && (
                    <span className="text-xs text-destructive">{validationErrors.zipCode}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousAddress">Previous Address (Optional)</Label>
                <Input
                  id="previousAddress"
                  value={formData.previousAddress}
                  onChange={(e) => handleInputChange('previousAddress', e.target.value)}
                  placeholder="Previous address if lived there within last 2 years"
                />
              </div>
            </div>

            <Separator />

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Employment Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentEmployer">Current Employer</Label>
                  <Input
                    id="currentEmployer"
                    value={formData.currentEmployer}
                    onChange={(e) => handleInputChange('currentEmployer', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Employment Status</Label>
                  <Select
                    value={formData.employmentStatus}
                    onValueChange={(value) => handleInputChange('employmentStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  value={formData.monthlyIncome}
                  onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>

            <Separator />

            {/* Legal and Consent */}
            <div className="space-y-4">
              <h3 className="font-medium">Consent & Legal</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consentGiven"
                    checked={formData.consentGiven}
                    onCheckedChange={(checked) => handleInputChange('consentGiven', !!checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="consentGiven" className="text-sm font-normal cursor-pointer">
                      I consent to this background check being performed *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you authorize the running of a background check.
                    </p>
                  </div>
                </div>
                {validationErrors.consentGiven && (
                  <span className="text-xs text-destructive ml-6">{validationErrors.consentGiven}</span>
                )}
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="informationAccurate"
                    checked={formData.informationAccurate}
                    onCheckedChange={(checked) => handleInputChange('informationAccurate', !!checked)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="informationAccurate" className="text-sm font-normal cursor-pointer">
                      I confirm that all information provided is accurate *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inaccurate information may result in incomplete or invalid results.
                    </p>
                  </div>
                </div>
                {validationErrors.informationAccurate && (
                  <span className="text-xs text-destructive ml-6">{validationErrors.informationAccurate}</span>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional information that might be relevant for the background check"
                rows={3}
              />
            </div>
          </div>
        ) : (
          /* Review Step */
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Please review all information carefully</p>
                  <p className="text-blue-700">Once submitted, this background check will be processed and you will be charged ${estimatedCost}</p>
                </div>
              </div>
            </div>

            {/* Review Summary */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Personal Information</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Date of Birth:</strong> {formData.dateOfBirth}</p>
                  <p><strong>Last 4 SSN:</strong> {formData.lastFourSSN || 'Not provided'}</p>
                  {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
                  {formData.email && <p><strong>Email:</strong> {formData.email}</p>}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Address Information</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p><strong>Current Address:</strong> {formData.currentAddress}</p>
                  <p><strong>City, State, Zip:</strong> {formData.city}, {formData.state} {formData.zipCode}</p>
                  {formData.previousAddress && <p><strong>Previous Address:</strong> {formData.previousAddress}</p>}
                </div>
              </div>

              {(formData.currentEmployer || formData.employmentStatus || formData.monthlyIncome) && (
                <div>
                  <h4 className="font-medium mb-2">Employment Information</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {formData.currentEmployer && <p><strong>Employer:</strong> {formData.currentEmployer}</p>}
                    {formData.employmentStatus && <p><strong>Status:</strong> {formData.employmentStatus}</p>}
                    {formData.monthlyIncome && <p><strong>Monthly Income:</strong> ${formData.monthlyIncome}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="font-medium">Total Cost:</span>
                <span className="text-lg font-bold text-green-600">${estimatedCost}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'form' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Review Information
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('form')}>
                Back to Edit
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Processing...' : `Submit & Pay $${estimatedCost}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BackgroundCheckForm;