
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Calendar, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface LeaseInfo {
  property_address: string;
  lease_start_date: string | null;
  lease_end_date: string | null;
  monthly_rent: number;
  status: string;
  property_id: string;
  bedrooms?: number;
  bathrooms?: number;
  rent_split?: any;
}

interface TenantLeaseInfoProps {
  userId: string;
  currentUserId?: string | null;
}

const TenantLeaseInfo = ({ userId, currentUserId }: TenantLeaseInfoProps) => {
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaseInfo();
  }, [userId]);

  const fetchLeaseInfo = async () => {
    try {
      console.log('Fetching lease info for user:', userId);
      
      // Query lease_lifecycle_tracking directly for active leases
      const { data: leases, error: leaseError } = await supabase
        .from('lease_lifecycle_tracking')
        .select('*')
        .eq('tenant_id', userId)
        .eq('lease_status', 'active');

      if (leaseError) {
        console.error('Lease tracking error:', leaseError);
        throw leaseError;
      }

      console.log('Fetched active leases from lease_lifecycle_tracking:', leases);

      if (!leases || leases.length === 0) {
        console.log('No active leases found');
        setLeaseInfo([]);
        return;
      }

      // For each active lease, get property and rent split info
      const leasePromises = leases.map(async (lease) => {
        console.log('Processing lease:', lease);

        // Fetch property details
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', lease.property_id)
          .single();

        if (propertyError) {
          console.error('Property fetch error for lease:', lease.id, 'property_id:', lease.property_id, 'error:', propertyError);
          return null;
        }

        if (!property) {
          console.warn('No property data returned for lease:', lease.id, 'property_id:', lease.property_id);
          return null;
        }

        console.log('Found property:', property);

        // Fetch rent split info
        const { data: rentSplit } = await supabase
          .from('rent_splits')
          .select('*')
          .eq('property_id', property.id)
          .maybeSingle();

        console.log('Found rent split for property:', property.id, rentSplit);

        return {
          property_id: property.id,
          property_address: property.address,
          lease_start_date: lease.lease_start_date,
          lease_end_date: lease.lease_end_date,
          monthly_rent: lease.monthly_rent,
          status: lease.lease_status,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rent_split: rentSplit
        };
      });

      const leasesData = (await Promise.all(leasePromises)).filter(Boolean);
      console.log('Final leases data:', leasesData);

      setLeaseInfo(leasesData);
    } catch (error) {
      console.error('Error fetching lease info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeaseStatus = (lease: LeaseInfo) => {
    if (!lease.lease_end_date) return { status: 'active', color: 'default' };
    
    const endDate = new Date(lease.lease_end_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'destructive' };
    if (daysUntilExpiry <= 30) return { status: 'expiring soon', color: 'secondary' };
    return { status: 'active', color: 'default' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading lease information...</p>
        </div>
      </div>
    );
  }

  if (leaseInfo.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Leases</h3>
            <p className="text-gray-600">
              You don't have any active lease agreements. Once your applications are approved, 
              your lease information will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {leaseInfo.map((lease) => {
        const leaseStatus = getLeaseStatus(lease);
        
        return (
          <Card key={lease.property_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Lease Agreement
                </CardTitle>
                <Badge variant={leaseStatus.color as any}>
                  {leaseStatus.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Property Address</h4>
                  <p className="text-gray-600">{lease.property_address}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {lease.rent_split ? 'Total Monthly Rent' : 'Monthly Rent'}
                  </h4>
                  <p className="text-gray-600 text-lg font-semibold">
                    ${lease.monthly_rent.toLocaleString()}
                  </p>
                  {lease.rent_split && (
                    <div className="mt-2 text-sm text-gray-500">
                      <p>HAP Portion: ${lease.rent_split.pha_portion.toLocaleString()}</p>
                      <p>Your Portion: ${lease.rent_split.tenant_portion.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                {lease.lease_start_date && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Lease Start Date
                    </h4>
                    <p className="text-gray-600">
                      {format(new Date(lease.lease_start_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                )}
                
                {lease.lease_end_date && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Lease End Date
                    </h4>
                    <p className="text-gray-600">
                      {format(new Date(lease.lease_end_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                )}

                {(lease.bedrooms || lease.bathrooms) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Property Details</h4>
                    <div className="flex gap-4 text-gray-600">
                      {lease.bedrooms && <p>{lease.bedrooms} Bedrooms</p>}
                      {lease.bathrooms && <p>{lease.bathrooms} Bathrooms</p>}
                    </div>
                  </div>
                )}
              </div>
              
              {leaseStatus.status === 'expiring soon' && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Lease Expiring Soon</p>
                    <p className="text-yellow-700">
                      Your lease expires on {format(new Date(lease.lease_end_date!), 'MMMM dd, yyyy')}. 
                      Contact your landlord about renewal options.
                    </p>
                  </div>
                </div>
              )}
              
              {leaseStatus.status === 'expired' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Lease Expired</p>
                    <p className="text-red-700">
                      Your lease expired on {format(new Date(lease.lease_end_date!), 'MMMM dd, yyyy')}. 
                      Please contact your landlord immediately.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantLeaseInfo;
