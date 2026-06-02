import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TenantAvatar } from '@/components/enhanced/TenantAvatar';
import { MessageCircle, FileText, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { EnhancedHousedTenant } from '@/hooks/useEnhancedHousedTenants';
import TenantProfileModal from '@/components/TenantProfileModal';
import RentSplitForm from '@/components/RentSplitForm';

interface CurrentTenantsTableProps {
  tenants: EnhancedHousedTenant[];
}

export const CurrentTenantsTable = ({ tenants }: CurrentTenantsTableProps) => {
  const navigate = useNavigate();
  const [selectedTenant, setSelectedTenant] = useState<{ tenantId: string; propertyId: string } | null>(null);
  const [rentSplitProperty, setRentSplitProperty] = useState<{ id: string; address: string } | null>(null);

  const handleMessage = (tenantId: string) => {
    navigate('/dashboard?portfolioId=everything', { 
      state: { activeTab: 'Messages', tenantIdToSelect: tenantId } 
    });
  };

  const handleViewProfile = (tenantId: string, propertyId: string) => {
    setSelectedTenant({ tenantId, propertyId });
  };

  const getLeaseRenewalsCount = (tenant: EnhancedHousedTenant) => {
    return tenant.housing_history.filter(h => h.lease_renewed).length;
  };

  const formatPropertyUnit = (tenant: EnhancedHousedTenant) => {
    const address = tenant.properties?.address || 'N/A';
    const unitInfo = tenant.unit_info;
    
    if (unitInfo) {
      const unitLabel = unitInfo.unit_name || `Unit ${unitInfo.unit_number}`;
      return `${address} - ${unitLabel}`;
    }
    return address;
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property / Unit</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Open Issues</TableHead>
              <TableHead>Lease Renewals</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
              const firstName = tenant.profiles?.first_name || '';
              const lastName = tenant.profiles?.last_name || '';
              const email = tenant.profiles?.email || 'N/A';
              const phone = tenant.profiles?.phone || 'N/A';
              const openIssues = tenant.maintenance_summary.open_requests;
              const leaseRenewals = getLeaseRenewalsCount(tenant);
              
              // Get rent data from rent_splits or fallback to property rent
              const totalRent = tenant.rent_splits?.total_rent || tenant.properties?.monthly_rent || 0;
              const tenantPortion = tenant.rent_splits?.tenant_portion || totalRent;
              const hapPortion = tenant.rent_splits?.pha_portion || 0;

              return (
                <TableRow key={`${tenant.tenant_id}-${tenant.property_id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <TenantAvatar 
                        firstName={firstName}
                        lastName={lastName}
                        email={email}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {firstName} {lastName}
                        </span>
                        {email !== 'N/A' ? (
                          <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                            {email}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">{email}</span>
                        )}
                        {phone !== 'N/A' ? (
                          <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                            {phone}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">{phone}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="whitespace-normal">
                      {formatPropertyUnit(tenant)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{formatCurrency(totalRent)}</span>
                      <span className="text-sm text-muted-foreground">
                        Tenant: {formatCurrency(tenantPortion)}
                      </span>
                      {hapPortion > 0 && (
                        <span className="text-sm text-green-600">
                          HAP: {formatCurrency(hapPortion)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={openIssues > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                      {openIssues}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={leaseRenewals > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      {leaseRenewals}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRentSplitProperty({ 
                          id: tenant.property_id, 
                          address: tenant.properties?.address || '' 
                        })}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Edit Rent
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewProfile(tenant.tenant_id, tenant.property_id)}
                        title="View Full Profile"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMessage(tenant.tenant_id)}
                        title="Message"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedTenant && (
        <TenantProfileModal
          isOpen={!!selectedTenant}
          onClose={() => setSelectedTenant(null)}
          tenantId={selectedTenant.tenantId}
          propertyId={selectedTenant.propertyId}
          isPrimary={true}
        />
      )}

      {rentSplitProperty && (
        <RentSplitForm
          property={rentSplitProperty}
          onClose={() => setRentSplitProperty(null)}
          onSaved={() => setRentSplitProperty(null)}
        />
      )}
    </>
  );
};
