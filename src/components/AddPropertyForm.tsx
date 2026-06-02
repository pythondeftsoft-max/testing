import React, { useState } from 'react';
import { MultiStepPropertyForm } from './MultiStepPropertyForm';
import { MultiStepEditPropertyForm } from './MultiStepEditPropertyForm';
import { CommercialPropertySelector } from './commercial/CommercialPropertySelector';
import { MultiStepCommercialPropertyForm } from './MultiStepCommercialPropertyForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CommercialPropertyType, CommercialSubType, CommercialPropertyData } from '@/types/commercial';
import { useSubmitCommercialProperty, useUpdateCommercialProperty } from '@/hooks/useCommercialProperty';
import PermissionGuard from '@/components/permissions/PermissionGuard';

interface AddPropertyFormProps {
  userId: string;
  onPropertyAdded: () => void;
  onCancel: () => void;
  editingProperty?: any;
  portfolioId?: string;
  isAdminMode?: boolean;
}

type PropertyType = 'residential' | 'commercial';

const AddPropertyForm = ({ 
  userId, 
  onPropertyAdded, 
  onCancel, 
  editingProperty, 
  portfolioId,
  isAdminMode
}: AddPropertyFormProps) => {
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [commercialType, setCommercialType] = useState<CommercialPropertyType | null>(null);
  const [commercialSubtype, setCommercialSubtype] = useState<CommercialSubType | null>(null);
  
  const submitCommercialProperty = useSubmitCommercialProperty();
  const updateCommercialProperty = useUpdateCommercialProperty();

  // If editing existing property, determine type and skip selection
  React.useEffect(() => {
    if (editingProperty) {
      setPropertyType(editingProperty.property_type === 'commercial' ? 'commercial' : 'residential');
      if (editingProperty.commercial_type) {
        setCommercialType(editingProperty.commercial_type);
        setCommercialSubtype(editingProperty.commercial_subtype);
      }
    }
  }, [editingProperty]);

  const handlePropertyTypeSelect = (type: PropertyType) => {
    setPropertyType(type);
    // Trigger property limit check only for actual properties
    const event = new CustomEvent('propertyTypeSelected');
    window.dispatchEvent(event);
    
    if (type === 'residential') {
      // Skip commercial selection for residential
      setCommercialType(null);
      setCommercialSubtype(null);
    }
  };

  const handleCommercialTypeSelect = (type: CommercialPropertyType, subtype?: CommercialSubType) => {
    setCommercialType(type);
    setCommercialSubtype(subtype || null);
  };

  const handleCommercialSubmit = async (commercialData: CommercialPropertyData) => {
    // Validate portfolio selection when coming from "everything" view
    if (portfolioId === 'everything' && !commercialData.selectedPortfolio) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Portfolio Required",
        description: "Please select a client portfolio for this property.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await submitCommercialProperty.mutateAsync({
        ...commercialData,
        owner_id: userId,
        portfolio_id: commercialData.selectedPortfolio || (portfolioId === 'everything' ? undefined : portfolioId)
      });
      onPropertyAdded();
    } catch (error) {
      console.error('Failed to submit commercial property:', error);
    }
  };

  const handleBack = () => {
    if (commercialType) {
      setCommercialType(null);
      setCommercialSubtype(null);
    } else if (propertyType) {
      setPropertyType(null);
    } else {
      onCancel();
    }
  };

  // Show portfolio type selection first (unless editing)
  if (!editingProperty && !propertyType) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">What type of property would you like to add?</h3>
          <p className="text-muted-foreground mb-6">Choose between residential or commercial property types</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <PermissionGuard 
            object="portfolio.properties" 
            action="create" 
            scope={!portfolioId || portfolioId === 'everything' ? "account" : "portfolio"} 
            portfolioId={portfolioId === 'everything' ? undefined : portfolioId}
            fallback={null}
          >
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handlePropertyTypeSelect('residential')}
            >
              <CardContent className="p-6 text-center">
                <Home className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">Residential Property</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Single family homes, condos, apartments, and other residential properties
                </p>
              </CardContent>
            </Card>
          </PermissionGuard>
          
          <PermissionGuard 
            object="portfolio.properties" 
            action="create" 
            scope={!portfolioId || portfolioId === 'everything' ? "account" : "portfolio"} 
            portfolioId={portfolioId === 'everything' ? undefined : portfolioId}
            fallback={null}
          >
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handlePropertyTypeSelect('commercial')}
            >
              <CardContent className="p-6 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle className="mb-2">Commercial Property</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Office buildings, retail spaces, warehouses, and other commercial properties
                </p>
              </CardContent>
            </Card>
          </PermissionGuard>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Show commercial type selection
  if (propertyType === 'commercial' && !commercialType && !editingProperty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">Add Commercial Property</h2>
          </div>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <CommercialPropertySelector
          onSelectType={handleCommercialTypeSelect}
          selectedType={commercialType || undefined}
          selectedSubtype={commercialSubtype || undefined}
        />
      </div>
    );
  }

  // Show commercial property form
  if (propertyType === 'commercial' && commercialType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">
              {editingProperty ? 'Edit' : 'Add'} Commercial Property
            </h2>
          </div>
        </div>

        <MultiStepCommercialPropertyForm
          initialData={editingProperty || {
            commercial_type: commercialType,
            commercial_subtype: commercialSubtype ?? undefined
          }}
          onSubmit={editingProperty ? 
            (data) => updateCommercialProperty.mutate({ 
              propertyId: editingProperty.id, 
              data 
            }) : 
            handleCommercialSubmit
          }
          onCancel={onCancel}
          isLoading={submitCommercialProperty.isPending || updateCommercialProperty.isPending}
          userId={userId}
          portfolioId={portfolioId}
          commercialType={commercialType}
          commercialSubtype={commercialSubtype ?? undefined}
        />
      </div>
    );
  }

  // Show residential property form
  if (editingProperty) {
    return (
      <MultiStepEditPropertyForm
        isOpen={true}
        onClose={onCancel}
        onSave={onPropertyAdded}
        editingProperty={editingProperty}
        userId={userId}
        portfolioId={portfolioId}
      />
    );
  }

  return (
    <MultiStepPropertyForm
      isOpen={true}
      onClose={onCancel}
      portfolioId={portfolioId}
      onPropertyAdded={onPropertyAdded}
    />
  );
};

export default AddPropertyForm;
