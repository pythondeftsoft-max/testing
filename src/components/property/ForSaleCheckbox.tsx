import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ForSaleModal } from './ForSaleModal';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Property {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  monthly_rent?: number;
  bedrooms?: number;
  bathrooms?: number;
}

interface ForSaleCheckboxProps {
  property: Property;
  isChecked?: boolean;
  onStatusChange?: (propertyId: string, isForSale: boolean) => void;
  className?: string;
}

export const ForSaleCheckbox = ({ 
  property, 
  isChecked = false, 
  onStatusChange, 
  className = "" 
}: ForSaleCheckboxProps) => {
  const [checked, setChecked] = useState(isChecked);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saleRecordId, setSaleRecordId] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if property is already for sale on mount
  useEffect(() => {
    const checkForSaleStatus = async () => {
      const { data } = await supabase
        .from('properties_for_sale')
        .select('id, status')
        .eq('property_id', property.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (data) {
        setChecked(true);
        setSaleRecordId(data.id);
      }
    };
    
    checkForSaleStatus();
  }, [property.id]);

  const handleCheckboxChange = (checkedState: boolean) => {
    if (isLoading) return; // Prevent clicks during loading
    
    if (checkedState) {
      // Open modal for additional details
      setShowModal(true);
    } else {
      // Show confirmation dialog before unchecking
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmUncheck = async () => {
    setIsLoading(true);
    setShowConfirmDialog(false);
    
    try {
      if (saleRecordId) {
        // Delete the record from properties_for_sale table
        const { error } = await supabase
          .from('properties_for_sale')
          .delete()
          .eq('id', saleRecordId);

        if (error) throw error;
      }
      
      setChecked(false);
      setSaleRecordId(null);
      onStatusChange?.(property.id, false);
      
      toast({
        title: "Property removed from sale",
        description: "Property has been completely removed from sale listings",
      });
    } catch (error) {
      console.error('Error removing from sale:', error);
      toast({
        title: "Error",
        description: "Failed to remove property from sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSubmit = async (saleData: any) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-property-for-sale', {
        body: {
          property_id: property.id,
          ...saleData
        }
      });

      if (error) throw error;

      setChecked(true);
      setShowModal(false);
      setSaleRecordId(data?.sale_record_id);
      onStatusChange?.(property.id, true);
      
      toast({
        title: "Property marked for sale!",
        description: "Our team will review your submission and contact you soon.",
      });
    } catch (error: any) {
      console.error('Error submitting for sale:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark property for sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <Checkbox
          id={`for-sale-${property.id}`}
          checked={checked}
          onCheckedChange={handleCheckboxChange}
          disabled={isLoading}
          className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
        />
        <Label 
          htmlFor={`for-sale-${property.id}`}
          className="text-sm font-medium flex items-center gap-1 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Tag className="h-3 w-3" />
          )}
          For Sale
        </Label>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from sale?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this property from sale? This action will completely remove your listing and it will no longer appear in the for sale marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep for sale</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUncheck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ForSaleModal
        isOpen={showModal}
        onClose={handleModalCancel}
        onSubmit={handleModalSubmit}
        property={property}
      />
    </>
  );
};