import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AMENITIES_BY_CATEGORY, AMENITY_CATEGORIES } from '@/constants/amenities';
import { LISTING_AMENITIES } from '@/constants/listingAmenities';

interface UnitAmenitiesProps {
  formData: {
    amenities: string[];
  };
  updateFormData: (field: string, value: string[] | boolean) => void;
  listingMode?: boolean; // When true, show only listing amenities
  isEditMode?: boolean; // When false, checkboxes are disabled
}

export const UnitAmenities: React.FC<UnitAmenitiesProps> = ({
  formData,
  updateFormData,
  listingMode = false,
  isEditMode = true, // Default to true for backward compatibility
}) => {
  const handleAmenityChange = (amenityKey: string, checked: boolean) => {
    const currentAmenities = formData.amenities || [];
    let updatedAmenities;
    
    if (checked) {
      updatedAmenities = [...currentAmenities, amenityKey];
    } else {
      updatedAmenities = currentAmenities.filter(a => a !== amenityKey);
    }
    
    updateFormData('amenities', updatedAmenities);
  };

  // If in listing mode, show only the 22 listing amenities
  if (listingMode) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unit Amenities</CardTitle>
            <CardDescription>
              Select the amenities and features available in this unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LISTING_AMENITIES.map((amenity) => (
                <div key={amenity.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`unit-${amenity.key}`}
                    checked={formData.amenities?.includes(amenity.key) || false}
                    onCheckedChange={(checked) => handleAmenityChange(amenity.key, !!checked)}
                    disabled={!isEditMode}
                  />
                  <Label htmlFor={`unit-${amenity.key}`} className="text-sm font-normal">
                    {amenity.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full categorized amenities view (default)
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unit Amenities</CardTitle>
          <CardDescription>
            Select the amenities and features available in this unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {AMENITY_CATEGORIES.map((category) => {
              const categoryAmenities = AMENITIES_BY_CATEGORY[category];
              if (!categoryAmenities || categoryAmenities.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categoryAmenities.map((amenity) => (
                      <div key={amenity.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`unit-${amenity.key}`}
                          checked={formData.amenities?.includes(amenity.key) || false}
                          onCheckedChange={(checked) => handleAmenityChange(amenity.key, !!checked)}
                          disabled={!isEditMode}
                        />
                        <Label htmlFor={`unit-${amenity.key}`} className="text-sm font-normal">
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
    </div>
  );
};