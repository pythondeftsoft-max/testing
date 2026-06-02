
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { TenantInvitationModal } from './TenantInvitationModal';
import { useTenantInvitations } from '@/hooks/useTenantInvitations';

interface InviteTenantButtonProps {
  propertyId: string;
  unitId?: string;
  propertyStatus: string;
  tenantId?: string;
  defaultTenantType?: string;
  propertyAddress: string;
  landlordId: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'success';
  occupancyStatus?: string;
  iconOnly?: boolean;
  onTenantInvited?: () => void;
  supportsTenantManagement?: boolean;
}

export const InviteTenantButton = ({
  propertyId,
  unitId,
  propertyStatus,
  tenantId,
  defaultTenantType = 'voucher',
  propertyAddress,
  landlordId,
  size = 'sm',
  variant = 'outline',
  occupancyStatus,
  iconOnly = false,
  onTenantInvited,
  supportsTenantManagement = true
}: InviteTenantButtonProps) => {
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const { canInviteTenant } = useTenantInvitations(landlordId);

  // For unit-level invitations, show the button if there's no tenant linked
  // For property-level invitations, use the original logic
  const shouldShowButton = supportsTenantManagement && (unitId 
    ? (!tenantId || tenantId === null) // Unit-level: show if no tenant
    : (!occupancyStatus || occupancyStatus !== 'occupied') && (!tenantId || tenantId === null)); // Property-level: original logic

  if (!shouldShowButton) {
    return null;
  }

  const handleInvitationClose = () => {
    setShowInvitationModal(false);
    if (onTenantInvited) {
      onTenantInvited();
    }
  };

  return (
    <>
      <Button
        size={iconOnly ? 'icon' : size}
        variant={variant}
        onClick={() => setShowInvitationModal(true)}
        className={`flex items-center gap-2 ${iconOnly ? 'h-8 w-8 text-green-600 hover:bg-green-600 hover:text-white' : ''}`}
        aria-label="Invite Tenant"
        title="Invite Tenant"
      >
        <UserPlus className="h-4 w-4" />
        {!iconOnly && 'Invite Tenant'}
      </Button>

      <TenantInvitationModal
        isOpen={showInvitationModal}
        onClose={handleInvitationClose}
        propertyId={propertyId}
        unitId={unitId}
        defaultTenantType={defaultTenantType}
        propertyAddress={propertyAddress}
        landlordId={landlordId}
      />
    </>
  );
};
