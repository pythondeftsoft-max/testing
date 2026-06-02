
import React from 'react';
import { DollarSign, Clock, AlertTriangle, CheckCircle, TrendingUp, Award } from 'lucide-react';
import { MetricDisplay } from '@/components/ui/metric-display';
import { MetricSkeleton } from '@/components/ui/metric-skeleton';
import { usePlacementFeesAnalytics } from '@/hooks/usePlacementFeesAnalytics';

const PlacementFeesMetrics = () => {
  const { data: metrics, isLoading, error } = usePlacementFeesAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <MetricDisplay label="Pending" value="--" error={true} />
        <MetricDisplay label="Paid This Month" value="--" error={true} />
        <MetricDisplay label="Avg Fee" value="--" error={true} />
        <MetricDisplay label="Total All Fees" value="--" error={true} />
        <MetricDisplay label="Overdue" value="--" error={true} />
        <MetricDisplay label="Total Placements" value="--" error={true} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <MetricDisplay
        label="Pending"
        value={`$${Math.round(metrics.pendingAmount).toLocaleString()}`}
        subtitle={`${metrics.pendingCount} ${metrics.pendingCount === 1 ? 'placement' : 'placements'}`}
        icon={<Clock className="h-4 w-4" />}
        valueClassName="text-yellow-600"
      />
      <MetricDisplay
        label="Paid This Month"
        value={`$${Math.round(metrics.paidThisMonthAmount).toLocaleString()}`}
        subtitle={`${metrics.paidThisMonth} ${metrics.paidThisMonth === 1 ? 'placement' : 'placements'}`}
        icon={<CheckCircle className="h-4 w-4" />}
        valueClassName="text-green-600"
      />
      <MetricDisplay
        label="Avg Fee"
        value={`$${Math.round(metrics.avgFeeAmount).toLocaleString()}`}
        icon={<TrendingUp className="h-4 w-4" />}
        valueClassName="text-blue-600"
      />
      <MetricDisplay
        label="Total Paid"
        value={`$${Math.round(metrics.totalPaidFees).toLocaleString()}`}
        icon={<DollarSign className="h-4 w-4" />}
        valueClassName="text-purple-600"
      />
      <MetricDisplay
        label="Overdue"
        value={`$${Math.round(metrics.overdueAmount).toLocaleString()}`}
        subtitle={`${metrics.overdueCount} ${metrics.overdueCount === 1 ? 'placement' : 'placements'}`}
        icon={<AlertTriangle className="h-4 w-4" />}
        valueClassName="text-red-600"
      />
      <MetricDisplay
        label="Total Placements"
        value={metrics.totalPlacements}
        icon={<Award className="h-4 w-4" />}
        valueClassName="text-green-600"
      />
    </div>
  );
};

export default PlacementFeesMetrics;
