import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper } from '@/components/ui/stepper';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserPropertiesWithUnits } from '@/hooks/useUserPropertiesWithUnits';
import { Building2, Home, ArrowLeft, ArrowRight, Check, FileText, Loader2 } from 'lucide-react';

interface PHAEnrollmentFormProps {
  user: any;
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = ['Select PHA', 'Your Info & Units', 'Review & Submit'];

export const PHAEnrollmentForm = ({ user, onComplete, onCancel }: PHAEnrollmentFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedPHA, setSelectedPHA] = useState('');
  const [phaName, setPhaName] = useState('');
  const [phaLocation, setPhaLocation] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [landlordEmail, setLandlordEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('ach');
  const [selectedUnits, setSelectedUnits] = useState<{ propertyId: string; unitId: string | null }[]>([]);

  // Agency enrollment defaults
  const [agencyDefaults, setAgencyDefaults] = useState<{
    w9_required: boolean;
    default_required_docs: string[] | null;
    accepted_payment_methods: string[];
    default_requirements_notes: string | null;
  } | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);

  // Fetch user profile for name
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        if (name) setLandlordName(name);
      }
    };
    fetchProfile();
  }, [user.id]);

  // Fetch agency defaults when PHA is selected
  useEffect(() => {
    if (!selectedPHA) { setAgencyDefaults(null); setIsOnboarded(true); return; }
    const fetchDefaults = async () => {
      const { data } = await supabase
        .from('housing_authorities')
        .select('metadata, default_required_docs, accepted_payment_methods, default_requirements_notes, is_onboarded')
        .eq('id', selectedPHA)
        .single();
      if (data) {
        const meta = (data.metadata as any) || {};
        const accepted = (data as any).accepted_payment_methods || ['ach', 'digital_check'];
        setAgencyDefaults({
          w9_required: meta.w9_required_default !== false,
          default_required_docs: (data as any).default_required_docs || null,
          accepted_payment_methods: accepted,
          default_requirements_notes: (data as any).default_requirements_notes || null,
        });
        // Auto-select first accepted payment method if current isn't allowed
        const hasACH = accepted.includes('ach');
        const hasCheck = accepted.includes('check') || accepted.includes('digital_check');
        if (paymentMethod === 'ach' && !hasACH && hasCheck) setPaymentMethod('check');
        if (paymentMethod === 'check' && !hasCheck && hasACH) setPaymentMethod('ach');
        setIsOnboarded((data as any).is_onboarded ?? false);
      }
    };
    fetchDefaults();
  }, [selectedPHA]);

  // Fetch properties with units
  const { data: properties = [], isLoading: propertiesLoading } = useUserPropertiesWithUnits(user.id);

  const toggleUnit = (propertyId: string, unitId: string | null) => {
    setSelectedUnits(prev => {
      const exists = prev.some(u => u.propertyId === propertyId && u.unitId === unitId);
      if (exists) return prev.filter(u => !(u.propertyId === propertyId && u.unitId === unitId));
      return [...prev, { propertyId, unitId }];
    });
  };

  const isUnitSelected = (propertyId: string, unitId: string | null) =>
    selectedUnits.some(u => u.propertyId === propertyId && u.unitId === unitId);

  // Compute allowed payment methods for UI
  const allowedPayments = agencyDefaults?.accepted_payment_methods || ['ach', 'check'];
  const showACH = allowedPayments.includes('ach');
  const showCheck = allowedPayments.includes('check') || allowedPayments.includes('digital_check');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create agency_landlords record with agency defaults auto-populated
      const insertData: any = {
        agency_id: selectedPHA,
        landlord_id: user.id,
        landlord_name: landlordName,
        landlord_email: landlordEmail,
        payment_method: paymentMethod,
        w9_status: 'pending',
        onboarding_status: 'pending_review',
        properties_count: selectedUnits.length || 0,
      };

      // Auto-populate from agency defaults
      if (agencyDefaults) {
        insertData.w9_required = agencyDefaults.w9_required;
        if (agencyDefaults.default_required_docs && agencyDefaults.default_required_docs.length > 0) {
          insertData.additional_docs_required = agencyDefaults.default_required_docs;
        }
        if (agencyDefaults.default_requirements_notes) {
          insertData.requirements_notes = agencyDefaults.default_requirements_notes;
        }
      }

      const { data: regData, error: regError } = await supabase
        .from('agency_landlords')
        .insert(insertData)
        .select('id')
        .single();

      if (regError) throw regError;

      // Insert unit registrations
      if (selectedUnits.length > 0 && regData) {
        const unitRows = selectedUnits.map(u => ({
          agency_landlord_id: regData.id,
          property_id: u.propertyId,
          unit_id: u.unitId,
        }));
        const { error: unitError } = await supabase
          .from('agency_landlord_units')
          .insert(unitRows);
        if (unitError) console.error('Failed to register units:', unitError);
      }

      toast.success('Enrollment submitted! Your request is pending PHA review.');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = () => {
    switch (currentStep) {
      case 0: return !!selectedPHA;
      case 1: return !!landlordName && !!landlordEmail;
      case 2: return true;
      default: return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Registrations
        </Button>
      </div>

      <Stepper currentStep={currentStep} steps={STEPS} className="mb-8" />

      {/* Step 0: Select PHA */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Select Your Housing Authority
            </CardTitle>
            <CardDescription>Search for the PHA you want to register with. Each PHA will review your request and may set specific requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Housing Authority *</Label>
              <HousingAuthoritySelector
                value={selectedPHA}
                onSelect={(authority) => {
                  setSelectedPHA(authority?.id || '');
                  setPhaName(authority?.name || '');
                }}
              />
            </div>
            {phaName && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">Selected: {phaName}</p>
                {phaLocation && <p className="text-xs text-muted-foreground">{phaLocation}</p>}
              </div>
            )}
            {selectedPHA && !isOnboarded && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {phaName || 'This agency'} is not yet on OpenKey
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your enrollment will be saved as a pre-registration and processed once the agency joins the platform.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Info + Units */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Your Information
              </CardTitle>
              <CardDescription>Confirm your details and preferred payment method. Banking details will be collected after PHA approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Legal Name *</Label>
                  <Input id="name" value={landlordName} onChange={e => setLandlordName(e.target.value)} placeholder="Full legal name" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={landlordEmail} onChange={e => setLandlordEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Payment Preference *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {showACH && <SelectItem value="ach">ACH / Direct Deposit</SelectItem>}
                    {showCheck && <SelectItem value="check">Mailed Check</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentMethod === 'ach' ? 'Bank details will be collected after approval.' : 'Mailing address will be collected after approval.'}
                </p>
                {agencyDefaults && !showACH && (
                  <p className="text-xs text-amber-600 mt-1">This PHA only accepts mailed checks.</p>
                )}
                {agencyDefaults && !showCheck && (
                  <p className="text-xs text-amber-600 mt-1">This PHA only accepts ACH / Direct Deposit.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" /> Select Units to Enroll
              </CardTitle>
              <CardDescription>Choose which properties/units to register for Section 8 with this PHA. You can add more later.</CardDescription>
            </CardHeader>
            <CardContent>
              {propertiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : properties.length === 0 ? (
                <div className="py-8 text-center">
                  <Home className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No properties found. Add properties from your dashboard first, or continue without selecting units.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {properties.map(property => (
                    <div key={property.id} className="border border-border rounded-lg p-4">
                      <p className="font-medium mb-2">{property.address}</p>
                      {property.property_units && property.property_units.length > 0 ? (
                        <div className="space-y-2 ml-4">
                          {property.property_units.map(unit => (
                            <label key={unit.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                              <Checkbox
                                checked={isUnitSelected(property.id, unit.id)}
                                onCheckedChange={() => toggleUnit(property.id, unit.id)}
                              />
                              <span className="text-sm">Unit {unit.unit_number}</span>
                              {unit.monthly_rent && <span className="text-sm text-muted-foreground">${unit.monthly_rent}/mo</span>}
                              {unit.status && <span className="text-xs text-muted-foreground capitalize">({unit.status})</span>}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 ml-4">
                          <Checkbox
                            checked={isUnitSelected(property.id, null)}
                            onCheckedChange={() => toggleUnit(property.id, null)}
                          />
                          <span className="text-sm">Entire property</span>
                        </label>
                      )}
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedUnits.length} unit{selectedUnits.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Review */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" /> Review & Submit
            </CardTitle>
            <CardDescription>Your enrollment request will be sent to the PHA for review. They may request additional documents (W-9, etc.) after reviewing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Housing Authority</p>
                  <p className="font-medium">{phaName}</p>
                  {phaLocation && <p className="text-xs text-muted-foreground">{phaLocation}</p>}
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Legal Name</p>
                  <p className="font-medium">{landlordName}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{landlordEmail}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Payment Preference</p>
                  <p className="font-medium capitalize">{paymentMethod === 'ach' ? 'ACH / Direct Deposit' : 'Mailed Check'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg col-span-full">
                  <p className="text-sm text-muted-foreground">Units to Enroll</p>
                  {selectedUnits.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {selectedUnits.map((su, i) => {
                        const prop = properties.find((p: any) => p.id === su.propertyId);
                        const unit = prop?.property_units?.find(u => u.id === su.unitId);
                        return (
                          <p key={i} className="text-sm font-medium">
                            {prop?.address || 'Property'}
                            {unit ? ` — Unit ${unit.unit_number}` : ' (entire property)'}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="font-medium text-muted-foreground">No units selected (can add after approval)</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>What happens next:</strong> Your request will be reviewed by {phaName}. They'll specify any required documents (W-9, etc.) and you'll be notified when action is needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!canAdvance()}>
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Check className="w-4 h-4 mr-2" /> Submit Enrollment</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
