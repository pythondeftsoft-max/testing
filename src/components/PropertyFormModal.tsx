
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { PropertyFormFields } from './PropertyFormFields';
import PropertyImageUpload from './PropertyImageUpload';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingProperty?: any;
  userId: string;
  portfolioId?: string;
}

export const PropertyFormModal = ({
  isOpen,
  onClose,
  onSave,
  editingProperty,
  userId,
  portfolioId
}: PropertyFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    address: '',
    monthly_rent: 0,
    bedrooms: null,
    bathrooms: null,
    square_feet: null,
    status: 'available',
    default_tenant_type: 'voucher',
    unit_count: 1,
    property_type: 'house',
    has_voucher: false,
    min_voucher_amount: null,
    max_voucher_amount: null,
    description: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingProperty) {
      setFormData({
        address: editingProperty.address || '',
        monthly_rent: editingProperty.monthly_rent || 0,
        bedrooms: editingProperty.bedrooms,
        bathrooms: editingProperty.bathrooms,
        square_feet: editingProperty.square_feet,
        status: editingProperty.status || 'available',
        default_tenant_type: editingProperty.default_tenant_type || 'voucher',
        unit_count: editingProperty.unit_count || 1,
        property_type: editingProperty.property_type || 'house',
        has_voucher: editingProperty.has_voucher || false,
        min_voucher_amount: editingProperty.min_voucher_amount,
        max_voucher_amount: editingProperty.max_voucher_amount,
        description: editingProperty.description || ''
      });
      setPropertyImages(editingProperty.photos || []);
    } else {
      // Reset form for new property
      setFormData({
        address: '',
        monthly_rent: 0,
        bedrooms: null,
        bathrooms: null,
        square_feet: null,
        status: 'available',
        default_tenant_type: 'voucher',
        unit_count: 1,
        property_type: 'house',
        has_voucher: false,
        min_voucher_amount: null,
        max_voucher_amount: null,
        description: ''
      });
      setPropertyImages([]);
    }
  }, [editingProperty, isOpen]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Property address is required.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.monthly_rent || formData.monthly_rent <= 0) {
      toast({
        title: "Validation Error",
        description: "Monthly rent must be greater than 0.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.status === 'occupied' && !formData.default_tenant_type) {
      toast({
        title: "Validation Error",
        description: "Tenant type is required for occupied properties.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Map the form data to match database schema
      const propertyData = {
        address: formData.address,
        monthly_rent: formData.monthly_rent,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        square_feet: formData.square_feet,
        status: formData.status,
        default_tenant_type: formData.default_tenant_type,
        unit_count: formData.unit_count,
        property_type: formData.property_type as 'house' | 'apartment' | 'townhouse' | 'mobile_home',
        has_voucher: formData.has_voucher,
        min_voucher_amount: formData.min_voucher_amount,
        max_voucher_amount: formData.max_voucher_amount,
        description: formData.description,
        photos: propertyImages,
        owner_id: userId,
        portfolio_id: portfolioId || null,
        updated_at: new Date().toISOString()
      };

      if (editingProperty) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Property updated successfully.",
        });
      } else {
        // Create new property
        const { error } = await supabase
          .from('properties')
          .insert(propertyData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Property created successfully.",
        });
      }

      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      if (portfolioId && portfolioId !== 'everything') {
        queryClient.invalidateQueries({ queryKey: ['properties', 'portfolio', portfolioId] });
        queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['properties', 'owner', userId] });
      }

      onSave();
      onClose();

    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <PropertyFormFields
            formData={formData}
            onFieldChange={handleFieldChange}
            editingProperty={editingProperty}
          />

          <PropertyImageUpload
            propertyId={editingProperty?.id}
            userId={userId}
            images={propertyImages}
            onImagesChange={setPropertyImages}
            portfolioId={portfolioId}
          />

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProperty ? 'Update Property' : 'Create Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
