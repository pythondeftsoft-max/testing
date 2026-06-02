
import React from 'react';
import PropertySearch from '@/components/PropertySearch';

interface MarketplaceTabContentProps {
  userId: string;
  tenantProfile: any;
}

const MarketplaceTabContent: React.FC<MarketplaceTabContentProps> = ({
  userId,
  tenantProfile
}) => {
  // Directly render the PropertySearch component with Pigeon map for tenant dashboard
  return <PropertySearch userId={userId} tenantProfile={tenantProfile} />;
};

export default MarketplaceTabContent;
