import React from 'react';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { DollarSign, AlertTriangle, TrendingUp, Calendar, type LucideIcon } from 'lucide-react';

interface LeaseFinancialMetricsProps {
  units: any[];
  renewals: any[];
}

export const LeaseFinancialMetrics: React.FC<LeaseFinancialMetricsProps> = ({ units, renewals }) => {
  // Calculate total monthly rent from all occupied units
  const totalMonthlyRent = units.reduce((sum, unit) => {
    if (unit.monthly_rent) {
      return sum + unit.monthly_rent;
    }
    return sum;
  }, 0);

  // Calculate rent at risk (expiring in 30 days without active renewal)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const rentAtRisk = units.reduce((sum, unit) => {
    if (!unit.lease_end_date || !unit.monthly_rent) return sum;
    
    const leaseEndDate = new Date(unit.lease_end_date);
    const isExpiringSoon = leaseEndDate <= thirtyDaysFromNow && leaseEndDate >= today;
    
    // Check if there's an active renewal for this unit
    const hasActiveRenewal = renewals.some(
      renewal => renewal.property_id === unit.property_id && 
                 ['pending', 'sent', 'negotiating'].includes(renewal.renewal_status)
    );
    
    if (isExpiringSoon && !hasActiveRenewal) {
      return sum + unit.monthly_rent;
    }
    return sum;
  }, 0);

  // Calculate renewal rate (completed renewals / total renewals initiated)
  const completedRenewals = renewals.filter(r => r.renewal_status === 'completed').length;
  const totalRenewals = renewals.filter(r => 
    ['completed', 'declined'].includes(r.renewal_status)
  ).length;
  const renewalRate = totalRenewals > 0 ? (completedRenewals / totalRenewals) * 100 : 0;

  // Calculate average days remaining across all leases
  const leasesWithEndDates = units.filter(u => u.lease_end_date && u.status === 'occupied');
  const totalDaysRemaining = leasesWithEndDates.reduce((sum, unit) => {
    const leaseEndDate = new Date(unit.lease_end_date);
    const daysRemaining = Math.max(0, Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    return sum + daysRemaining;
  }, 0);
  const avgDaysRemaining = leasesWithEndDates.length > 0 
    ? Math.round(totalDaysRemaining / leasesWithEndDates.length) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <EnhancedMetricCard
        title="Total Monthly Rent"
        value={`$${totalMonthlyRent.toLocaleString()}`}
        subtitle="Active portfolio income"
        icon={DollarSign}
        iconColor="text-primary"
      />
      
      <EnhancedMetricCard
        title="Rent at Risk"
        value={`$${rentAtRisk.toLocaleString()}`}
        subtitle="Expiring in 30 days"
        icon={AlertTriangle}
        iconColor={rentAtRisk > 0 ? "text-warning" : "text-primary"}
      />
      
      <EnhancedMetricCard
        title="Renewal Rate"
        value={`${renewalRate.toFixed(0)}%`}
        subtitle="Success rate"
        icon={TrendingUp}
        iconColor={renewalRate >= 70 ? "text-success" : renewalRate >= 50 ? "text-warning" : "text-destructive"}
      />
      
      <EnhancedMetricCard
        title="Avg Lease Remaining"
        value={avgDaysRemaining}
        subtitle="days average"
        icon={Calendar}
        iconColor="text-primary"
      />
    </div>
  );
};
