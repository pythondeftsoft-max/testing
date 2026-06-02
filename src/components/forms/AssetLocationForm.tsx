
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CountrySelector } from '@/components/ui/country-selector';
import { InternationalAddressForm } from './InternationalAddressForm';

interface AssetLocationFormProps {
  form: UseFormReturn<any>;
  assetType: 'real_estate' | 'vehicle' | 'aircraft' | 'marine' | 'art_collectibles' | 'business_holding' | 'other';
  showRegistrationCountry?: boolean;
}

export const AssetLocationForm: React.FC<AssetLocationFormProps> = ({
  form,
  assetType,
  showRegistrationCountry = true,
}) => {
  const renderLocationSpecificField = () => {
    switch (assetType) {
      case 'marine':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_metadata.marina_berth">Marina/Berth Number</Label>
              <Input
                {...form.register('location_metadata.marina_berth')}
                placeholder="e.g., Marina Bay Slip 42"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_metadata.home_base">Home Port</Label>
              <Input
                {...form.register('location_metadata.home_base')}
                placeholder="e.g., San Diego Harbor"
              />
            </div>
          </div>
        );

      case 'aircraft':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_metadata.hangar_code">Hangar/Tie-down</Label>
              <Input
                {...form.register('location_metadata.hangar_code')}
                placeholder="e.g., Hangar 7 or Tie-down T-15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_metadata.home_base">Home Base Airport</Label>
              <Input
                {...form.register('location_metadata.home_base')}
                placeholder="e.g., KSAN (San Diego International)"
              />
            </div>
          </div>
        );

      case 'art_collectibles':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location_metadata.storage_facility">Storage Facility</Label>
              <Input
                {...form.register('location_metadata.storage_facility')}
                placeholder="e.g., Sotheby's Fine Art Storage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_metadata.vault_location">Vault/Room</Label>
              <Input
                {...form.register('location_metadata.vault_location')}
                placeholder="e.g., Climate-controlled Room 5"
              />
            </div>
          </div>
        );

      case 'vehicle':
        return (
          <div className="space-y-2">
            <Label htmlFor="location_metadata.registration_number">Registration/VIN</Label>
            <Input
              {...form.register('location_metadata.registration_number')}
              placeholder="Vehicle registration or VIN"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Location</h3>
        
        <div className="space-y-2">
          <Label htmlFor="location_country">Location Country</Label>
          <CountrySelector
            value={form.watch('location_country')}
            onValueChange={(value) => form.setValue('location_country', value)}
          />
        </div>

        {assetType === 'real_estate' ? (
          <InternationalAddressForm
            form={form}
            countryFieldName="country"
            addressFieldName="international_address"
            showCountrySelector={false}
            required={true}
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="location_metadata.current_location">Current Location</Label>
            <Textarea
              {...form.register('location_metadata.current_location')}
              placeholder="Describe the current location (address, facility, etc.)"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Registration Country (for non-real estate assets) */}
      {showRegistrationCountry && assetType !== 'real_estate' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Registration Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="registration_country">Registration Country</Label>
            <CountrySelector
              value={form.watch('registration_country')}
              onValueChange={(value) => form.setValue('registration_country', value)}
            />
          </div>
        </div>
      )}

      {/* Asset-specific location fields */}
      {renderLocationSpecificField()}
    </div>
  );
};
