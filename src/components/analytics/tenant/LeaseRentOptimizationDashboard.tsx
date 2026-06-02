import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeaseManagementWidgetRenderer } from '@/components/analytics/widgets/LeaseManagementWidgetRenderer';


interface LeaseRentOptimizationDashboardProps {
  landlordId: string;
  portfolioId?: string;
}

interface LeaseData {
  propertyId: string;
  address: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  status: string;
  daysUntilExpiry: number;
  marketRent: number;
  optimizationPotential: number;
  recommendedAction: 'increase' | 'maintain' | 'decrease';
}

const LeaseRentOptimizationDashboard: React.FC<LeaseRentOptimizationDashboardProps> = ({
  landlordId,
  portfolioId
}) => {
  const [leases, setLeases] = useState<LeaseData[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    fetchLeaseData();
  }, [landlordId, portfolioId]);

  const fetchLeaseData = async () => {
    try {
      let query = supabase
        .from('properties')
        .select(`
          id, address, lease_start_date, lease_end_date, monthly_rent, status,
          property_applications!inner(
            tenant_id, status,
            profiles!property_applications_tenant_id_fkey(first_name, last_name)
          )
        `)
        .eq('owner_id', landlordId)
        .eq('property_applications.status', 'approved')
        .not('lease_end_date', 'is', null);

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data: properties } = await query;

      if (properties) {
        const today = new Date();
        const leaseData: LeaseData[] = properties.map(property => {
          const tenant = property.property_applications[0]?.profiles;
          const leaseEnd = new Date(property.lease_end_date);
          const daysUntilExpiry = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Mock market rent calculation (in real app, this would use market data APIs)
          const baseMarketRent = property.monthly_rent * (1 + (Math.random() * 0.3 - 0.15)); // ±15% variation
          const marketRent = Math.round(baseMarketRent / 50) * 50; // Round to nearest $50
          
          const currentRent = property.monthly_rent;
          const difference = marketRent - currentRent;
          const percentageDifference = (difference / currentRent) * 100;
          
          let recommendedAction: 'increase' | 'maintain' | 'decrease';
          if (percentageDifference > 5) recommendedAction = 'increase';
          else if (percentageDifference < -5) recommendedAction = 'decrease';
          else recommendedAction = 'maintain';
          
          return {
            propertyId: property.id,
            address: property.address,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant',
            leaseStart: property.lease_start_date,
            leaseEnd: property.lease_end_date,
            monthlyRent: property.monthly_rent || 0,
            status: property.status,
            daysUntilExpiry,
            marketRent,
            optimizationPotential: Math.abs(difference),
            recommendedAction
          };
        });

        setLeases(leaseData);
      }
    } catch (error) {
      console.error('Error fetching lease data:', error);
    } finally {
      setLoading(false);
    }
  };


  const leaseMetrics = {
    totalLeases: leases.length,
    expiringLeases: leases.filter(lease => lease.daysUntilExpiry <= 90).length,
    optimizationPotential: leases.reduce((sum, lease) => sum + lease.optimizationPotential, 0),
    renewalRate: leases.length > 0 ? (leases.filter(lease => lease.status === 'active').length / leases.length) * 100 : 0,
    averageLeaseLength: 12, // Mock data - average lease length in months
    currentAverageRent: leases.length > 0 ? leases.reduce((sum, lease) => sum + lease.monthlyRent, 0) / leases.length : 0,
    rentIncreaseOpportunities: leases.filter(lease => lease.recommendedAction === 'increase').length
  };


  return (
    <LeaseManagementWidgetRenderer
      landlordId={landlordId}
      portfolioId={portfolioId}
      leaseData={leaseMetrics}
      loading={loading}
    />
  );
};

export default LeaseRentOptimizationDashboard;