import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stepper } from '@/components/ui/stepper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminUnitActions } from '@/hooks/useAdminUnitActions';
import { UnitBasicInfo } from '@/components/unit-steps/UnitBasicInfo';
import { UnitLeaseFinancial } from '@/components/unit-steps/UnitLeaseFinancial';
import { UnitTenantInfo } from '@/components/unit-steps/UnitTenantInfo';
import { UnitAmenities } from '@/components/unit-steps/UnitAmenities';

interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name?: string | null;
  monthly_rent?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  status?: string;
  tenant_id?: string | null;
  on_market?: boolean | null;
  tenant_type?: string | null;
  has_voucher?: boolean | null;
  pha_portion?: number | null;
  tenant_portion?: number | null;
  description?: string | null;
  security_deposit?: number | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  amenities?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface EditUnitModalProps {
  isOpen: boolean;
  propertyId: string;
  unit?: PropertyUnit;
  onClose: () => void;
  onUnitUpdated: () => void;
  adminMode?: boolean;
  isMultiUnit?: boolean;
  propertyBedrooms?: number;
  propertyBathrooms?: number;
  existingUnits?: PropertyUnit[];
}

const getTabValues = (isMultiUnit: boolean, isCreatingNew: boolean) => {
  if (isCreatingNew) {
    // New units: only Basic Info and Amenities
    return {
      'basic-info': 'Basic Info',
      'amenities': 'Amenities',
    };
  }
  
  // Editing existing units: show all tabs
  if (isMultiUnit) {
    return {
      'basic-info': 'Basic Info',
      'lease-financial': 'Lease & Financial',
      'amenities': 'Amenities',
    };
  }
  return {
    'basic-info': 'Basic Info',
    'lease-financial': 'Lease & Financial',
    'tenant-info': 'Tenant Info',
    'amenities': 'Amenities',
  };
};

const getStepLabels = (isMultiUnit: boolean, isCreatingNew: boolean) => {
  if (isCreatingNew) {
    return ['Basic Info', 'Amenities'];
  }
  
  if (isMultiUnit) {
    return ['Basic Info', 'Lease & Financial', 'Amenities'];
  }
  return ['Basic Info', 'Lease & Financial', 'Tenant Info', 'Amenities'];
};

