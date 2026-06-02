import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';
import { useToast } from "@/hooks/use-toast";

interface TenantProfileFormProps {
  profile?: any;
  onProfileUpdate?: () => void;
  isEditing?: boolean;
}

const TenantProfileForm: React.FC<TenantProfileFormProps> = ({ 
  profile, 
  onProfileUpdate, 
  isEditing = false 
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    voucher_holder: false,
    voucher_amount: '',
    max_rent: '',
    preferred_locations: [] as string[],
    preferred_move_date: '',
    move_in_window: '',
    monthly_income: '',
    employment_status: '',
    credit_score_range: '',
    has_eviction: false,
    eviction_details: '',
    has_pets: false,
    pet_type: '',
    has_accessibility_needs: false,
    accessibility_details: '',
    has_felonies: false,
    felony_details: '',
    voucher_status: '',
    housing_authority: '',
    housing_authority_id: '',
    phone_type: '',
    city: '',
    zip_code: '',
    rent_range_min: '',
    rent_range_max: '',
    bedrooms_approved: [] as string[]
  });

  useEffect(() => {
    // Load cached application data if available
    const cachedData = sessionStorage.getItem('tenant_application_data');
    if (cachedData && !profile) {
      try {
        const applicationData = JSON.parse(cachedData);
        // Map application data to profile format
        setFormData(prev => ({
          ...prev,
          voucher_holder: applicationData.voucherStatus === 'yes',
          voucher_status: applicationData.voucherStatus,
          housing_authority: applicationData.housingAuthorityIssuer,
          phone_type: applicationData.phoneType,
          city: applicationData.city,
          zip_code: applicationData.zipCode,
          max_rent: applicationData.rentRange,
          preferred_move_date: applicationData.moveInTiming,
          credit_score_range: applicationData.creditScore,
          has_eviction: applicationData.evictionHistory === 'yes',
          eviction_details: applicationData.evictionTimeAgo,
          has_pets: applicationData.hasPets === 'yes',
          pet_type: applicationData.petType,
          has_accessibility_needs: applicationData.hasAccessibilityNeeds,
          accessibility_details: applicationData.accessibilityDetails,
          felony_details: applicationData.felonies,
          has_felonies: applicationData.felonies !== 'None' && applicationData.felonies !== '',
          bedrooms_approved: applicationData.bedroomsApproved ? [applicationData.bedroomsApproved] : [],
          employment_status: applicationData.employmentStatus || '',
          monthly_income: applicationData.monthlyIncome || '',
        }));
      } catch (error) {
        console.error('Error parsing cached application data:', error);
      }
    } else if (profile) {
      // Load existing profile data
      setFormData({
        voucher_holder: profile.voucher_holder || false,
        voucher_amount: profile.voucher_amount?.toString() || '',
        max_rent: profile.max_rent?.toString() || '',
        preferred_locations: profile.preferred_locations || [],
        preferred_move_date: profile.preferred_move_date || '',
        move_in_window: profile.move_in_window || '',
        monthly_income: profile.monthly_income?.toString() || '',
        employment_status: profile.employment_status || '',
        credit_score_range: profile.credit_score_range || '',
        has_eviction: profile.has_eviction || false,
        eviction_details: profile.eviction_details || '',
        has_pets: profile.has_pets || false,
        pet_type: profile.pet_type || '',
        has_accessibility_needs: profile.has_accessibility_needs || false,
        accessibility_details: profile.accessibility_details || '',
        has_felonies: profile.has_felonies || false,
        felony_details: profile.felony_details || '',
        voucher_status: profile.voucher_status || '',
        housing_authority: profile.housing_authority || '',
        housing_authority_id: profile.housing_authority_id || '',
        phone_type: profile.phone_type || '',
        city: profile.city || '',
        zip_code: profile.zip_code || '',
        rent_range_min: profile.rent_range_min?.toString() || '',
        rent_range_max: profile.rent_range_max?.toString() || '',
        bedrooms_approved: profile.bedrooms_approved || []
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const profileData = {
        user_id: user.id,
        ...formData,
        voucher_amount: formData.voucher_amount ? parseFloat(formData.voucher_amount) : null,
        max_rent: formData.max_rent ? parseFloat(formData.max_rent) : null,
        monthly_income: formData.monthly_income || null,
        rent_range_min: formData.rent_range_min ? parseFloat(formData.rent_range_min) : null,
        rent_range_max: formData.rent_range_max ? parseFloat(formData.rent_range_max) : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tenant_profiles')
        .upsert(profileData);

      if (error) throw error;

      // Clear cached application data after successful save
      sessionStorage.removeItem('tenant_application_data');

      toast({
        title: "Profile Updated",
        description: "Your tenant profile has been saved successfully.",
      });

      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error: any) {
      console.error('Error saving tenant profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
            City
          </Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Your city"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700">
            Zip Code
          </Label>
          <Input
            id="zip_code"
            value={formData.zip_code}
            onChange={(e) => handleChange('zip_code', e.target.value)}
            placeholder="12345"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone_type" className="text-sm font-medium text-gray-700">
          Phone Type
        </Label>
        <Select value={formData.phone_type} onValueChange={(value) => handleChange('phone_type', value)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select phone type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iphone">iPhone</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Housing Information */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Section 8 Voucher Status
        </Label>
        <RadioGroup
          value={formData.voucher_status}
          onValueChange={(value) => {
            handleChange('voucher_status', value);
            handleChange('voucher_holder', value === 'yes');
          }}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="voucher-yes" />
            <Label htmlFor="voucher-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in-progress" id="voucher-progress" />
            <Label htmlFor="voucher-progress">In-progress</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="voucher-no" />
            <Label htmlFor="voucher-no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.voucher_holder && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="voucher_amount" className="text-sm font-medium text-gray-700">
              Voucher Amount
            </Label>
            <Input
              id="voucher_amount"
              value={formData.voucher_amount}
              onChange={(e) => handleChange('voucher_amount', e.target.value)}
              placeholder="$1200"
              type="number"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="housing_authority" className="text-sm font-medium text-gray-700">
              Housing Authority
            </Label>
            <HousingAuthoritySelector
              value={formData.housing_authority_id || ''}
              textValue={formData.housing_authority}
              onSelect={(authority) => {
                if (authority) {
                  handleChange('housing_authority', authority.name);
                  handleChange('housing_authority_id', authority.id);
                }
              }}
              className="mt-1"
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="max_rent" className="text-sm font-medium text-gray-700">
          Maximum Rent
        </Label>
        <Input
          id="max_rent"
          value={formData.max_rent}
          onChange={(e) => handleChange('max_rent', e.target.value)}
          placeholder="$1500"
          type="number"
          className="mt-1"
        />
      </div>

      {/* Continue with other fields... */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Credit Score Range
        </Label>
        <RadioGroup
          value={formData.credit_score_range}
          onValueChange={(value) => handleChange('credit_score_range', value)}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="below-500" id="credit-below-500" />
            <Label htmlFor="credit-below-500">Below 500</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="500-579" id="credit-500-579" />
            <Label htmlFor="credit-500-579">500–579</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="580-639" id="credit-580-639" />
            <Label htmlFor="credit-580-639">580–639</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="640-699" id="credit-640-699" />
            <Label htmlFor="credit-640-699">640–699</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="700-plus" id="credit-700-plus" />
            <Label htmlFor="credit-700-plus">700+</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Eviction History
        </Label>
        <RadioGroup
          value={formData.has_eviction ? 'yes' : 'no'}
          onValueChange={(value) => handleChange('has_eviction', value === 'yes')}
          className="flex gap-4 mb-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="eviction-yes" />
            <Label htmlFor="eviction-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="eviction-no" />
            <Label htmlFor="eviction-no">No</Label>
          </div>
        </RadioGroup>
        {formData.has_eviction && (
          <div className="mt-3">
            <Label htmlFor="eviction_details" className="text-sm font-medium text-gray-700">
              Eviction Details
            </Label>
            <Textarea
              id="eviction_details"
              value={formData.eviction_details}
              onChange={(e) => handleChange('eviction_details', e.target.value)}
              placeholder="Please provide details about your eviction history..."
              rows={3}
              className="mt-1"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Do you have pets?
        </Label>
        <RadioGroup
          value={formData.has_pets ? 'yes' : 'no'}
          onValueChange={(value) => handleChange('has_pets', value === 'yes')}
          className="flex gap-4 mb-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="pets-yes" />
            <Label htmlFor="pets-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="pets-no" />
            <Label htmlFor="pets-no">No</Label>
          </div>
        </RadioGroup>
        {formData.has_pets && (
          <div className="mt-3">
            <Label htmlFor="pet_type" className="text-sm font-medium text-gray-700">
              What type of pets?
            </Label>
            <Input
              id="pet_type"
              value={formData.pet_type}
              onChange={(e) => handleChange('pet_type', e.target.value)}
              placeholder="e.g., Dog, Cat, etc."
              className="mt-1"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="accessibility_needs"
            checked={formData.has_accessibility_needs}
            onCheckedChange={(checked) => handleChange('has_accessibility_needs', checked)}
          />
          <Label htmlFor="accessibility_needs" className="text-sm font-medium text-gray-700">
            Do you have accessibility/disability needs?
          </Label>
        </div>
        {formData.has_accessibility_needs && (
          <div className="mt-3">
            <Label htmlFor="accessibility_details" className="text-sm font-medium text-gray-700">
              Please provide details
            </Label>
            <Textarea
              id="accessibility_details"
              value={formData.accessibility_details}
              onChange={(e) => handleChange('accessibility_details', e.target.value)}
              placeholder="Describe your accessibility needs..."
              rows={3}
              className="mt-1"
            />
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="felony_details" className="text-sm font-medium text-gray-700">
          Felony History
        </Label>
        <Input
          id="felony_details"
          value={formData.felony_details}
          onChange={(e) => {
            handleChange('felony_details', e.target.value);
            handleChange('has_felonies', e.target.value !== 'None' && e.target.value !== '');
          }}
          placeholder="Please describe any felony history or enter 'None'"
          className="mt-1"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
      >
        {isLoading ? 'Saving...' : 'Save Profile'}
      </Button>
    </form>
  );
};

export default TenantProfileForm;
