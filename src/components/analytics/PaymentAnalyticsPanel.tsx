import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, TrendingUp, AlertTriangle, ExternalLink, Building2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EnhancedMetricCard from '@/components/EnhancedMetricCard';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface PaymentAnalyticsData {
  hapTotalExpected: number;
  hapTotalReceived: number;
  hapCurrentMonthExpected: number;
  hapCurrentMonthReceived: number;
  hapLatePayments: number;
  hapMissedPayments: number;
  hapCollectionRate: number;
  propertiesWithVouchers: number;
  tenantTotalExpected: number;
  tenantTotalReceived: number;
  tenantCurrentMonthExpected: number;
  tenantCurrentMonthReceived: number;
  tenantLatePayments: number;
  tenantMissedPayments: number;
  tenantCollectionRate: number;
  totalExpected: number;
  totalReceived: number;
  currentMonthExpected: number;
  currentMonthReceived: number;
  overallCollectionRate: number;
  totalLatePayments: number;
  totalMissedPayments: number;
  totalProperties: number;
}

interface PaymentAnalyticsPanelProps {
  data: PaymentAnalyticsData | null;
  loading: boolean;
  landlordId: string;
}

const PaymentAnalyticsPanel = ({ data, loading, landlordId }: PaymentAnalyticsPanelProps) => {
  const navigate = useNavigate();

  const handleViewFullDashboard = () => {
    navigate('/payment-analytics');
  };

  if (loading) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-openkey-blue" />
            Payment Analytics
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

  if (!data || data.totalProperties === 0) {
    return (
      <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
        <CardEnhancedHeader>
          <CardEnhancedTitle gradient className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-openkey-blue" />
            Payment Analytics
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No payment data available</p>
            <Button 
              variant="outline" 
              onClick={handleViewFullDashboard}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
            >
              <ExternalLink className="w-4 h-4" />
              Set Up Payment Tracking
            </Button>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" className="card-hover-gold animate-fade-in-up">
      <CardEnhancedHeader className="flex flex-row items-center justify-between space-y-0">
        <CardEnhancedTitle gradient className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-openkey-blue" />
          Payment Analytics
        </CardEnhancedTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewFullDashboard}
          className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Dashboard
        </Button>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        {/* Combined Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <EnhancedMetricCard
            title="Expected Monthly Rent"
            value={`${formatCurrency(data.totalReceived)} / ${formatCurrency(data.totalExpected)}`}
            icon={DollarSign}
            iconColor="text-openkey-blue"
            subtitle={`${formatPercentage(data.overallCollectionRate)} collection rate`}
            percentage={data.overallCollectionRate > 90 ? data.overallCollectionRate - 90 : -(90 - data.overallCollectionRate)}
            isPositive={data.overallCollectionRate > 90}
            showAsSuccess={data.overallCollectionRate > 90}
          />

          <EnhancedMetricCard
            title="Total Properties"
            value={data.totalProperties}
            icon={Building2}
            iconColor="text-openkey-gold"
            subtitle={`${data.propertiesWithVouchers} with vouchers`}
          />

          <EnhancedMetricCard
            title="Payment Issues"
            value={data.totalLatePayments + data.totalMissedPayments}
            icon={AlertTriangle}
            iconColor={data.totalLatePayments + data.totalMissedPayments > 5 ? "text-destructive" : data.totalLatePayments + data.totalMissedPayments > 0 ? "text-warning" : "text-success"}
            subtitle={`${data.totalLatePayments} late, ${data.totalMissedPayments} missed`}
            percentage={data.totalLatePayments + data.totalMissedPayments > 0 ? -(data.totalLatePayments + data.totalMissedPayments) : 0}
            isPositive={data.totalLatePayments + data.totalMissedPayments === 0}
            showAsSuccess={data.totalLatePayments + data.totalMissedPayments === 0}
          />
        </div>

        {/* Overall Collection Progress */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Overall Collection Performance</span>
            <Badge 
              variant={data.overallCollectionRate > 90 ? "success" : data.overallCollectionRate > 70 ? "warning" : "destructive"}
              className="flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              {formatPercentage(data.overallCollectionRate)}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                data.overallCollectionRate > 90 ? 'bg-success' : 
                data.overallCollectionRate > 70 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${Math.min(data.overallCollectionRate, 100)}%` }}
            />
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default PaymentAnalyticsPanel;