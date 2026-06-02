

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CountrySelector } from '@/components/ui/country-selector';
import { getStatesForCountry, getStateLabelForCountry } from '@/lib/stateUtils';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { HousingAuthoritySelector } from '@/components/HousingAuthoritySelector';

interface ConditionalTenantFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  tenantIntent?: string;
}

const ConditionalTenantFields = ({ formData, setFormData, tenantIntent }: ConditionalTenantFieldsProps) => {
  const isRentTracker = tenantIntent === 'rent_tracker';
  return (
    <div className="space-y-4">
      {/* Phone Type */}
      <div>
        <Label htmlFor="phoneType">Phone Type *</Label>
        <select
          id="phoneType"
          value={formData.phoneType || ''}
          onChange={(e) => setFormData({ ...formData, phoneType: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="" disabled>Select phone type</option>
          <option value="iphone">iPhone</option>
          <option value="android">Android</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Country */}
      <div>
        <Label htmlFor="country">Country *</Label>
        <CountrySelector
          value={formData.countryCode || 'US'}
          onValueChange={(value) => {
            setFormData({ 
              ...formData, 
              countryCode: value,
              state: '' // Reset state when country changes
            });
          }}
          placeholder="Select country"
        />
      </div>

      {/* State - only for US */}
      {(formData.countryCode || 'US') === 'US' && (
        <div>
          <Label htmlFor="state">State *</Label>
          <select
            id="state"
            value={formData.state || ''}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="" disabled>Select state</option>
            {getStatesForCountry('US').map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current Address - US only */}
      {(formData.countryCode || 'US') === 'US' && (
        <div>
          <Label htmlFor="currentAddress">Current Street Address</Label>
          <AddressAutocompleteInput
            value={formData.currentAddress || ''}
            onAddressSelect={(address) => {
              setFormData({
                ...formData,
                currentAddress: address.fullAddress,
                city: address.city || formData.city,
                state: address.state || formData.state,
                zipCode: address.zipcode || formData.zipCode,
              });
            }}
            placeholder="Start typing your address..."
            countryCode={formData.countryCode || 'US'}
          />
          <p className="text-xs text-muted-foreground mt-1">Helps us calculate accurate drive times to properties</p>
        </div>
      )}

      {/* City and Zip Code - US only */}
      {(formData.countryCode || 'US') === 'US' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="zipCode">Zip Code *</Label>
            <Input
              id="zipCode"
              value={formData.zipCode || ''}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              required
            />
          </div>
        </div>
      )}

      {/* Desired Move-To Location — only for housing_seeker + US */}
      {!isRentTracker && tenantIntent === 'housing_seeker' && (formData.countryCode || 'US') === 'US' && (
        <div className="space-y-3 pt-2">
          <Label className="text-base font-semibold">
            Where are you looking to move? <span className="text-destructive">*</span>
          </Label>
          
          <div className="flex items-center space-x-3">
            <Switch
              id="desiredSameLocation"
              checked={formData.desiredSameLocation ?? true}
              onCheckedChange={(checked) => setFormData({ ...formData, desiredSameLocation: checked })}
            />
            <Label htmlFor="desiredSameLocation" className="cursor-pointer font-normal">
              Same as my current location
            </Label>
          </div>

          {!(formData.desiredSameLocation ?? true) && (
            <>
              <div>
                <Label htmlFor="desiredState">Desired State *</Label>
                <select
                  id="desiredState"
                  value={formData.desiredState || ''}
                  onChange={(e) => setFormData({ ...formData, desiredState: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="" disabled>Select state</option>
                  {getStatesForCountry('US').map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="desiredCity">Desired City *</Label>
                  <Input
                    id="desiredCity"
                    value={formData.desiredCity || ''}
                    onChange={(e) => setFormData({ ...formData, desiredCity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="desiredZipCode">Desired Zip Code *</Label>
                  <Input
                    id="desiredZipCode"
                    value={formData.desiredZipCode || ''}
                    onChange={(e) => setFormData({ ...formData, desiredZipCode: e.target.value })}
                    required
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Housing-specific fields — only for housing_seeker */}
      {!isRentTracker && (
        <>
          {/* Section 8 Voucher Status */}
          <div>
            <Label htmlFor="voucherStatus">Do you have a Section 8 voucher? *</Label>
            <select
              id="voucherStatus"
              value={formData.voucherStatus || ''}
              onChange={(e) => {
                const next = e.target.value;
                setFormData({
                  ...formData,
                  voucherStatus: next,
                  ...(next === 'no' ? { housingAuthorityId: '', housingAuthority: '' } : {}),
                });
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="" disabled>Select voucher status</option>
              <option value="yes">Yes</option>
              <option value="in-progress">In Progress</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Rent Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rentRangeMin">Min Rent *</Label>
              <Input
                id="rentRangeMin"
                type="number"
                value={formData.rentRangeMin || ''}
                onChange={(e) => setFormData({ ...formData, rentRangeMin: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="rentRangeMax">Max Rent *</Label>
              <Input
                id="rentRangeMax"
                type="number"
                value={formData.rentRangeMax || ''}
                onChange={(e) => setFormData({ ...formData, rentRangeMax: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Housing Authority — only relevant when tenant has/is getting a voucher */}
          {(formData.voucherStatus === 'yes' || formData.voucherStatus === 'in-progress') && (
            <div>
              <Label>Which Housing Authority issued it? *</Label>
              <HousingAuthoritySelector
                value={formData.housingAuthorityId || ''}
                textValue={formData.housingAuthority || ''}
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

          {/* Bedrooms Approved */}
          <div>
            <Label>How many bedrooms are you approved for? *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['Studio/1BR', '2BR', '3BR', '4BR', '5BR+'].map((bedroom) => (
                <label key={bedroom} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.bedroomsApproved?.includes(bedroom) || false}
                    onChange={(e) => {
                      const current = formData.bedroomsApproved || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, bedroomsApproved: [...current, bedroom] });
                      } else {
                        setFormData({ ...formData, bedroomsApproved: current.filter((b: string) => b !== bedroom) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{bedroom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Move-in Timeline */}
          <div>
            <Label htmlFor="moveInWindow">When are you looking to move in? *</Label>
            <select
              id="moveInWindow"
              value={formData.moveInWindow || ''}
              onChange={(e) => setFormData({ ...formData, moveInWindow: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="" disabled>Select move-in timeline</option>
              <option value="asap">ASAP</option>
              <option value="30-days">Within 30 Days</option>
              <option value="1-2-months">1-2 Months</option>
            </select>
          </div>

          {/* Credit Score */}
          <div>
            <Label htmlFor="creditScoreRange">What is your estimated credit score? *</Label>
            <select
              id="creditScoreRange"
              value={formData.creditScoreRange || ''}
              onChange={(e) => setFormData({ ...formData, creditScoreRange: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="" disabled>Select credit score range</option>
              <option value="below-500">Below 500</option>
              <option value="500-579">500-579</option>
              <option value="580-639">580-639</option>
              <option value="640-699">640-699</option>
              <option value="700+">700+</option>
            </select>
          </div>

          {/* Employment Status */}
          <div>
            <Label htmlFor="employmentStatus">Employment Status *</Label>
            <select
              id="employmentStatus"
              value={formData.employmentStatus || ''}
              onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

          {/* Yearly Income */}
          <div>
            <Label htmlFor="monthlyIncome">Yearly Income *</Label>
            <select
              id="monthlyIncome"
              value={formData.monthlyIncome || ''}
              onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

          {/* Eviction History */}
          <div>
            <Label>Have you ever been evicted? *</Label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasEviction"
                  checked={formData.hasEviction === true}
                  onChange={() => setFormData({ ...formData, hasEviction: true })}
                  required
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasEviction"
                  checked={formData.hasEviction === false}
                  onChange={() => setFormData({ ...formData, hasEviction: false })}
                  required
                />
                <span>No</span>
              </label>
            </div>
            {formData.hasEviction && (
              <div className="mt-2">
                <Label htmlFor="evictionDetails">If yes, how long ago?</Label>
                <Input
                  id="evictionDetails"
                  value={formData.evictionDetails || ''}
                  onChange={(e) => setFormData({ ...formData, evictionDetails: e.target.value })}
                  placeholder="How long ago?"
                />
              </div>
            )}
          </div>

          {/* Pet Ownership */}
          <div>
            <Label>Do you have any pets? *</Label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasPets"
                  checked={formData.hasPets === true}
                  onChange={() => setFormData({ ...formData, hasPets: true })}
                  required
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasPets"
                  checked={formData.hasPets === false}
                  onChange={() => setFormData({ ...formData, hasPets: false })}
                  required
                />
                <span>No</span>
              </label>
            </div>
            {formData.hasPets && (
              <div className="mt-2">
                <Label htmlFor="petType">What type?</Label>
                <Input
                  id="petType"
                  value={formData.petType || ''}
                  onChange={(e) => setFormData({ ...formData, petType: e.target.value })}
                  placeholder="What type of pet?"
                />
              </div>
            )}
          </div>

          {/* Accessibility Needs */}
          <div>
            <Label>Do you have any accessibility or disability needs? *</Label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasAccessibilityNeeds"
                  checked={formData.hasAccessibilityNeeds === true}
                  onChange={() => setFormData({ ...formData, hasAccessibilityNeeds: true })}
                  required
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasAccessibilityNeeds"
                  checked={formData.hasAccessibilityNeeds === false}
                  onChange={() => setFormData({ ...formData, hasAccessibilityNeeds: false })}
                  required
                />
                <span>No</span>
              </label>
            </div>
            {formData.hasAccessibilityNeeds && (
              <div className="mt-2">
                <Label htmlFor="accessibilityDetails">Please describe:</Label>
                <Textarea
                  id="accessibilityDetails"
                  value={formData.accessibilityDetails || ''}
                  onChange={(e) => setFormData({ ...formData, accessibilityDetails: e.target.value })}
                  placeholder="Please describe your accessibility needs"
                />
              </div>
            )}
          </div>

          {/* Criminal History */}
          <div>
            <Label>Do you have any felonies? *</Label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasFelonies"
                  checked={formData.hasFelonies === true}
                  onChange={() => setFormData({ ...formData, hasFelonies: true })}
                  required
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="hasFelonies"
                  checked={formData.hasFelonies === false}
                  onChange={() => setFormData({ ...formData, hasFelonies: false })}
                  required
                />
                <span>No</span>
              </label>
            </div>
            {formData.hasFelonies && (
              <div className="mt-2">
                <Label htmlFor="felonyDetails">Please provide details:</Label>
                <Textarea
                  id="felonyDetails"
                  value={formData.felonyDetails || ''}
                  onChange={(e) => setFormData({ ...formData, felonyDetails: e.target.value })}
                  placeholder="Please provide details about your criminal history"
                />
              </div>
            )}
          </div>

          {/* Signup Notes */}
          <div>
            <Label htmlFor="signupNotes">Leave us a note to help speed up the housing process</Label>
            <Textarea
              id="signupNotes"
              value={formData.signupNotes || ''}
              onChange={(e) => setFormData({ ...formData, signupNotes: e.target.value })}
              placeholder="Tell us anything else that might help us find you housing faster..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional - Share any special circumstances, preferences, or urgent needs
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ConditionalTenantFields;
