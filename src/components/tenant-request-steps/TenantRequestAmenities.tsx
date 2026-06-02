import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';

interface TenantRequestAmenitiesProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  updateAmenity: (amenity: string, value: boolean) => void;
}

export const TenantRequestAmenities = ({ formData, updateFormData, updateAmenity }: TenantRequestAmenitiesProps) => {

  const handleAmenityChange = (amenityKey: string, checked: boolean | string) => {
    // Ensure we always pass a boolean value
    const boolValue = typeof checked === 'boolean' ? checked : !!checked;
    updateAmenity(amenityKey, boolValue);
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-lg font-semibold">Property Amenities</h3>
        <p className="text-sm text-gray-600">Select amenities to highlight to potential tenants</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LISTING_AMENITIES.map((amenity) => (
              <div key={amenity.key} className="flex items-center space-x-2">
                <Checkbox
                  id={amenity.key}
                  checked={formData.amenities?.[amenity.key] || false}
                  onCheckedChange={(checked) => handleAmenityChange(amenity.key, checked)}
                />
                <Label htmlFor={amenity.key} className="text-sm">
                  {amenity.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Why highlight amenities?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Help tenants find properties that match their needs</li>
          <li>• Increase interest and application rates</li>
          <li>• Stand out in search results</li>
          <li>• Attract quality tenants looking for specific features</li>
        </ul>
      </div>
    </div>
  );
};
