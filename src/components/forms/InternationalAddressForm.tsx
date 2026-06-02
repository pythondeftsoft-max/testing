
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CountrySelector } from '@/components/ui/country-selector';
import { useCountryAddressFormat } from '@/hooks/useCountries';
import type { InternationalAddress } from '@/types/countries';
import { parseAddressFormat } from '@/lib/countryUtils';

interface InternationalAddressFormProps {
  form: UseFormReturn<any>;
  countryFieldName?: string;
  addressFieldName?: string;
  showCountrySelector?: boolean;
  required?: boolean;
}

export const InternationalAddressForm: React.FC<InternationalAddressFormProps> = ({
  form,
  countryFieldName = 'country',
  addressFieldName = 'international_address',
  showCountrySelector = true,
  required = false,
}) => {
  const countryValue = form.watch(countryFieldName);
  const { data: addressFormatData, isLoading, error } = useCountryAddressFormat(countryValue || 'US');
  
  // Safely parse the address format with fallback
  const addressFormat = React.useMemo(() => {
    return parseAddressFormat(addressFormatData);
  }, [addressFormatData]);

  const isFieldRequired = (fieldName: string) => {
    return required && addressFormat.required?.includes(fieldName);
  };

  const getFieldLabel = (fieldName: string) => {
    switch (fieldName) {
      case 'street':
        return 'Street Address';
      case 'city':
        return 'City';
      case 'state':
        return countryValue === 'US' ? 'State' : 'State/Province';
      case 'province':
        return 'Province';
      case 'postal_code':
        return countryValue === 'US' ? 'ZIP Code' : 'Postal Code';
      case 'prefecture':
        return 'Prefecture';
      case 'district':
        return 'District';
      case 'region':
        return 'Region';
      default:
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace('_', ' ');
    }
  };

  const renderAddressField = (fieldName: string) => {
    const label = getFieldLabel(fieldName);
    const isRequired = isFieldRequired(fieldName);
    
    // Map format field names to our address field names
    const fieldMapping: { [key: string]: string } = {
      'street': 'street_1',
      'city': 'city',
      'state': 'state_province',
      'province': 'state_province',
      'postal_code': 'postal_code',
      'prefecture': 'state_province',
      'district': 'district',
      'region': 'region',
    };

    const actualFieldName = fieldMapping[fieldName] || fieldName;
    const fullFieldName = `${addressFieldName}.${actualFieldName}`;

    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fullFieldName}>
          {label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          {...form.register(fullFieldName, {
            required: isRequired ? `${label} is required` : false,
          })}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {showCountrySelector && (
        <div className="space-y-2">
          <Label htmlFor={countryFieldName}>
            Country
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <CountrySelector
            value={form.watch(countryFieldName)}
            onValueChange={(value) => form.setValue(countryFieldName, value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${addressFieldName}.street_1`}>
          Street Address
          {isFieldRequired('street') && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          {...form.register(`${addressFieldName}.street_1`, {
            required: isFieldRequired('street') ? 'Street address is required' : false,
          })}
          placeholder="Enter street address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${addressFieldName}.street_2`}>
          Street Address 2 (Optional)
        </Label>
        <Input
          {...form.register(`${addressFieldName}.street_2`)}
          placeholder="Apartment, suite, etc."
        />
      </div>

      {/* Render fields based on country's address format with error handling */}
      {!isLoading && !error && addressFormat.format && addressFormat.format.map(renderAddressField)}
      
      {/* Show loading state */}
      {isLoading && (
        <div className="text-sm text-muted-foreground">
          Loading address format...
        </div>
      )}
      
      {/* Show error state with fallback */}
      {error && (
        <div className="text-sm text-muted-foreground">
          Using default address format
        </div>
      )}
    </div>
  );
};
