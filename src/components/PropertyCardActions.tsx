
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Eye, Trash2, DollarSign } from 'lucide-react';
import { PropertyListingToggle } from './PropertyListingToggle';
import { TenantQuickActions } from './property/TenantQuickActions';
import { PropertyFinancialSetupWizard } from './property/PropertyFinancialSetupWizard';
import { useTenantManagementVisibility } from '@/hooks/useAssetBehavior';

interface PropertyCardActionsProps {
  property: any;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  currentUserId: string;
  onPropertyUpdated?: () => void;
}

export const PropertyCardActions = ({
  property,
  onEdit,
  onDelete,
  onViewDetails,
  currentUserId,
  onPropertyUpdated
}: PropertyCardActionsProps) => {
  const [showFinancialWizard, setShowFinancialWizard] = useState(false);
  
  const handlePropertyUpdated = () => {
    onPropertyUpdated?.();
  };

  // Check if property is occupied and has tenant (align with list view logic)
  const hasTenant = property.occupancy_status === 'occupied';
  
  // Determine if tenant management is supported for this property
  const supportsTenant = useTenantManagementVisibility(property as any);
  
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={onViewDetails}>
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </Button>
        
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>

        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setShowFinancialWizard(true)}
          className="text-muted-foreground hover:text-primary"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Financials
        </Button>

        {/* Tenant Management Actions */}
        <TenantQuickActions
          propertyId={property.id}
          propertyAddress={property.address}
          hasTenant={hasTenant}
          onStatusChange={handlePropertyUpdated}
          currentOnMarket={property.on_market}
          supportsTenantManagement={supportsTenant}
          adminMode={false}
          tenantInfo={property.tenant_id ? {
            tenant_id: property.tenant_id,
            tenant_name: property.tenant_name || 'Unknown Tenant',
            tenant_email: property.tenant_email || ''
          } : undefined}
        />

        {/* Property Listing Toggle - Available for all properties including occupied */}
        <PropertyListingToggle
          propertyId={property.id}
          propertyAddress={property.address}
          currentStatus={property.status}
          onStatusChanged={handlePropertyUpdated}
          size="sm"
          variant="outline"
        />

        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      <PropertyFinancialSetupWizard
        isOpen={showFinancialWizard}
        onClose={() => setShowFinancialWizard(false)}
        propertyId={property.id}
        propertyAddress={property.address}
        currentData={property}
      />
    </>
  );
};
