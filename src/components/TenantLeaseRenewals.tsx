import React from 'react';
import { TenantLeaseRenewalStatus } from './TenantLeaseRenewalStatus';

interface TenantLeaseRenewalsProps {
  userId: string;
}

const TenantLeaseRenewals = ({ userId }: TenantLeaseRenewalsProps) => {
  return (
    <div className="space-y-6">
      <TenantLeaseRenewalStatus userId={userId} />
    </div>
  );
};

export default TenantLeaseRenewals;