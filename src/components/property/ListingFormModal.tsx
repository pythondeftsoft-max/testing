import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ListingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  propertyData?: any;
  propertyId: string;
}

export const ListingFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  propertyData,
  propertyId 
}: ListingFormModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    monthly_rent: '',
    bedrooms: '',
    bathrooms: '',
    description: '',
    pet_policy: 'no_pets',
    amenities: [] as string[],
  });

  // Populate form with existing property data
  useEffect(() => {
    if (propertyData) {
      setFormData({
        monthly_rent: propertyData.monthly_rent?.toString() || '',
        bedrooms: propertyData.bedrooms?.toString() || '',
        bathrooms: propertyData.bathrooms?.toString() || '',
        description: propertyData.description || '',
        pet_policy: propertyData.pet_policy || 'no_pets',
        amenities: propertyData.amenities || [],
      });
    }
  }, [propertyData]);

  const availableAmenities = [
    'Air Conditioning',
    'Parking',
    'Laundry',
    'Dishwasher',
    'Gym/Fitness Center',
    'Pool',
    'Balcony/Patio',
    'Storage',
    'High-Speed Internet',
    'Pet Friendly'
  ];

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        amenities: prev.amenities.filter(a => a !== amenity)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit({
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>List Property on Market</DialogTitle>
          <DialogDescription>
            Complete the listing details to make your property visible to potential tenants.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
              <Input
                id="monthly_rent"
                type="number"
                value={formData.monthly_rent}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: e.target.value }))}
                placeholder="2500"
                required
              />
            </div>
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                placeholder="2"
                required
              />
            </div>
            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                placeholder="1.5"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Property Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your property, its features, and what makes it special..."
              rows={4}
              required
            />
          </div>

          {/* Pet Policy */}
          <div>
            <Label htmlFor="pet_policy">Pet Policy</Label>
            <Select 
              value={formData.pet_policy} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, pet_policy: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pet policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_pets">No Pets</SelectItem>
                <SelectItem value="cats_only">Cats Only</SelectItem>
                <SelectItem value="dogs_only">Dogs Only</SelectItem>
                <SelectItem value="cats_and_dogs">Cats and Dogs</SelectItem>
                <SelectItem value="all_pets">All Pets Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amenities */}
          <div>
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {availableAmenities.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={formData.amenities.includes(amenity)}
                    onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
                  />
                  <Label htmlFor={`amenity-${amenity}`} className="text-sm">
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Listing Property...' : 'List Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};