import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { CountrySelector } from '@/components/ui/country-selector';
import { getStatesForCountry, getStateLabelForCountry } from '@/lib/stateUtils';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';

interface ProfileCompletionModalProps {
  userId: string;
  missingFields: string[];
  currentProfile: any;
  onComplete: () => void;
  onDismiss?: () => void;
}

const ProfileCompletionModal = ({ userId, missingFields, currentProfile, onComplete, onDismiss }: ProfileCompletionModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    countryCode: currentProfile?.country_code || 'US',
    state: currentProfile?.state || '',
    city: currentProfile?.city || '',
    zipCode: currentProfile?.zip_code || '',
    voucherStatus: currentProfile?.voucher_status || '',
    housingAuthority: currentProfile?.housing_authority || '',
    housingAuthorityId: currentProfile?.housing_authority_id || '',
    bedroomsApproved: currentProfile?.bedrooms_approved || [],
    rentRangeMin: currentProfile?.rent_range_min?.toString() || '',
    rentRangeMax: currentProfile?.rent_range_max?.toString() || '',
    moveInWindow: currentProfile?.move_in_window || '',
    creditScoreRange: currentProfile?.credit_score_range || '',
    employmentStatus: currentProfile?.employment_status || '',
    monthlyIncome: currentProfile?.monthly_income?.toString() || '',
    hasEviction: currentProfile?.has_eviction ?? null,
    evictionDetails: currentProfile?.eviction_details || '',
    hasPets: currentProfile?.has_pets ?? null,
    petType: currentProfile?.pet_type || '',
    hasFelonies: currentProfile?.has_felonies ?? null,
    felonyDetails: currentProfile?.felony_details || '',
    hasAccessibilityNeeds: currentProfile?.has_accessibility_needs ?? null,
    accessibilityDetails: currentProfile?.accessibility_details || '',
  });

  const isMissing = (field: string) => missingFields.includes(field);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all missing fields are now filled
    const stillMissing: string[] = [];
    
    const isUS = (formData.countryCode || 'US') === 'US';
    if (isUS && isMissing('state') && !formData.state) stillMissing.push('State');
    if (isUS && isMissing('city') && !formData.city.trim()) stillMissing.push('City');
    if (isUS && isMissing('zip_code') && !formData.zipCode.trim()) stillMissing.push('Zip Code');
    if (isMissing('voucher_status') && !formData.voucherStatus) stillMissing.push('Voucher Status');
    if (isMissing('housing_authority') && !formData.housingAuthority.trim()) stillMissing.push('Housing Authority');
    if (isMissing('bedrooms_approved') && formData.bedroomsApproved.length === 0) stillMissing.push('Bedrooms Approved');
    if (isMissing('rent_range_min') && !formData.rentRangeMin) stillMissing.push('Minimum Rent');
    if (isMissing('rent_range_max') && !formData.rentRangeMax) stillMissing.push('Maximum Rent');
    if (isMissing('move_in_window') && !formData.moveInWindow) stillMissing.push('Move-in Timeline');
    if (isMissing('credit_score_range') && !formData.creditScoreRange) stillMissing.push('Credit Score Range');
    if (isMissing('employment_status') && !formData.employmentStatus) stillMissing.push('Employment Status');
    if (isMissing('monthly_income') && !formData.monthlyIncome) stillMissing.push('Yearly Income');
    if (isMissing('has_eviction') && formData.hasEviction === null) stillMissing.push('Eviction History');
    if (isMissing('has_pets') && formData.hasPets === null) stillMissing.push('Pet Ownership');
    if (isMissing('has_felonies') && formData.hasFelonies === null) stillMissing.push('Felony History');
    if (isMissing('has_accessibility_needs') && formData.hasAccessibilityNeeds === null) stillMissing.push('Accessibility Needs');

    if (stillMissing.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please complete: ${stillMissing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse yearly income to number
      let monthlyIncomeValue: number | null = null;
      if (formData.monthlyIncome) {
        const incomeMap: Record<string, number> = {
          'under-15000': 12000,
          '15000-25000': 20000,
          '25000-35000': 30000,
          '35000-50000': 42500,
          '50000-75000': 62500,
          '75000-plus': 90000,
        };
        monthlyIncomeValue = incomeMap[formData.monthlyIncome] || null;
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only update fields that were missing
      if (isMissing('state')) updateData.state = formData.state;
      if (isMissing('city')) updateData.city = formData.city.trim();
      if (isMissing('zip_code')) updateData.zip_code = formData.zipCode.trim();
      if (isMissing('voucher_status')) updateData.voucher_status = formData.voucherStatus;
      if (isMissing('housing_authority')) {
        updateData.housing_authority = formData.housingAuthority.trim();
        if (formData.housingAuthorityId) {
          updateData.housing_authority_id = formData.housingAuthorityId;
        }
      }
      if (isMissing('bedrooms_approved')) updateData.bedrooms_approved = formData.bedroomsApproved;
      if (isMissing('rent_range_min')) updateData.rent_range_min = parseFloat(formData.rentRangeMin);
      if (isMissing('rent_range_max')) updateData.rent_range_max = parseFloat(formData.rentRangeMax);
      if (isMissing('move_in_window')) updateData.move_in_window = formData.moveInWindow;
      if (isMissing('credit_score_range')) updateData.credit_score_range = formData.creditScoreRange;
      if (isMissing('employment_status')) updateData.employment_status = formData.employmentStatus;
      if (isMissing('monthly_income')) updateData.monthly_income = monthlyIncomeValue;
      if (isMissing('has_eviction')) {
        updateData.has_eviction = formData.hasEviction;
        if (formData.hasEviction && formData.evictionDetails) {
          updateData.eviction_details = formData.evictionDetails;
        }
      }
      if (isMissing('has_pets')) {
        updateData.has_pets = formData.hasPets;
        if (formData.hasPets && formData.petType) {
          updateData.pet_type = formData.petType;
        }
      }
      if (isMissing('has_felonies')) {
        updateData.has_felonies = formData.hasFelonies;
        if (formData.hasFelonies && formData.felonyDetails) {
          updateData.felony_details = formData.felonyDetails;
        }
      }
      if (isMissing('has_accessibility_needs')) {
        updateData.has_accessibility_needs = formData.hasAccessibilityNeeds;
        if (formData.hasAccessibilityNeeds && formData.accessibilityDetails) {
          updateData.accessibility_details = formData.accessibilityDetails;
        }
      }

      // Also update country code
      updateData.country_code = formData.countryCode;

      const { error } = await supabase
        .from('tenant_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been completed successfully!',
      });

      // Add delay to ensure database update is fully committed before refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && onDismiss) onDismiss(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-warning" />
            <DialogTitle>Complete Your Profile</DialogTitle>
          </div>
          <DialogDescription>
           Please fill in the missing information below to continue using your dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Location Fields */}
          {(formData.countryCode || 'US') === 'US' && (isMissing('state') || isMissing('city') || isMissing('zip_code')) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h3>
              
              {isMissing('state') && (
                <>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <CountrySelector
                      value={formData.countryCode}
                      onValueChange={(value) => {
                        setFormData({ ...formData, countryCode: value, state: '' });
                      }}
                      placeholder="Select country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">{getStateLabelForCountry(formData.countryCode)} *</Label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                      required
                    >
                      <option value="" disabled>Select {getStateLabelForCountry(formData.countryCode).toLowerCase()}</option>
                      {getStatesForCountry(formData.countryCode).map((state) => (
                        <option key={state.code} value={state.code}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isMissing('city') && (
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                )}
                {isMissing('zip_code') && (
                  <div>
                    <Label htmlFor="zipCode">Zip Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Housing Fields */}
          {(isMissing('voucher_status') || isMissing('housing_authority') || isMissing('bedrooms_approved') || 
            isMissing('rent_range_min') || isMissing('rent_range_max') || isMissing('move_in_window')) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Housing Requirements</h3>
              
              {isMissing('voucher_status') && (
                <div>
                  <Label htmlFor="voucherStatus">Do you have a Section 8 voucher? *</Label>
                  <select
                    id="voucherStatus"
                    value={formData.voucherStatus}
                    onChange={(e) => setFormData({ ...formData, voucherStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    required
                  >
                    <option value="" disabled>Select voucher status</option>
                    <option value="yes">Yes</option>
                    <option value="in-progress">In Progress</option>
                    <option value="no">No</option>
                  </select>
                </div>
              )}

              {isMissing('housing_authority') && (
                <div>
                  <Label>Which Housing Authority issued it? *</Label>
                  <HousingAuthoritySelector
                    value={formData.housingAuthorityId || ''}
                    textValue={formData.housingAuthority}
                    onSelect={(authority) => {
                      if (authority) {
                        setFormData({ ...formData, housingAuthorityId: authority.id, housingAuthority: authority.name });
                      } else {
                        setFormData({ ...formData, housingAuthorityId: '', housingAuthority: '' });
                      }
                    }}
                    stateFilter={formData.state || undefined}
                    required
                  />
                </div>
              )}

              {isMissing('bedrooms_approved') && (
                <div>
                  <Label>How many bedrooms are you approved for? *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['Studio/1BR', '2BR', '3BR', '4BR', '5BR+'].map((bedroom) => (
                      <label key={bedroom} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.bedroomsApproved.includes(bedroom)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, bedroomsApproved: [...formData.bedroomsApproved, bedroom] });
                            } else {
                              setFormData({ ...formData, bedroomsApproved: formData.bedroomsApproved.filter((b: string) => b !== bedroom) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{bedroom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(isMissing('rent_range_min') || isMissing('rent_range_max')) && (
                <div className="grid grid-cols-2 gap-4">
                  {isMissing('rent_range_min') && (
                    <div>
                      <Label htmlFor="rentRangeMin">Min Rent *</Label>
                      <Input
                        id="rentRangeMin"
                        type="number"
                        value={formData.rentRangeMin}
                        onChange={(e) => setFormData({ ...formData, rentRangeMin: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  {isMissing('rent_range_max') && (
                    <div>
                      <Label htmlFor="rentRangeMax">Max Rent *</Label>
                      <Input
                        id="rentRangeMax"
                        type="number"
                        value={formData.rentRangeMax}
                        onChange={(e) => setFormData({ ...formData, rentRangeMax: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {isMissing('move_in_window') && (
                <div>
                  <Label htmlFor="moveInWindow">When are you looking to move in? *</Label>
                  <select
                    id="moveInWindow"
                    value={formData.moveInWindow}
                    onChange={(e) => setFormData({ ...formData, moveInWindow: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    required
                  >
                    <option value="" disabled>Select move-in timeline</option>
                    <option value="asap">ASAP</option>
                    <option value="30-days">Within 30 Days</option>
                    <option value="1-2-months">1-2 Months</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Background Fields */}
          {(isMissing('credit_score_range') || isMissing('employment_status') || isMissing('monthly_income')) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Background</h3>
              
              {isMissing('credit_score_range') && (
                <div>
                  <Label htmlFor="creditScoreRange">What is your estimated credit score? *</Label>
                  <select
                    id="creditScoreRange"
                    value={formData.creditScoreRange}
                    onChange={(e) => setFormData({ ...formData, creditScoreRange: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    required
                  >
                    <option value="" disabled>Select credit score range</option>
                    <option value="below-500">Below 500</option>
                    <option value="500-579">500-579</option>
                    <option value="580-639">580-639</option>
                    <option value="640-699">640-699</option>
                    <option value="700+">700+</option>
                    <option value="not-specified">Not Sure</option>
                  </select>
                </div>
              )}

              {isMissing('employment_status') && (
                <div>
                  <Label htmlFor="employmentStatus">Employment Status *</Label>
                  <select
                    id="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    required
                  >
                    <option value="" disabled>Select employment status</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                    <option value="disabled">Disabled/SSI</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              )}

              {isMissing('monthly_income') && (
                <div>
                  <Label htmlFor="monthlyIncome">Yearly Income *</Label>
                  <select
                    id="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    required
                  >
                    <option value="" disabled>Select yearly income</option>
                    <option value="under-15000">Under $15,000</option>
                    <option value="15000-25000">$15,000 - $25,000</option>
                    <option value="25000-35000">$25,000 - $35,000</option>
                    <option value="35000-50000">$35,000 - $50,000</option>
                    <option value="50000-75000">$50,000 - $75,000</option>
                    <option value="75000-plus">$75,000+</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Yes/No Questions */}
          {(isMissing('has_eviction') || isMissing('has_pets') || isMissing('has_felonies') || isMissing('has_accessibility_needs')) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Additional Information</h3>
              
              {isMissing('has_eviction') && (
                <div>
                  <Label>Have you ever been evicted? *</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasEviction"
                        checked={formData.hasEviction === true}
                        onChange={() => setFormData({ ...formData, hasEviction: true })}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasEviction"
                        checked={formData.hasEviction === false}
                        onChange={() => setFormData({ ...formData, hasEviction: false })}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {formData.hasEviction && (
                    <div className="mt-2">
                      <Label htmlFor="evictionDetails">If yes, how long ago?</Label>
                      <Input
                        id="evictionDetails"
                        value={formData.evictionDetails}
                        onChange={(e) => setFormData({ ...formData, evictionDetails: e.target.value })}
                        placeholder="How long ago?"
                      />
                    </div>
                  )}
                </div>
              )}

              {isMissing('has_pets') && (
                <div>
                  <Label>Do you have any pets? *</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasPets"
                        checked={formData.hasPets === true}
                        onChange={() => setFormData({ ...formData, hasPets: true })}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasPets"
                        checked={formData.hasPets === false}
                        onChange={() => setFormData({ ...formData, hasPets: false })}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {formData.hasPets && (
                    <div className="mt-2">
                      <Label htmlFor="petType">What type?</Label>
                      <Input
                        id="petType"
                        value={formData.petType}
                        onChange={(e) => setFormData({ ...formData, petType: e.target.value })}
                        placeholder="What type of pet?"
                      />
                    </div>
                  )}
                </div>
              )}

              {isMissing('has_felonies') && (
                <div>
                  <Label>Do you have any felonies? *</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasFelonies"
                        checked={formData.hasFelonies === true}
                        onChange={() => setFormData({ ...formData, hasFelonies: true })}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasFelonies"
                        checked={formData.hasFelonies === false}
                        onChange={() => setFormData({ ...formData, hasFelonies: false })}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {formData.hasFelonies && (
                    <div className="mt-2">
                      <Label htmlFor="felonyDetails">Please provide details:</Label>
                      <Textarea
                        id="felonyDetails"
                        value={formData.felonyDetails}
                        onChange={(e) => setFormData({ ...formData, felonyDetails: e.target.value })}
                        placeholder="Please provide details"
                      />
                    </div>
                  )}
                </div>
              )}

              {isMissing('has_accessibility_needs') && (
                <div>
                  <Label>Do you have any accessibility or disability needs? *</Label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasAccessibilityNeeds"
                        checked={formData.hasAccessibilityNeeds === true}
                        onChange={() => setFormData({ ...formData, hasAccessibilityNeeds: true })}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasAccessibilityNeeds"
                        checked={formData.hasAccessibilityNeeds === false}
                        onChange={() => setFormData({ ...formData, hasAccessibilityNeeds: false })}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {formData.hasAccessibilityNeeds && (
                    <div className="mt-2">
                      <Label htmlFor="accessibilityDetails">Please describe:</Label>
                      <Textarea
                        id="accessibilityDetails"
                        value={formData.accessibilityDetails}
                        onChange={(e) => setFormData({ ...formData, accessibilityDetails: e.target.value })}
                        placeholder="Please describe your accessibility needs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save & Continue
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;