const getStepFromTab = (tab: string, tabValues: Record<string, string>): number => {
  const tabKeys = Object.keys(tabValues);
  return tabKeys.indexOf(tab);
};

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
  isOpen,
  propertyId,
  unit,
  onClose,
  onUnitUpdated,
  adminMode = false,
  isMultiUnit = false,
  propertyBedrooms,
  propertyBathrooms,
  existingUnits = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic-info');
  
  const isCreatingNew = !unit; // Flag for new unit creation
  const TAB_VALUES = getTabValues(isMultiUnit, isCreatingNew);
  const STEP_LABELS = getStepLabels(isMultiUnit, isCreatingNew);
  
  // Debug logging to verify the new tabbed modal is loading
  console.log('EditUnitModal rendering with tabs - isOpen:', isOpen, 'adminMode:', adminMode, 'isMultiUnit:', isMultiUnit);
  const [formData, setFormData] = useState({
    unit_number: '',
    unit_name: '',
    monthly_rent: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    status: 'available',
    on_market: true,
    tenant_type: '',
    has_voucher: false,
    pha_portion: '',
    tenant_portion: '',
    description: '',
    security_deposit: '',
    lease_start_date: '',
    lease_end_date: '',
    amenities: [] as string[],
  });
  const { toast } = useToast();
  const { upsertUnit } = useAdminUnitActions();

  // Fetch existing units for unit number calculation (only if not provided as prop)
  const { data: queriedUnits = [] } = useQuery({
    queryKey: ['property-units-for-number', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_units')
        .select('unit_number')
        .eq('property_id', propertyId)
        .order('unit_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !unit && isOpen && existingUnits.length === 0, // Only query when adding new unit and not provided as prop
  });

  // Calculate next unit number for new units
  const calculateNextUnitNumber = (): string => {
    if (unit) return unit.unit_number; // Editing existing unit
    
    const unitsForCalculation = existingUnits.length > 0 ? existingUnits : queriedUnits;
    
    if (unitsForCalculation.length === 0) {
      return "1"; // First unit
    }
    
    // Parse unit numbers as integers and find max
    const numericUnits = unitsForCalculation
      .map((u: any) => parseInt(u.unit_number))
      .filter((n: number) => !isNaN(n));
    
    if (numericUnits.length === 0) {
      return "1"; // No numeric units, start with 1
    }
    
    const maxNumber = Math.max(...numericUnits);
    return (maxNumber + 1).toString(); // Increment
  };

  useEffect(() => {
    if (unit) {
      setFormData({
        unit_number: unit.unit_number || '',
        unit_name: unit.unit_name || '',
        monthly_rent: unit.monthly_rent?.toString() || '',
        bedrooms: unit.bedrooms?.toString() || '',
        bathrooms: unit.bathrooms?.toString() || '',
        square_feet: unit.square_feet?.toString() || '',
        status: unit.status || 'available',
        on_market: unit.on_market ?? true,
        tenant_type: unit.tenant_type || '',
        has_voucher: unit.has_voucher || false,
        pha_portion: unit.pha_portion?.toString() || '',
        tenant_portion: unit.tenant_portion?.toString() || '',
        description: unit.description || '',
        security_deposit: unit.security_deposit?.toString() || '',
        lease_start_date: unit.lease_start_date || '',
        lease_end_date: unit.lease_end_date || '',
        amenities: unit.amenities ? JSON.parse(unit.amenities) : [],
      });
    } else {
      // Reset form for new unit with smart unit number
      const nextUnitNumber = calculateNextUnitNumber();
      setFormData({
        unit_number: nextUnitNumber, // Auto-populated!
        unit_name: '',
        monthly_rent: '',
        bedrooms: '',
        bathrooms: '',
        square_feet: '',
        status: 'vacant',
        on_market: false,
        tenant_type: '',
        has_voucher: false,
        pha_portion: '',
        tenant_portion: '',
        description: '',
        security_deposit: '',
        lease_start_date: '',
        lease_end_date: '',
        amenities: [] as string[],
      });
    }
  }, [unit?.id, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Prevent units with 0 beds/baths from being listed
    const bedroomsNum = formData.bedrooms ? parseInt(formData.bedrooms) : 0;
    const bathroomsNum = formData.bathrooms ? parseFloat(formData.bathrooms) : 0;
    const willBeOnMarket = formData.on_market || formData.status === 'available';
    
    if (willBeOnMarket && (bedroomsNum === 0 || bathroomsNum === 0)) {
      toast({
        title: 'Validation Error',
        description: 'Units that are listed or marked as available must have at least 1 bedroom and 1 bathroom.',
        variant: 'destructive',
      });
      return;
    }
    
    if (adminMode) {
      await handleAdminSubmit();
    } else {
      await handleLandlordSubmit();
    }
  };

  const handleAdminSubmit = async () => {
    setIsLoading(true);
    try {
      await upsertUnit.mutateAsync({
        unitId: unit?.id,
        propertyId,
        unitData: {
          unit_number: formData.unit_number,
          unit_name: formData.unit_name || null,
          monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
          status: formData.status,
          tenant_type: formData.tenant_type || null,
          has_voucher: formData.has_voucher || false,
          pha_portion: formData.pha_portion ? parseFloat(formData.pha_portion) : null,
          tenant_portion: formData.tenant_portion ? parseFloat(formData.tenant_portion) : null,
          description: formData.description || null,
          security_deposit_amount: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
          lease_start_date: formData.lease_start_date || null,
          lease_end_date: formData.lease_end_date || null,
          amenities: formData.amenities || [],
        },
        reason: `Admin ${unit ? 'updated' : 'created'} unit via dashboard`,
        metadata: { source: 'admin_dashboard', unit_number: formData.unit_number }
      });

      onUnitUpdated();
    } catch (error) {
      // Error handling is done in the mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandlordSubmit = async () => {
    setIsLoading(true);
    try {
      // For new units: inherit bed/bath from property if not explicitly set
      let bedroomsValue = formData.bedrooms ? parseInt(formData.bedrooms) : null;
      let bathroomsValue = formData.bathrooms ? parseFloat(formData.bathrooms) : null;
      
      if (!unit && (!bedroomsValue || !bathroomsValue)) {
        // Fetch property details for inheritance
        const { data: propertyDetails } = await supabase
          .from('properties')
          .select('bedrooms, bathrooms')
          .eq('id', propertyId)
          .single();
        
        if (propertyDetails) {
          bedroomsValue = bedroomsValue || propertyDetails.bedrooms || null;
          bathroomsValue = bathroomsValue || propertyDetails.bathrooms || null;
          console.log(`Inherited bed/bath from property: ${bedroomsValue}/${bathroomsValue}`);
        }
      }
      
      const unitData = {
        property_id: propertyId,
        unit_number: formData.unit_number,
        unit_name: formData.unit_name || null,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
        bedrooms: bedroomsValue,
        bathrooms: bathroomsValue,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        status: formData.status,
        on_market: formData.on_market,
        tenant_type: formData.tenant_type || null,
        has_voucher: formData.has_voucher || false,
        pha_portion: formData.pha_portion ? parseFloat(formData.pha_portion) : null,
        tenant_portion: formData.tenant_portion ? parseFloat(formData.tenant_portion) : null,
        description: formData.description || null,
        security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
        lease_start_date: formData.lease_start_date || null,
        lease_end_date: formData.lease_end_date || null,
        amenities: JSON.stringify(formData.amenities || []),
      };

      let error;
      if (unit) {
        const { error: updateError } = await supabase
          .from('property_units')
          .update(unitData)
          .eq('id', unit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('property_units')
          .insert([unitData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: unit ? 'Unit Updated' : 'Unit Created',
        description: unit 
          ? 'Unit has been updated successfully'
          : 'New unit has been created successfully',
      });

      onUnitUpdated();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast({
        title: 'Error',
        description: 'Failed to save unit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset active tab when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('basic-info');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {unit ? 'Edit Unit' : 'Add New Unit'}
            {adminMode && (
              <span className="ml-2 text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                Admin Mode
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <Stepper 
            currentStep={getStepFromTab(activeTab, TAB_VALUES)} 
            steps={STEP_LABELS}
            className="mb-6"
          />
        </div>
        
        <ScrollArea className="flex-1 overflow-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isCreatingNew ? 'grid-cols-2' : (isMultiUnit ? 'grid-cols-3' : 'grid-cols-4')} mb-6`}>
                <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
                {!isCreatingNew && <TabsTrigger value="lease-financial">Lease & Financial</TabsTrigger>}
                {!isCreatingNew && !isMultiUnit && <TabsTrigger value="tenant-info">Tenant Info</TabsTrigger>}
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
              </TabsList>

              <TabsContent value="basic-info">
                <UnitBasicInfo 
                  formData={formData}
                  updateFormData={handleInputChange}
                  isCreatingNew={isCreatingNew}
                />
              </TabsContent>

              {!isCreatingNew && (
                <TabsContent value="lease-financial">
                  <UnitLeaseFinancial 
                    formData={formData}
                    updateFormData={handleInputChange}
                  />
                </TabsContent>
              )}

              {!isCreatingNew && !isMultiUnit && (
                <TabsContent value="tenant-info">
                  <UnitTenantInfo 
                    formData={formData}
                    updateFormData={handleInputChange}
                    unitId={unit?.id}
                    propertyId={propertyId}
                  />
                </TabsContent>
              )}

              <TabsContent value="amenities">
                <UnitAmenities 
                  formData={formData}
                  updateFormData={handleInputChange}
                />
              </TabsContent>
            </Tabs>
          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : (unit ? 'Update Unit' : 'Create Unit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
