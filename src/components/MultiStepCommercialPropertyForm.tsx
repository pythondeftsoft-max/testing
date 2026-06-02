import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/hooks/use-toast';
import { CommercialPropertyData, CommercialPropertyType, CommercialSubType } from '@/types/commercial';
import { getCommercialPropertyDefaults } from '@/utils/commercialPropertyDefaults';

// Import commercial step components
import { CommercialBasicInfo } from './commercial-steps/CommercialBasicInfo';
import { CommercialPropertyDetails } from './commercial-steps/CommercialPropertyDetails';
import { CommercialLeaseStructure } from './commercial-steps/CommercialLeaseStructure';
import { CommercialBusinessOperations } from './commercial-steps/CommercialBusinessOperations';

interface MultiStepCommercialPropertyFormProps {
  initialData?: Partial<CommercialPropertyData>;
  onSubmit: (data: CommercialPropertyData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  userId: string;
  portfolioId?: string;
  commercialType: CommercialPropertyType;
  commercialSubtype?: CommercialSubType;
}

const TAB_VALUES = {
  'basic-info': 'Basic Info',
  'property-details': 'Property Details',
  'lease-structure': 'Lease Structure', 
  'business-operations': 'Business Operations'
} as const;

const STEP_LABELS = ['Basic Info', 'Property Details', 'Lease Structure', 'Business Operations'];

const getStepFromTab = (tab: string): number => {
  const tabOrder = ['basic-info', 'property-details', 'lease-structure', 'business-operations'];
  return tabOrder.indexOf(tab);
};

export const MultiStepCommercialPropertyForm = ({ 
  initialData,
  onSubmit, 
  onCancel, 
  isLoading = false,
  userId,
  portfolioId,
  commercialType,
  commercialSubtype
}: MultiStepCommercialPropertyFormProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('basic-info');

  // Initialize form data with commercial property defaults
  const [formData, setFormData] = useState<CommercialPropertyData>({
    property_type: 'commercial',
    commercial_type: commercialType,
    commercial_subtype: commercialSubtype,
    asset_tags: initialData?.asset_tags || [],
    is_multi_tenant: initialData?.is_multi_tenant || false,
    lease_type: initialData?.lease_type || 'gross',
    cam_recoverable: initialData?.cam_recoverable || false,
    is_owner_operated: initialData?.is_owner_operated || false,
    source_badge: initialData?.source_badge || 'manual',
    asset_category: initialData?.asset_category || 'real_estate',
    
    // Address fields
    country: initialData?.country || 'US',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip_code: initialData?.zip_code || '',
    latitude: initialData?.latitude,
    longitude: initialData?.longitude,
    
    // Images
    images: [],
    
    ...initialData
  });

  // Auto-set owner-operated defaults when commercial type/subtype changes
  useEffect(() => {
    const defaults = getCommercialPropertyDefaults(formData.commercial_type, formData.commercial_subtype);
    setFormData(prev => ({
      ...prev,
      ...defaults
    }));
  }, [formData.commercial_type, formData.commercial_subtype]);

  const updateFormData = (field: keyof CommercialPropertyData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.address || !formData.city || !formData.state || !formData.zip_code) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required address fields.",
        variant: "destructive",
      });
      setActiveTab('basic-info');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Stepper
          currentStep={getStepFromTab(activeTab)}
          steps={STEP_LABELS}
          className="mb-6"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="property-details">Property Details</TabsTrigger>
          <TabsTrigger value="lease-structure">Lease Structure</TabsTrigger>
          <TabsTrigger value="business-operations">Business Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info" className="space-y-6">
          <CommercialBasicInfo
            formData={formData}
            updateFormData={updateFormData}
            userId={userId}
            portfolioId={portfolioId}
          />
        </TabsContent>

        <TabsContent value="property-details" className="space-y-6">
          <CommercialPropertyDetails
            formData={formData}
            updateFormData={updateFormData}
          />
        </TabsContent>

        <TabsContent value="lease-structure" className="space-y-6">
          <CommercialLeaseStructure
            formData={formData}
            updateFormData={updateFormData}
          />
        </TabsContent>

        <TabsContent value="business-operations" className="space-y-6">
          <CommercialBusinessOperations
            formData={formData}
            updateFormData={updateFormData}
          />
        </TabsContent>

        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isLoading}
          >
            {isLoading ? 'Adding Property...' : 'Add Commercial Property'}
          </Button>
        </div>
      </Tabs>
    </div>
  );
};