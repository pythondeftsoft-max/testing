import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AMENITIES_BY_CATEGORY, AMENITY_CATEGORIES } from '@/constants/amenities';

interface PropertyAmenitiesProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  updateAmenity: (amenity: string, value: boolean) => void;
}

export const PropertyAmenities = ({ formData, updateFormData, updateAmenity }: PropertyAmenitiesProps) => {
  const handleAmenityChange = (amenityKey: string, checked: boolean | string) => {
    // Ensure we always pass a boolean value
    const boolValue = typeof checked === 'boolean' ? checked : !!checked;
    updateAmenity(amenityKey, boolValue);
  };

  return (
    <div className="space-y-6">
      {/* Amenities Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Property Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {AMENITY_CATEGORIES.map((category) => {
              const categoryAmenities = AMENITIES_BY_CATEGORY[category];
              if (!categoryAmenities || categoryAmenities.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categoryAmenities.map((amenity) => (
                      <div key={amenity.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`property-${amenity.key}`}
                          checked={formData.amenities[amenity.key] || false}
                          onCheckedChange={(checked) => handleAmenityChange(amenity.key, checked)}
                        />
                        <Label htmlFor={`property-${amenity.key}`} className="text-sm">
                          {amenity.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Units (for multi-unit properties) */}
      {formData.unitCount > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Individual unit management will be available for multi-unit properties
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
