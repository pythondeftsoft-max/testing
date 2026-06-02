import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedLeaseRenewalCard } from './EnhancedLeaseRenewalCard';

interface LeaseRenewalOverviewProps {
  landlordId: string;
  portfolioId?: string;
  activeFilter?: string;
  onFilterChange?: (filter: string | null) => void;
}

interface OverviewData {
  pending: number;
  sent: number; // Changed from approved to sent for clarity
  completed: number; // Combined accepted and signed renewals
  declined: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
}

export const LeaseRenewalOverview: React.FC<LeaseRenewalOverviewProps> = ({ 
  landlordId, 
  portfolioId,
  activeFilter,
  onFilterChange
}) => {
  const [data, setData] = useState<OverviewData>({
    pending: 0,
    sent: 0,
    completed: 0,
    declined: 0,
    expiringIn30Days: 0,
    expiringIn60Days: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, [landlordId, portfolioId]);

  const fetchOverviewData = async () => {
    try {
      // Fetch lease renewal counts
      let renewalQuery = supabase
        .from('lease_renewals')
        .select(`
          renewal_status,
          properties!inner(owner_id, portfolio_id)
        `)
        .eq('properties.owner_id', landlordId);

      if (portfolioId && portfolioId !== 'everything') {
        renewalQuery = renewalQuery.eq('properties.portfolio_id', portfolioId);
      }

      const { data: renewals, error: renewalError } = await renewalQuery;

      if (renewalError) throw renewalError;

      // Count renewals by status
      const counts = {
        pending: 0,
        sent: 0,
        completed: 0,
        declined: 0,
        expiringIn30Days: 0,
        expiringIn60Days: 0,
      };

      renewals?.forEach((renewal) => {
        switch (renewal.renewal_status) {
          case 'pending':
            counts.pending++;
            break;
          case 'sent':
          case 'approved': // Legacy status mapping
            counts.sent++;
            break;
          case 'accepted':
          case 'completed':
          case 'landlord_signed':
            counts.completed++;
            break;
          case 'declined':
          case 'rejected':
            counts.declined++;
            break;
        }
      });

      // Fetch upcoming lease expirations
      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      let expirationQuery = supabase
        .from('properties')
        .select('lease_end_date, portfolio_id')
        .eq('owner_id', landlordId)
        .not('lease_end_date', 'is', null)
        .gte('lease_end_date', today.toISOString().split('T')[0]);

      if (portfolioId && portfolioId !== 'everything') {
        expirationQuery = expirationQuery.eq('portfolio_id', portfolioId);
      }

      const { data: expirations, error: expirationError } = await expirationQuery;

      if (expirationError) throw expirationError;

      expirations?.forEach((property) => {
        const leaseEndDate = new Date(property.lease_end_date);
        if (leaseEndDate <= in30Days) {
          counts.expiringIn30Days++;
        } else if (leaseEndDate <= in60Days) {
          counts.expiringIn60Days++;
        }
      });

      setData(counts);
    } catch (error) {
      console.error('Error fetching lease renewal overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (filterType: string) => {
    if (onFilterChange) {
      // Toggle filter - if already active, clear it
      const newFilter = activeFilter === filterType ? null : filterType;
      onFilterChange(newFilter);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <EnhancedLeaseRenewalCard
        title="Pending Requests"
        value={data.pending}
        icon={Clock}
        iconColor="bg-yellow-500"
        subtitle={data.pending > 0 ? "Needs Review" : "All caught up"}
        description="Tenant requests awaiting landlord review"
        isActive={activeFilter === 'pending'}
        onClick={() => handleCardClick('pending')}
      />

      <EnhancedLeaseRenewalCard
        title="Approved Offers"
        value={data.sent}
        icon={Check}
        iconColor="bg-blue-500"
        subtitle={data.sent > 0 ? "Awaiting Response" : "No pending offers"}
        description="Offers sent to tenants awaiting their response"
        isActive={activeFilter === 'sent'}
        onClick={() => handleCardClick('sent')}
      />

      <EnhancedLeaseRenewalCard
        title="Completed"
        value={data.completed}
        icon={Calendar}
        iconColor="bg-green-500"
        subtitle="Renewals finalized"
        description="Accepted renewals and signed contracts"
        isActive={activeFilter === 'completed'}
        onClick={() => handleCardClick('completed')}
      />

      <EnhancedLeaseRenewalCard
        title="Declined"
        value={data.declined}
        icon={X}
        iconColor="bg-red-500"
        subtitle="Rejected by tenants"
        description="Renewals declined or rejected by tenants"
        isActive={activeFilter === 'declined'}
        onClick={() => handleCardClick('declined')}
      />

      <EnhancedLeaseRenewalCard
        title="Expiring Soon"
        value={data.expiringIn30Days}
        icon={AlertTriangle}
        iconColor="bg-orange-500"
        subtitle={`${data.expiringIn60Days} in 60 days`}
        description="Leases expiring within 30 days"
        isActive={activeFilter === 'expiring'}
        onClick={() => handleCardClick('expiring')}
      />
    </div>
  );
};