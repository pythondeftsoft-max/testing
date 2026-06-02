import React from 'react';
import { DollarSign } from 'lucide-react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import PaymentAnalyticsPanel from '../PaymentAnalyticsPanel';
import RevenueBreakdownPro from '../RevenueBreakdownPro';
import { usePaymentAnalytics } from '@/hooks/usePaymentAnalytics';

interface RevenuePaymentAnalyticsProps {
  landlordId: string;
  portfolioId?: string;
  isFavorited?: (widgetId: string) => boolean;
  onToggleFavorite?: (widgetId: string, widgetData?: any) => void;
}

export const RevenuePaymentAnalytics: React.FC<RevenuePaymentAnalyticsProps> = ({
  landlordId,
  portfolioId,
  isFavorited,
  onToggleFavorite
}) => {
  const {
    data: paymentData,
    loading: paymentLoading,
    error: paymentError
  } = usePaymentAnalytics(landlordId);

  return (
    <div className="space-y-6">
      {/* Payment Analytics */}
      <div>
        <PaymentAnalyticsPanel 
          data={paymentData}
          loading={paymentLoading}
          landlordId={landlordId}
        />
      </div>

      {/* Revenue Breakdown */}
      <CardEnhanced variant="command" className="command-card">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2 text-openkey-blue">
            <DollarSign className="h-5 w-5" />
            Revenue Breakdown
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <RevenueBreakdownPro 
            landlordId={landlordId} 
            portfolioId={portfolioId}
          />
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};