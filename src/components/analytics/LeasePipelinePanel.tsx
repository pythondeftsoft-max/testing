import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Calendar, RefreshCw, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { LeasePipeline } from '@/hooks/useLandlordAnalytics';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { Badge } from '@/components/ui/badge';
import { formatPercentage } from '@/lib/formatters';

interface LeasePipelinePanelProps {
  data: LeasePipeline | null;
  loading: boolean;
}

const LeasePipelinePanel = ({ data, loading }: LeasePipelinePanelProps) => {
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-openkey-blue" />
            Lease Pipeline & Expirations
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openkey-blue"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  if (!data) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-openkey-blue" />
            Lease Pipeline & Expirations
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8 text-muted-foreground">
            No lease pipeline data available
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-openkey-blue" />
            Lease Pipeline & Expirations
          </CardEnhancedTitle>
          <div className="text-sm text-muted-foreground">Stop "ghost" units before they go dark</div>
        </div>
      </CardEnhancedHeader>
      
      <CardEnhancedContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 30 Days */}
          <EnhancedMetricCard
            title="Expiring in 30 Days"
            value={data.expiring_30_days}
            icon={AlertTriangle}
            iconColor={data.expiring_30_days > 0 ? "text-destructive" : "text-success"}
            subtitle={data.expiring_30_days > 0 ? 'Needs immediate attention' : 'All good'}
            percentage={data.expiring_30_days > 0 ? -data.expiring_30_days : 0}
            isPositive={data.expiring_30_days === 0}
            showAsSuccess={data.expiring_30_days === 0}
          />

          {/* 60 Days */}
          <EnhancedMetricCard
            title="Expiring in 60 Days"
            value={data.expiring_60_days}
            icon={AlertCircle}
            iconColor={data.expiring_60_days > 0 ? "text-warning" : "text-success"}
            subtitle="Start renewal conversations"
            percentage={data.expiring_60_days > 0 ? -data.expiring_60_days : 0}
            isPositive={data.expiring_60_days === 0}
          />

          {/* 90 Days */}
          <EnhancedMetricCard
            title="Expiring in 90 Days"
            value={data.expiring_90_days}
            icon={Calendar}
            iconColor="text-info"
            subtitle="Plan ahead"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Renewal Rate */}
          <EnhancedMetricCard
            title="Renewal Rate"
            value={`${data.renewal_rate.toFixed(1)}%`}
            icon={RefreshCw}
            iconColor={data.renewal_rate >= 70 ? "text-success" : data.renewal_rate >= 50 ? "text-warning" : "text-destructive"}
            subtitle="of tenants choose to stay"
            percentage={data.renewal_rate >= 70 ? data.renewal_rate - 70 : -(70 - data.renewal_rate)}
            isPositive={data.renewal_rate >= 70}
            showAsSuccess={data.renewal_rate >= 70}
          />

          {/* Days to Lease */}
          <EnhancedMetricCard
            title="Avg. Days to Lease"
            value={Math.round(data.avg_days_to_lease)}
            icon={Clock}
            iconColor={data.avg_days_to_lease <= 30 ? "text-success" : data.avg_days_to_lease <= 60 ? "text-warning" : "text-destructive"}
            subtitle="days from vacant to occupied"
            percentage={data.avg_days_to_lease <= 30 ? -(30 - data.avg_days_to_lease) : (data.avg_days_to_lease - 30)}
            isPositive={data.avg_days_to_lease <= 30}
            showAsSuccess={data.avg_days_to_lease <= 30}
          />
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default LeasePipelinePanel;