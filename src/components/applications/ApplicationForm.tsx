import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceEvents } from '@/hooks/useMarketplaceEvents';

interface ApplicationFormProps {
  propertyId: string;
  unitId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  // Step 1: Contact Verification
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  
  // Step 2: Application Details
  preferredMoveDate: string;
  interestReason: string;
  propertyQuestions: string;
  howHeard: string;
  
  // Step 3: Confirmation
  dataConfirmed: boolean;
  priorityPayment: boolean;
}

const ApplicationForm = ({ propertyId, unitId, onSuccess, onCancel }: ApplicationFormProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferredMoveDate: '',
    interestReason: '',
    propertyQuestions: '',
    howHeard: '',
    dataConfirmed: false,
    priorityPayment: false
  });

  const { toast } = useToast();
  const marketplaceEvents = useMarketplaceEvents();

  const steps = ['Contact', 'Details', 'Confirm'];

  // Load existing draft and profile data on mount
  useEffect(() => {
    loadProfileAndDraft();
  }, [propertyId, unitId]);

  const loadProfileAndDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile and tenant profile data
      const [profileRes, tenantProfileRes, draftRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tenant_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('marketplace_applications')
          .select('*')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .eq('unit_id', unitId || null)
          .single()
      ]);

      const profile = profileRes.data;
      const tenantProfile = tenantProfileRes.data;
      const draft = draftRes.data;

      // Store profile data for display
      setProfileData({
        profile,
        tenantProfile
      });

      const answers = draft?.answers as any;

      // Auto-populate contact info and draft answers
      setFormData({
        contactName: draft?.contact_name || (profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''),
        contactEmail: draft?.contact_email || user.email || '',
        contactPhone: draft?.contact_phone || profile?.phone || '',
        preferredMoveDate: answers?.preferredMoveDate || '',
        interestReason: answers?.interestReason || '',
        propertyQuestions: answers?.propertyQuestions || '',
        howHeard: answers?.howHeard || '',
        dataConfirmed: answers?.dataConfirmed || false,
        priorityPayment: answers?.priorityPayment || false
      });
      
      if (draft?.contact_name && draft?.contact_email && draft?.contact_phone) {
        setStep(2);
      }
    } catch (error) {
      console.log('No existing data found, starting fresh');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('marketplace_applications')
        .upsert({
          user_id: user.id,
          property_id: propertyId,
          unit_id: unitId || null,
          status: 'draft' as const,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          answers: formData as any
        }, {
          onConflict: 'user_id,property_id,unit_id'
        });
    } catch (error) {
      console.log('Failed to save draft');
    }
  };

  const handleNext = async () => {
    // Validate current step
    if (step === 1) {
      if (!formData.contactName || !formData.contactEmail || !formData.contactPhone) {
        toast({
          title: "Required Fields",
          description: "Please fill in all contact information.",
          variant: "destructive",
        });
        return;
      }
    } else if (step === 2) {
      if (!formData.preferredMoveDate || !formData.interestReason || !formData.howHeard) {
        toast({
          title: "Required Fields",
          description: "Please fill in all application details.",
          variant: "destructive",
        });
        return;
      }
    }

    await saveDraft();
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Final validation
    if (!formData.dataConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all information is accurate.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get complete profile snapshot
      const [profileRes, tenantProfileRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tenant_profiles').select('*').eq('user_id', user.id).single()
      ]);

      const profile = profileRes.data;
      const tenantProfile = tenantProfileRes.data;

      // Submit application with property-specific answers and full profile snapshot
      const { error } = await supabase
        .from('marketplace_applications')
        .update({
          status: 'submitted' as const,
          answers: {
            preferredMoveDate: formData.preferredMoveDate,
            interestReason: formData.interestReason,
            propertyQuestions: formData.propertyQuestions,
            howHeard: formData.howHeard,
            dataConfirmed: formData.dataConfirmed,
            priorityPayment: formData.priorityPayment
          } as any,
          profile_snapshot: {
            // Profile data
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            phone: profile?.phone,
            email: user.email,
            
            // Tenant profile data
            monthly_income: tenantProfile?.monthly_income,
            employment_status: tenantProfile?.employment_status,
            credit_score: tenantProfile?.credit_score,
            voucher_holder: tenantProfile?.voucher_holder,
            voucher_amount: tenantProfile?.voucher_amount,
            housing_authority: tenantProfile?.housing_authority,
            city: tenantProfile?.city,
            zip_code: tenantProfile?.zip_code,
            has_pets: tenantProfile?.has_pets,
            pet_type: tenantProfile?.pet_type,
            reference_contacts: tenantProfile?.reference_contacts
          } as any
        })
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .eq('unit_id', unitId || null);

      if (error) throw error;

      // Track application submitted event
      marketplaceEvents.mutate({
        eventType: 'application_submitted',
        metadata: {
          property_id: propertyId,
          unit_id: unitId || null,
          priority_payment: formData.priorityPayment,
          has_voucher: tenantProfile?.voucher_holder || false,
          monthly_income: tenantProfile?.monthly_income || null
        }
      });

      toast({
        title: "Application Submitted",
        description: formData.priorityPayment 
          ? "Your priority application has been submitted and will be reviewed first!" 
          : "Your application has been submitted successfully. The landlord will review it shortly.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Review your contact information before proceeding with your application.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="contactName">Full Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => updateFormData('contactName', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email Address *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                placeholder="Enter your email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateFormData('contactPhone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Tell us about your interest in this specific property.
            </p>

            <div className="space-y-2">
              <Label htmlFor="preferredMoveDate">Preferred Move-in Date *</Label>
              <Input
                id="preferredMoveDate"
                type="date"
                value={formData.preferredMoveDate}
                onChange={(e) => updateFormData('preferredMoveDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestReason">Why are you interested in this property? *</Label>
              <Textarea
                id="interestReason"
                value={formData.interestReason}
                onChange={(e) => updateFormData('interestReason', e.target.value)}
                placeholder="Share what makes this property a good fit for you..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyQuestions">Any questions about this property?</Label>
              <Textarea
                id="propertyQuestions"
                value={formData.propertyQuestions}
                onChange={(e) => updateFormData('propertyQuestions', e.target.value)}
                placeholder="Ask the landlord anything specific about this property (optional)..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="howHeard">How did you hear about this property? *</Label>
              <Select value={formData.howHeard} onValueChange={(value) => updateFormData('howHeard', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openkey_marketplace">OpenKey Marketplace</SelectItem>
                  <SelectItem value="referral">Referral from Friend/Family</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="housing_authority">Housing Authority</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h3 className="font-semibold mb-3">Profile Summary</h3>
              {profileData?.tenantProfile ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yearly Income:</span>
                    <span className="font-medium">${profileData.tenantProfile.monthly_income?.toLocaleString() || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment:</span>
                    <span className="font-medium capitalize">{profileData.tenantProfile.employment_status?.replace('_', ' ') || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voucher:</span>
                    <span className="font-medium">{profileData.tenantProfile.voucher_holder ? 'Yes' : 'No'}</span>
                  </div>
                  {profileData.tenantProfile.has_pets && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pets:</span>
                      <span className="font-medium">{profileData.tenantProfile.pet_type || 'Yes'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Complete your tenant profile to show more details.</p>
              )}
            </div>

            <div className="rounded-lg border p-4 bg-muted/50">
              <h3 className="font-semibold mb-3">Application Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Move-in Date:</span>
                  <span className="font-medium">{formData.preferredMoveDate || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">How You Heard:</span>
                  <span className="font-medium capitalize">{formData.howHeard?.replace('_', ' ') || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <Checkbox
                  id="dataConfirmed"
                  checked={formData.dataConfirmed}
                  onCheckedChange={(checked) => updateFormData('dataConfirmed', checked as boolean)}
                />
                <Label htmlFor="dataConfirmed" className="text-sm font-normal cursor-pointer leading-relaxed">
                  I confirm that all information provided is accurate and complete. I understand that false information may result in application rejection.
                </Label>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-primary/5">
                <Checkbox
                  id="priorityPayment"
                  checked={formData.priorityPayment}
                  onCheckedChange={(checked) => updateFormData('priorityPayment', checked as boolean)}
                />
                <Label htmlFor="priorityPayment" className="text-sm font-normal cursor-pointer leading-relaxed">
                  🚀 <strong>Priority Application ($25)</strong> - Get your application reviewed first! Stand out from other applicants and receive a faster response from the landlord.
                </Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Stepper currentStep={step - 1} steps={steps} />
      
      {renderStep()}

      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        )}
        {step === 1 && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={handleNext} className="flex-1">
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Submitting...' : (formData.priorityPayment ? 'Submit Priority Application' : 'Submit Application')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ApplicationForm;